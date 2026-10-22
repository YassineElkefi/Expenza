import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getAuthenticatedUser } from "@/lib/auth-server";
import { getDb } from "@/lib/mongodb";

function isValidDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export async function POST(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { fromAccountId, toAccountId, amountMillimes, transactionDate, description } =
    body as Record<string, unknown>;

  if (
    typeof fromAccountId !== "string" || !ObjectId.isValid(fromAccountId) ||
    typeof toAccountId !== "string" || !ObjectId.isValid(toAccountId) ||
    fromAccountId === toAccountId ||
    typeof amountMillimes !== "number" || !Number.isSafeInteger(amountMillimes) || amountMillimes <= 0 ||
    typeof transactionDate !== "string" || !isValidDate(transactionDate)
  ) {
    return NextResponse.json({ error: "Enter valid transfer details." }, { status: 400 });
  }

  const note = typeof description === "string" ? description.trim().slice(0, 500) : "";

  try {
    const db = await getDb();

    // Verify both accounts belong to this user
    const [fromAccount, toAccount] = await Promise.all([
      db.collection("accounts").findOne({ _id: new ObjectId(fromAccountId), userId: user.id }),
      db.collection("accounts").findOne({ _id: new ObjectId(toAccountId), userId: user.id }),
    ]);

    if (!fromAccount) return NextResponse.json({ error: "Source account not found." }, { status: 404 });
    if (!toAccount) return NextResponse.json({ error: "Destination account not found." }, { status: 404 });

    const transferId = new ObjectId().toString();
    const now = new Date();

    await db.collection("transactions").insertMany([
      {
        userId: user.id,
        accountId: fromAccountId,
        transactionType: "transfer_out",
        amountMillimes,
        category: "Transfer",
        description: note || `Transfer to ${toAccount.name}`,
        transactionDate,
        transferId,
        createdAt: now,
      },
      {
        userId: user.id,
        accountId: toAccountId,
        transactionType: "transfer_in",
        amountMillimes,
        category: "Transfer",
        description: note || `Transfer from ${fromAccount.name}`,
        transactionDate,
        transferId,
        createdAt: now,
      },
    ]);

    return NextResponse.json({ ok: true, transferId }, { status: 201 });
  } catch (error) {
    console.error("Transfer failed:", error);
    return NextResponse.json({ error: "Could not complete the transfer. Please try again." }, { status: 500 });
  }
}