
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getAuthenticatedUser } from "@/lib/auth-server";
import { getDb } from "@/lib/mongodb";

function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  return (
    !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value
  );
}

// Add months while keeping the day within the target month's length.
function addMonths(dateString: string, months: number): string {
  const [year, month, day] = dateString.split("-").map(Number);

  const targetMonth = month - 1 + months;
  const targetYear = year + Math.floor(targetMonth / 12);
  const normalizedMonth = ((targetMonth % 12) + 12) % 12;

  const lastDay = new Date(
    Date.UTC(targetYear, normalizedMonth + 1, 0)
  ).getUTCDate();

  const targetDay = Math.min(day, lastDay);

  return [
    targetYear,
    String(normalizedMonth + 1).padStart(2, "0"),
    String(targetDay).padStart(2, "0"),
  ].join("-");
}

export async function GET() {
  const user = await getAuthenticatedUser();

  if (!user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const db = await getDb();

    const purchases = await db
      .collection("obligations")
      .find({
        userId: user.id,
        obligationType: "installment",
      })
      .sort({ createdAt: -1 })
      .toArray();

    const purchaseIds = purchases.map((purchase) =>
      purchase._id.toString()
    );

    const payments = purchaseIds.length
      ? await db
          .collection("obligationPayments")
          .find({
            userId: user.id,
            obligationId: { $in: purchaseIds },
          })
          .sort({ number: 1 })
          .toArray()
      : [];

    return NextResponse.json({
      purchases: purchases.map((purchase) => ({
        id: purchase._id.toString(),
        name: purchase.name,
        accountId: purchase.accountId,
        totalAmountMillimes: purchase.totalAmountMillimes,
        installmentCount: purchase.installmentCount,
        active: purchase.active,
        createdAt: purchase.createdAt,
      })),
      payments: payments.map((payment) => ({
        id: payment._id.toString(),
        obligationId: payment.obligationId,
        number: payment.number,
        amountMillimes: payment.amountMillimes,
        dueDate: payment.dueDate,
        status: payment.status,
        paidAt: payment.paidAt,
      })),
    });
  } catch (error) {
    console.error("Loading installment purchases failed:", error);

    return NextResponse.json(
      { error: "Could not load installment purchases." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const user = await getAuthenticatedUser();

  if (!user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body." },
      { status: 400 }
    );
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json(
      { error: "Invalid request body." },
      { status: 400 }
    );
  }

  const {
    name,
    accountId,
    totalAmountMillimes,
    installmentCount,
    firstDueDate,
    payments: customPayments,
  } = body as Record<string, unknown>;

  if (
    typeof name !== "string" ||
    !name.trim() ||
    name.trim().length > 100 ||
    typeof accountId !== "string" ||
    !ObjectId.isValid(accountId) ||
    typeof totalAmountMillimes !== "number" ||
    !Number.isSafeInteger(totalAmountMillimes) ||
    totalAmountMillimes <= 0 ||
    typeof installmentCount !== "number" ||
    !Number.isInteger(installmentCount) ||
    installmentCount < 2 ||
    installmentCount > 120 ||
    typeof firstDueDate !== "string" ||
    !isValidDate(firstDueDate)
  ) {
    return NextResponse.json(
      { error: "Enter valid installment purchase details." },
      { status: 400 }
    );
  }

  try {
    const db = await getDb();

    const account = await db.collection("accounts").findOne({
      _id: new ObjectId(accountId),
      userId: user.id,
    });

    if (!account) {
      return NextResponse.json(
        { error: "Account not found." },
        { status: 404 }
      );
    }

    
    type PaymentInput = {
      amountMillimes: number;
      dueDate: string;
    };

    let paymentSchedule: Array<{
      number: number;
      amountMillimes: number;
      dueDate: string;
      status: string;
      paidAt: null;
      transactionId: null;
    }>;

    if (Array.isArray(customPayments)) {
      if (
        customPayments.length !== installmentCount ||
        !customPayments.every(
          (item): item is PaymentInput =>
            typeof item === "object" &&
            item !== null &&
            typeof item.amountMillimes === "number" &&
            Number.isSafeInteger(item.amountMillimes) &&
            item.amountMillimes > 0 &&
            typeof item.dueDate === "string" &&
            isValidDate(item.dueDate)
        )
      ) {
        return NextResponse.json(
          { error: "Enter a valid amount and due date for every installment." },
          { status: 400 }
        );
      }

      const customTotal = customPayments.reduce(
        (sum, payment) => sum + payment.amountMillimes,
        0
      );

      if (
        !Number.isSafeInteger(customTotal) ||
        customTotal !== totalAmountMillimes
      ) {
        return NextResponse.json(
          { error: "The installment amounts must add up to the total purchase price." },
          { status: 400 }
        );
      }

      paymentSchedule = customPayments.map((payment, index) => ({
        number: index + 1,
        amountMillimes: payment.amountMillimes,
        dueDate: payment.dueDate,
        status: "unpaid",
        paidAt: null,
        transactionId: null,
      }));
    } else {
      // Backward-compatible equal split for older clients.
      const baseAmount = Math.floor(
        totalAmountMillimes / installmentCount
      );
      const remainder = totalAmountMillimes % installmentCount;

      paymentSchedule = Array.from(
        { length: installmentCount },
        (_, index) => ({
          number: index + 1,
          amountMillimes: baseAmount + (index < remainder ? 1 : 0),
          dueDate: addMonths(firstDueDate, index),
          status: "unpaid",
          paidAt: null,
          transactionId: null,
        })
      );
    }


    const obligations = db.collection("obligations");
    const obligationPayments = db.collection("obligationPayments");

    const obligationResult = await obligations.insertOne({
      userId: user.id,
      name: name.trim(),
      obligationType: "installment",
      amountMillimes: paymentSchedule[0].amountMillimes,
      totalAmountMillimes,
      installmentCount,
      accountId,
      firstDueDate,
      nextDueDate: firstDueDate,
      active: true,
      createdAt: new Date(),
    });

    const obligationId = obligationResult.insertedId.toString();

    try {
      await obligationPayments.insertMany(
        paymentSchedule.map((payment) => ({
          userId: user.id,
          obligationId,
          ...payment,
          createdAt: new Date(),
        }))
      );
    } catch (error) {
      // Avoid leaving an incomplete purchase if payment creation fails.
      await Promise.all([
        obligations.deleteOne({
          _id: obligationResult.insertedId,
          userId: user.id,
        }),
        obligationPayments.deleteMany({
          userId: user.id,
          obligationId,
        }),
      ]);

      throw error;
    }

    return NextResponse.json(
      {
        ok: true,
        id: obligationId,
        paymentsCreated: paymentSchedule.length,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Installment purchase creation failed:", error);

    return NextResponse.json(
      { error: "Could not save the installment purchase." },
      { status: 500 }
    );
  }
}
