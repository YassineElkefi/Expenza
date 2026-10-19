
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getAuthenticatedUser } from "@/lib/auth-server";
import { getDb } from "@/lib/mongodb";

const transactionTypes = new Set(["income", "expense"]);

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
    accountId,
    transactionType,
    amountMillimes,
    category,
    description,
    transactionDate,
  } = body as Record<string, unknown>;

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
    !/^\d{4}-\d{2}-\d{2}$/.test(transactionDate)
  ) {
    return NextResponse.json(
      { error: "Enter valid transaction details." },
      { status: 400 }
    );
  }

  // Strictly validate the calendar date, including invalid dates such as February 30.
  const parsedDate = new Date(`${transactionDate}T00:00:00.000Z`);

  if (
    Number.isNaN(parsedDate.getTime()) ||
    parsedDate.toISOString().slice(0, 10) !== transactionDate
  ) {
    return NextResponse.json(
      { error: "Enter a valid transaction date." },
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

    const result = await db.collection("transactions").insertOne({
      userId: user.id,
      accountId,
      transactionType,
      amountMillimes,
      category: category.trim(),
      description: description.trim(),
      // ISO date string preserves the calendar date without timezone shifts.
      transactionDate,
      createdAt: new Date(),
    });

    return NextResponse.json(
      { ok: true, id: result.insertedId.toString() },
      { status: 201 }
    );
  } catch (error) {
    console.error("Transaction creation failed:", error);

    return NextResponse.json(
      { error: "Could not save the transaction. Please try again." },
      { status: 500 }
    );
  }
}
