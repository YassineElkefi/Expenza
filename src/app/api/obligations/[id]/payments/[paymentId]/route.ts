
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getAuthenticatedUser } from "@/lib/auth-server";
import { getDb } from "@/lib/mongodb";

type RouteContext = {
  params: Promise<{
    id: string;
    paymentId: string;
  }>;
};

function getTunisDate(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Tunis",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value])
  );

  return `${values.year}-${values.month}-${values.day}`;
}

export async function PATCH(
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

  const { id, paymentId } = await params;

  if (!ObjectId.isValid(id) || !ObjectId.isValid(paymentId)) {
    return NextResponse.json(
      { error: "Invalid obligation or payment ID." },
      { status: 400 }
    );
  }

  const db = await getDb();
  const obligations = db.collection("obligations");
  const payments = db.collection("obligationPayments");
  const transactions = db.collection("transactions");

  const obligation = await obligations.findOne({
    _id: new ObjectId(id),
    userId: user.id,
    obligationType: "installment",
  });

  if (!obligation) {
    return NextResponse.json(
      { error: "Installment purchase not found." },
      { status: 404 }
    );
  }

  const payment = await payments.findOne({
    _id: new ObjectId(paymentId),
    userId: user.id,
    obligationId: id,
  });

  if (!payment) {
    return NextResponse.json(
      { error: "Installment payment not found." },
      { status: 404 }
    );
  }

  if (payment.status === "paid") {
    return NextResponse.json(
      { error: "This installment has already been paid." },
      { status: 409 }
    );
  }

  if (payment.status !== "unpaid") {
    return NextResponse.json(
      { error: "This installment is currently being processed. Please try again shortly." },
      { status: 409 }
    );
  }

  // Claim this payment so concurrent requests cannot charge it twice.
  const claim = await payments.updateOne(
    {
      _id: payment._id,
      userId: user.id,
      obligationId: id,
      status: "unpaid",
    },
    {
      $set: {
        status: "processing",
        processingStartedAt: new Date(),
      },
    }
  );

  if (claim.modifiedCount !== 1) {
    return NextResponse.json(
      { error: "This installment was already processed or is being processed." },
      { status: 409 }
    );
  }

  let transactionId: ObjectId | null = null;

  try {
    const accountId = obligation.accountId;

    if (
      typeof accountId !== "string" ||
      !ObjectId.isValid(accountId)
    ) {
      throw new Error("The installment purchase has an invalid account.");
    }

    const account = await db.collection("accounts").findOne({
      _id: new ObjectId(accountId),
      userId: user.id,
    });

    if (!account) {
      throw new Error("The linked account could not be found.");
    }

    const transactionDate = getTunisDate();
    const paidAt = new Date();

    const transaction = await transactions.insertOne({
      userId: user.id,
      accountId,
      transactionType: "expense",
      amountMillimes: payment.amountMillimes,
      category: "Installment payment",
      description: `${obligation.name} — installment ${payment.number} of ${obligation.installmentCount}`,
      transactionDate,
      createdAt: paidAt,
      obligationId: id,
      obligationPaymentId: payment._id.toString(),
    });

    transactionId = transaction.insertedId;

    const paymentUpdate = await payments.updateOne(
      {
        _id: payment._id,
        userId: user.id,
        obligationId: id,
        status: "processing",
      },
      {
        $set: {
          status: "paid",
          paidAt,
          transactionId: transactionId.toString(),
        },
        $unset: {
          processingStartedAt: "",
        },
      }
    );

    if (paymentUpdate.modifiedCount !== 1) {
      throw new Error("Could not finalize the installment payment.");
    }

    const nextPayment = await payments.findOne(
      {
        userId: user.id,
        obligationId: id,
        status: "unpaid",
      },
      { sort: { dueDate: 1, number: 1 } }
    );

    if (nextPayment) {
      await obligations.updateOne(
        { _id: obligation._id, userId: user.id },
        {
          $set: {
            nextDueDate: nextPayment.dueDate,
            amountMillimes: nextPayment.amountMillimes,
            active: true,
          },
        }
      );
    } else {
      await obligations.updateOne(
        { _id: obligation._id, userId: user.id },
        {
          $set: {
            active: false,
          },
        }
      );
    }

    return NextResponse.json({
      ok: true,
      message: "Installment marked as paid.",
      transactionId: transactionId.toString(),
      nextDueDate: nextPayment?.dueDate ?? null,
      completed: !nextPayment,
    });
  } catch (error) {
    console.error("Marking installment as paid failed:", error);

    // If the expense was created but finalizing the payment failed,
    // remove that expense to avoid leaving a duplicate charge.
    if (transactionId) {
      await transactions.deleteOne({
        _id: transactionId,
        userId: user.id,
      }).catch((rollbackError) => {
        console.error("Transaction rollback failed:", rollbackError);
      });
    }

    await payments.updateOne(
      {
        _id: payment._id,
        userId: user.id,
        obligationId: id,
        status: "processing",
      },
      {
        $set: { status: "unpaid" },
        $unset: { processingStartedAt: "" },
      }
    ).catch((rollbackError) => {
      console.error("Payment rollback failed:", rollbackError);
    });

    return NextResponse.json(
      { error: "Could not mark this installment as paid. Please check the payment status before retrying." },
      { status: 500 }
    );
  }
}
