import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth-server";
import { getDb } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

type ExportItem = "accounts" | "transactions" | "installments";

function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function toDateString(value: Date | string): string {
  if (typeof value === "string") return value.slice(0, 10);
  return value.toISOString().slice(0, 10);
}

export async function GET(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);

  /* ── parse + validate items ── */
  const rawItems = searchParams.get("items") ?? "accounts,transactions,installments";
  const VALID_ITEMS = new Set<ExportItem>(["accounts", "transactions", "installments"]);
  const items = rawItems
    .split(",")
    .map((s) => s.trim() as ExportItem)
    .filter((s) => VALID_ITEMS.has(s));

  if (items.length === 0) {
    return NextResponse.json({ error: "Select at least one item to export." }, { status: 400 });
  }

  /* ── parse + validate date range ── */
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  if ((from && !isValidDate(from)) || (to && !isValidDate(to))) {
    return NextResponse.json({ error: "Enter valid dates in YYYY-MM-DD format." }, { status: 400 });
  }
  if (from && to && from > to) {
    return NextResponse.json({ error: "Start date cannot be after end date." }, { status: 400 });
  }

  try {
    const db = await getDb();
    const userId = user.id;

    const result: Record<string, unknown> = {
      exportedAt: new Date().toISOString(),
      period: from && to ? { from, to } : "all",
    };

    /* ── accounts ── */
    if (items.includes("accounts")) {
      const accounts = await db
        .collection("accounts")
        .find({ userId })
        .sort({ createdAt: 1 })
        .toArray();

      // Compute live balance per account from transactions
      const balanceTotals = await db
        .collection("transactions")
        .aggregate<{ _id: string; income: number; expense: number }>([
          { $match: { userId } },
          {
            $group: {
              _id: "$accountId",
              income: {
                $sum: {
                  $cond: [
                    { $in: ["$transactionType", ["income", "transfer_in"]] },
                    "$amountMillimes",
                    0,
                  ],
                },
              },
              expense: {
                $sum: {
                  $cond: [
                    { $in: ["$transactionType", ["expense", "transfer_out"]] },
                    "$amountMillimes",
                    0,
                  ],
                },
              },
            },
          },
        ])
        .toArray();

      const totalsMap = new Map(balanceTotals.map((t) => [t._id, t]));

      result.accounts = accounts.map((a) => {
        const totals = totalsMap.get(a._id.toString());
        const income = totals?.income ?? 0;
        const expense = totals?.expense ?? 0;
        return {
          id: a._id.toString(),
          name: a.name,
          account_type: a.accountType,
          opening_balance_millimes: a.openingBalanceMillimes,
          balance_millimes: a.openingBalanceMillimes + income - expense,
          created_at: a.createdAt instanceof Date ? a.createdAt.toISOString() : (a.createdAt ?? null),
        };
      });
    }

    /* ── transactions ── */
    if (items.includes("transactions")) {
      const txFilter: Record<string, unknown> = { userId };

      if (from || to) {
        const dateFilter: Record<string, string> = {};
        if (from) dateFilter.$gte = from;
        if (to) {
          // inclusive upper bound: advance to next day for $lt
          const d = new Date(`${to}T00:00:00.000Z`);
          d.setUTCDate(d.getUTCDate() + 1);
          dateFilter.$lt = d.toISOString().slice(0, 10);
        }
        txFilter.transactionDate = dateFilter;
      }

      const transactions = await db
        .collection("transactions")
        .find(txFilter)
        .sort({ transactionDate: -1, _id: -1 })
        .toArray();

      result.transactions = transactions.map((t) => ({
        id: t._id.toString(),
        account_id: t.accountId,
        transaction_type: t.transactionType,
        amount_millimes: t.amountMillimes,
        category: t.category,
        description: t.description ?? "",
        transaction_date: toDateString(t.transactionDate),
        transfer_id: t.transferId ?? null,
        obligation_id: t.obligationId ?? null,
        created_at: t.createdAt instanceof Date ? t.createdAt.toISOString() : (t.createdAt ?? null),
      }));
    }

    /* ── installments ── */
    if (items.includes("installments")) {
      const purchases = await db
        .collection("obligations")
        .find({ userId, obligationType: "installment" })
        .sort({ createdAt: -1 })
        .toArray();

      const purchaseIds = purchases.map((p) => p._id.toString());

      const payments = purchaseIds.length
        ? await db
            .collection("obligationPayments")
            .find({ userId, obligationId: { $in: purchaseIds } })
            .sort({ obligationId: 1, number: 1 })
            .toArray()
        : [];

      result.installments = {
        purchases: purchases.map((p) => ({
          id: p._id.toString(),
          name: p.name,
          account_id: p.accountId,
          total_amount_millimes: p.totalAmountMillimes,
          installment_count: p.installmentCount,
          first_due_date: toDateString(p.firstDueDate),
          next_due_date: p.nextDueDate ? toDateString(p.nextDueDate) : null,
          active: p.active,
          created_at: p.createdAt instanceof Date ? p.createdAt.toISOString() : (p.createdAt ?? null),
        })),
        payments: payments.map((p) => ({
          id: p._id.toString(),
          obligation_id: p.obligationId,
          number: p.number,
          amount_millimes: p.amountMillimes,
          due_date: toDateString(p.dueDate),
          status: p.status,
          paid_at: p.paidAt instanceof Date ? p.paidAt.toISOString() : (p.paidAt ?? null),
          transaction_id: p.transactionId ?? null,
        })),
      };
    }

    const filename = `finance-export-${new Date().toISOString().slice(0, 10)}.json`;

    return new NextResponse(JSON.stringify(result, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Export API error:", error);
    return NextResponse.json(
      { error: "Could not export data. Please try again." },
      { status: 500 }
    );
  }
}