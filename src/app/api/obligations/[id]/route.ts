
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getAuthenticatedUser } from "@/lib/auth-server";
import { getDb } from "@/lib/mongodb";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

  const date = new Date(`${value}T00:00:00.000Z`);

  return (
    !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value
  );
}

export async function PATCH(
  request: Request,
  { params }: RouteContext
) {
  const user = await getAuthenticatedUser();

  if (!user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const { id } = await params;

  if (!ObjectId.isValid(id)) {
    return NextResponse.json(
      { error: "Invalid purchase ID." },
      { status: 400 }
    );
  }

  let body: Record<string, unknown>;

  try {
    const parsed: unknown = await request.json();

    if (!parsed || typeof parsed !== "object") {
      throw new Error("Invalid body");
    }

    body = parsed as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { error: "Invalid request body." },
      { status: 400 }
    );
  }

  const { name, accountId, totalAmountMillimes, payments } = body;

  if (
    typeof name !== "string" ||
    !name.trim() ||
    name.trim().length > 100 ||
    typeof accountId !== "string" ||
    !ObjectId.isValid(accountId) ||
    typeof totalAmountMillimes !== "number" ||
    !Number.isSafeInteger(totalAmountMillimes) ||
    totalAmountMillimes <= 0 ||
    !Array.isArray(payments) ||
    payments.length < 2 ||
    payments.length > 120
  ) {
    return NextResponse.json(
      { error: "Enter valid purchase details." },
      { status: 400 }
    );
  }

  const db = await getDb();
  const obligations = db.collection("obligations");
  const paymentCollection = db.collection("obligationPayments");

  const purchase = await obligations.findOne({
    _id: new ObjectId(id),
    userId: user.id,
    obligationType: "installment",
  });

  if (!purchase) {
    return NextResponse.json(
      { error: "Installment purchase not found." },
      { status: 404 }
    );
  }

  const existingPayments = await paymentCollection
    .find({ userId: user.id, obligationId: id })
    .sort({ number: 1 })
    .toArray();

  if (existingPayments.some((payment) => payment.status === "processing")) {
    return NextResponse.json(
      { error: "A payment is being processed. Please try again later." },
      { status: 409 }
    );
  }

  if (payments.length !== existingPayments.length) {
    return NextResponse.json(
      { error: "The number of installments cannot be changed while editing." },
      { status: 400 }
    );
  }

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

  const hasPaidPayments = existingPayments.some(
    (payment) => payment.status === "paid"
  );

  if (hasPaidPayments && accountId !== purchase.accountId) {
    return NextResponse.json(
      { error: "The account cannot be changed after a payment has been recorded." },
      { status: 409 }
    );
  }

  const parsedPayments: Array<{
    id: string;
    amountMillimes: number;
    dueDate: string;
  }> = [];

  for (const item of payments) {
    if (
      !item ||
      typeof item !== "object" ||
      typeof item.id !== "string" ||
      !ObjectId.isValid(item.id) ||
      typeof item.amountMillimes !== "number" ||
      !Number.isSafeInteger(item.amountMillimes) ||
      item.amountMillimes <= 0 ||
      typeof item.dueDate !== "string" ||
      !isValidDate(item.dueDate)
    ) {
      return NextResponse.json(
        { error: "Enter a valid amount and due date for every installment." },
        { status: 400 }
      );
    }

    parsedPayments.push({
      id: item.id,
      amountMillimes: item.amountMillimes,
      dueDate: item.dueDate,
    });
  }

  const submittedIds = parsedPayments.map((payment) => payment.id);
  const existingIds = existingPayments.map((payment) =>
    payment._id.toString()
  );

  if (
    new Set(submittedIds).size !== submittedIds.length ||
    submittedIds.some((paymentId) => !existingIds.includes(paymentId))
  ) {
    return NextResponse.json(
      { error: "The submitted installments do not match this purchase." },
      { status: 400 }
    );
  }

  const total = parsedPayments.reduce(
    (sum, payment) => sum + payment.amountMillimes,
    0
  );

  if (
    !Number.isSafeInteger(total) ||
    total !== totalAmountMillimes
  ) {
    return NextResponse.json(
      { error: "The installment amounts must add up to the total purchase price." },
      { status: 400 }
    );
  }

  for (const payment of existingPayments) {
    const submitted = parsedPayments.find(
      (item) => item.id === payment._id.toString()
    );

    if (
      payment.status === "paid" &&
      submitted &&
      (submitted.amountMillimes !== payment.amountMillimes ||
        submitted.dueDate !== payment.dueDate)
    ) {
      return NextResponse.json(
        { error: "Paid installments cannot be changed." },
        { status: 409 }
      );
    }

    if (payment.status !== "paid" && payment.status !== "unpaid") {
      return NextResponse.json(
        { error: "An installment has an unexpected status." },
        { status: 409 }
      );
    }
  }

  try {
    for (const payment of existingPayments) {
      if (payment.status !== "unpaid") continue;

      const submitted = parsedPayments.find(
        (item) => item.id === payment._id.toString()
      )!;

      const update = await paymentCollection.updateOne(
        {
          _id: payment._id,
          userId: user.id,
          obligationId: id,
          status: "unpaid",
        },
        {
          $set: {
            amountMillimes: submitted.amountMillimes,
            dueDate: submitted.dueDate,
          },
        }
      );

      if (update.modifiedCount !== 1 && update.matchedCount !== 1) {
        throw new Error("An installment changed while the purchase was being edited.");
      }
    }

    const updatedPayments = await paymentCollection
      .find({ userId: user.id, obligationId: id })
      .sort({ number: 1 })
      .toArray();

    const nextPayment = updatedPayments.find(
      (payment) => payment.status === "unpaid"
    );

    await obligations.updateOne(
      {
        _id: new ObjectId(id),
        userId: user.id,
        obligationType: "installment",
      },
      {
        $set: {
          name: name.trim(),
          accountId,
          totalAmountMillimes,
          installmentCount: updatedPayments.length,
          firstDueDate: updatedPayments[0].dueDate,
          amountMillimes: nextPayment?.amountMillimes ?? 0,
          nextDueDate: nextPayment?.dueDate ?? null,
          active: Boolean(nextPayment),
        },
      }
    );

    return NextResponse.json({
      ok: true,
      message: "Installment purchase updated.",
    });
  } catch (error) {
    console.error("Updating installment purchase failed:", error);

    return NextResponse.json(
      { error: "Could not update the installment purchase. Please reload and check its schedule." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: RouteContext
) {
  const user = await getAuthenticatedUser();

  if (!user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const { id } = await params;

  if (!ObjectId.isValid(id)) {
    return NextResponse.json(
      { error: "Invalid purchase ID." },
      { status: 400 }
    );
  }

  const db = await getDb();
  const obligations = db.collection("obligations");
  const paymentCollection = db.collection("obligationPayments");

  const purchase = await obligations.findOne({
    _id: new ObjectId(id),
    userId: user.id,
    obligationType: "installment",
  });

  if (!purchase) {
    return NextResponse.json(
      { error: "Installment purchase not found." },
      { status: 404 }
    );
  }

  const existingPayments = await paymentCollection
    .find({ userId: user.id, obligationId: id })
    .toArray();

  if (
    existingPayments.some(
      (payment) =>
        payment.status === "paid" || payment.status === "processing"
    )
  ) {
    return NextResponse.json(
      { error: "This purchase has a paid or processing installment and cannot be deleted. Its financial history must be preserved." },
      { status: 409 }
    );
  }

  await paymentCollection.deleteMany({
    userId: user.id,
    obligationId: id,
    status: "unpaid",
  });

  await obligations.deleteOne({
    _id: new ObjectId(id),
    userId: user.id,
    obligationType: "installment",
  });

  return NextResponse.json({
    ok: true,
    message: "Installment purchase deleted.",
  });
}
