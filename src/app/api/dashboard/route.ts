
import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth-server";
import { getDb } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

type AccountDocument = {
  _id: ObjectId;
  name: string;
  accountType: string;
  openingBalanceMillimes: number;
  createdAt?: Date;
};

type TransactionDocument = {
  _id: ObjectId;
  accountId: string;
  transactionType: "income" | "expense" | string;
  amountMillimes: number;
  category: string;
  description?: string;
  transactionDate: Date | string;
};

type ObligationDocument = {
  _id: ObjectId;
  name: string;
  obligationType: string;
  amountMillimes: number;
  nextDueDate: Date | string;
};

function toDateString(value: Date | string): string {
  if (typeof value === "string") {
    return value.slice(0, 10);
  }

  return value.toISOString().slice(0, 10);
}

function getTunisianDateParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Tunis",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );

  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
  };
}

function getCurrentMonthRange() {
  const { year, month } = getTunisianDateParts(new Date());

  const start = `${year}-${String(month).padStart(2, "0")}-01`;

  const nextMonthDate = new Date(Date.UTC(year, month, 1));
  const end = `${nextMonthDate.getUTCFullYear()}-${String(
    nextMonthDate.getUTCMonth() + 1,
  ).padStart(2, "0")}-01`;

  return { start, end };
}

export async function GET() {
  try {
    const user = await getAuthenticatedUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 },
      );
    }

    const db = await getDb();
    const userId = user.id;
    const { start, end } = getCurrentMonthRange();

    const accountsCollection = db.collection<AccountDocument>("accounts");
    const transactionsCollection =
      db.collection<TransactionDocument>("transactions");
    const obligationsCollection =
      db.collection<ObligationDocument>("obligations");

    const [accounts, recentTransactions, obligations, allBalances, monthlyTotals] =
      await Promise.all([
        accountsCollection
          .find({ userId })
          .sort({ createdAt: 1 })
          .toArray(),

        transactionsCollection
          .find({ userId })
          .sort({ transactionDate: -1, _id: -1 })
          .limit(10)
          .toArray(),

        obligationsCollection
          .find({ userId, active: true })
          .sort({ nextDueDate: 1 })
          .toArray(),

        transactionsCollection
          .aggregate<{
            _id: string;
            income: number;
            expense: number;
          }>([
            { $match: { userId } },
            {
              $group: {
                _id: "$accountId",
                income: {
                  $sum: {
                    $cond: [
                      { $eq: ["$transactionType", "income"] },
                      "$amountMillimes",
                      0,
                    ],
                  },
                },
                expense: {
                  $sum: {
                    $cond: [
                      { $eq: ["$transactionType", "expense"] },
                      "$amountMillimes",
                      0,
                    ],
                  },
                },
              },
            },
          ])
          .toArray(),

        transactionsCollection
          .aggregate<{
            _id: string;
            total: number;
          }>([
            {
              $match: {
                userId,
                transactionDate: { $gte: start, $lt: end },
              },
            },
            {
              $group: {
                _id: "$transactionType",
                total: { $sum: "$amountMillimes" },
              },
            },
          ])
          .toArray(),
      ]);

    const totalsByAccount = new Map(
      allBalances.map((item) => [item._id, item]),
    );

    const balances = accounts.map((account) => {
      const totals = totalsByAccount.get(account._id.toString());

      const income = totals?.income ?? 0;
      const expense = totals?.expense ?? 0;

      return {
        id: account._id.toString(),
        name: account.name,
        account_type: account.accountType,
        opening_balance_millimes: account.openingBalanceMillimes,
        income_millimes: income,
        expense_millimes: expense,
        balance_millimes:
          account.openingBalanceMillimes + income - expense,
      };
    });

    const monthlyIncome =
      monthlyTotals.find((item) => item._id === "income")?.total ?? 0;

    const monthlyExpenses =
      monthlyTotals.find((item) => item._id === "expense")?.total ?? 0;

    return NextResponse.json({
      accounts: balances.map((account) => ({
      id: account.id,
      name: account.name,
      account_type: account.account_type,
      opening_balance_millimes: account.opening_balance_millimes,
      income_millimes: account.income_millimes,
      expense_millimes: account.expense_millimes,
      balance_millimes: account.balance_millimes,
    })),

      balances,

      monthlySummary: {
        month_start: start,
        income_millimes: monthlyIncome,
        expense_millimes: monthlyExpenses,
        net_millimes: monthlyIncome - monthlyExpenses,
      },

      transactions: recentTransactions.map((transaction) => ({
        id: transaction._id.toString(),
        account_id: transaction.accountId,
        transaction_type: transaction.transactionType,
        amount_millimes: transaction.amountMillimes,
        category: transaction.category,
        description: transaction.description ?? "",
        transaction_date: toDateString(transaction.transactionDate),
      })),

      obligations: obligations.map((obligation) => ({
        id: obligation._id.toString(),
        name: obligation.name,
        obligation_type: obligation.obligationType,
        amount_millimes: obligation.amountMillimes,
        next_due_date: toDateString(obligation.nextDueDate),
      })),
    });
  } catch (error) {
    console.error("Dashboard API error:", error);

    return NextResponse.json(
      { error: "Unable to load dashboard data." },
      { status: 500 },
    );
  }
}
