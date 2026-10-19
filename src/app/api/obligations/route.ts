
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

    // Split the total into integer millimes without losing any amount.
    const baseAmount = Math.floor(
      totalAmountMillimes / installmentCount
    );
    const remainder = totalAmountMillimes % installmentCount;

    const payments = Array.from(
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

    const obligations = db.collection("obligations");
    const obligationPayments = db.collection("obligationPayments");

    const obligationResult = await obligations.insertOne({
      userId: user.id,
      name: name.trim(),
      obligationType: "installment",
      amountMillimes: payments[0].amountMillimes,
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
        payments.map((payment) => ({
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
        paymentsCreated: payments.length,
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
