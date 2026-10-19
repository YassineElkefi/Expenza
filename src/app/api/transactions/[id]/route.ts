
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getAuthenticatedUser } from "@/lib/auth-server";
import { getDb } from "@/lib/mongodb";

const transactionTypes = new Set(["income", "expense"]);

type RouteContext = {
  params: Promise<{ id: string }>;
};

function isValidDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

  const date = new Date(`${value}T00:00:00.000Z`);

  return (
    !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export async function PATCH(request: Request, context: RouteContext) {
  const user = await getAuthenticatedUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

  if (!ObjectId.isValid(id)) {
    return NextResponse.json(
      { error: "Invalid transaction ID." },
      { status: 400 }
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

  if (!isRecord(body)) {
    return NextResponse.json(
      { error: "Invalid request body." },
      { status: 400 }
    );
  }

  const {
    accountId,
    transactionType,
    amountMillimes,
    category,
    description,
    transactionDate,
  } = body;

  if (
    typeof accountId !== "string" ||
    !ObjectId.isValid(accountId) ||
    typeof transactionType !== "string" ||
    !transactionTypes.has(transactionType) ||
    typeof amountMillimes !== "number" ||
    !Number.isSafeInteger(amountMillimes) ||
    amountMillimes <= 0 ||
    typeof category !== "string" ||
    !category.trim() ||
    category.trim().length > 50 ||
    typeof description !== "string" ||
    description.length > 500 ||
    typeof transactionDate !== "string" ||
    !isValidDate(transactionDate)
  ) {
    return NextResponse.json(
      { error: "Enter valid transaction details." },
      { status: 400 }
    );
  }

  try {
    const db = await getDb();

    // The destination account must belong to this user.
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

    // Include userId in the filter to prevent editing another user's data.
    const result = await db.collection("transactions").updateOne(
      {
        _id: new ObjectId(id),
        userId: user.id,
      },
      {
        $set: {
          accountId,
          transactionType,
          amountMillimes,
          category: category.trim(),
          description: description.trim(),
          transactionDate,
          updatedAt: new Date(),
        },
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: "Transaction not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Transaction update failed:", error);

    return NextResponse.json(
      { error: "Could not update the transaction. Please try again." },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const user = await getAuthenticatedUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

  if (!ObjectId.isValid(id)) {
    return NextResponse.json(
      { error: "Invalid transaction ID." },
      { status: 400 }
    );
  }

  try {
    const db = await getDb();

    const result = await db.collection("transactions").deleteOne({
      _id: new ObjectId(id),
      userId: user.id,
    });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: "Transaction not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Transaction deletion failed:", error);

    return NextResponse.json(
      { error: "Could not delete the transaction. Please try again." },
      { status: 500 }
    );
  }
}
