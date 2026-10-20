
import { NextResponse } from "next/server";
import { ObjectId, type Document, type Filter } from "mongodb";
import { getAuthenticatedUser } from "@/lib/auth-server";
import { getDb } from "@/lib/mongodb";

type TransactionDocument = {
  _id: ObjectId;
  userId: string;
  accountId: string;
  transactionType: "income" | "expense" | string;
  amountMillimes: number;
  category: string;
  description?: string;
  transactionDate: Date | string;
  createdAt?: Date;
};

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

function nextDate(value: string): string {
  const date = new Date(`${value}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

function toDateString(value: Date | string): string {
  if (typeof value === "string") {
    return value.slice(0, 10);
  }

  return value.toISOString().slice(0, 10);
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function GET(request: Request) {
  try {
    const user = await getAuthenticatedUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);

    const rawPage = searchParams.get("page");
    const rawLimit = searchParams.get("limit");

    const page = rawPage === null ? 1 : Number(rawPage);
    const limit = rawLimit === null ? 20 : Number(rawLimit);

    if (
      !Number.isSafeInteger(page) ||
      page < 1 ||
      !Number.isSafeInteger(limit) ||
      limit < 1 ||
      limit > 100
    ) {
      return NextResponse.json(
        { error: "Page must be positive and limit must be between 1 and 100." },
        { status: 400 }
      );
    }

    const type = searchParams.get("type");
    const rawAccountIds = searchParams.get("accountIds");
    const accountIds = rawAccountIds
      ? rawAccountIds.split(",").filter(id => /^[a-f\d]{24}$/i.test(id))
      : [];
    const rawCategory = searchParams.get("category");
    const from = searchParams.get("from");
    const to = searchParams.get("to");

   const VALID_TYPES = ["income", "expense", "transfer_in", "transfer_out"];

    if (type !== null && !VALID_TYPES.includes(type)) {
      return NextResponse.json(
        { error: "Type must be income, expense, transfer_in, or transfer_out." },
        { status: 400 }
      );
    }

    if (
      accountIds.length > 0 &&
      !accountIds.every(id => /^[a-f\d]{24}$/i.test(id))
    ) {
      return NextResponse.json(
        { error: "Invalid account ID." },
        { status: 400 }
      );
    }

    const category = rawCategory?.trim();

    if (
      rawCategory !== null &&
      (!category || category.length > 50)
    ) {
      return NextResponse.json(
        { error: "Category must contain between 1 and 50 characters." },
        { status: 400 }
      );
    }

    if (
      (from !== null && !isValidDate(from)) ||
      (to !== null && !isValidDate(to))
    ) {
      return NextResponse.json(
        { error: "Enter valid dates in YYYY-MM-DD format." },
        { status: 400 }
      );
    }

    if (from && to && from > to) {
      return NextResponse.json(
        { error: "The start date cannot be after the end date." },
        { status: 400 }
      );
    }

    const db = await getDb();

    // If an account filter is supplied, verify that it belongs
    // to the authenticated user before querying transactions.
    if (accountIds.length > 0) {
      const account = await db.collection("accounts").findOne({
        _id: { $in: accountIds.map(id => new ObjectId(id)) },
        userId: user.id,
      });

      if (!account) {
        return NextResponse.json(
          { error: "Account not found." },
          { status: 404 }
        );
      }
    }

    const filter: Filter<Document> = {
      userId: user.id,
    };

    if (type) {
      filter.transactionType = type;
    }

    if (accountIds.length > 0) {
      const found = await db.collection("accounts").countDocuments({
        _id: { $in: accountIds.map(id => new ObjectId(id)) },
        userId: user.id,
      });
      if (found !== accountIds.length) {
        return NextResponse.json({ error: "One or more accounts not found." }, { status: 404 });
      }
      filter.accountId = { $in: accountIds };
    }

    if (category) {
      filter.category = {
        $regex: `^${escapeRegex(category)}$`,
        $options: "i",
      };
    }

    if (from || to) {
      const dateFilter: Record<string, string> = {};

      if (from) {
        dateFilter.$gte = from;
      }

      if (to) {
        // Use an exclusive upper bound so the end date is included.
        dateFilter.$lt = nextDate(to);
      }

      filter.transactionDate = dateFilter;
    }

    const transactionsCollection =
      db.collection<TransactionDocument>("transactions");

    const skip = (page - 1) * limit;

    if (!Number.isSafeInteger(skip)) {
      return NextResponse.json(
        { error: "Page number is too large." },
        { status: 400 }
      );
    }

    const [transactions, total] = await Promise.all([
      transactionsCollection
        .find(filter)
        .sort({ transactionDate: -1, _id: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),

      transactionsCollection.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      transactions: transactions.map((transaction) => ({
        id: transaction._id.toString(),
        account_id: transaction.accountId,
        transaction_type: transaction.transactionType,
        amount_millimes: transaction.amountMillimes,
        category: transaction.category,
        description: transaction.description ?? "",
        transaction_date: toDateString(transaction.transactionDate),
      })),

      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1 && total > 0,
      },
    });
  } catch (error) {
    console.error("Transaction history API error:", error);

    return NextResponse.json(
      { error: "Unable to load transaction history." },
      { status: 500 }
    );
  }
}
