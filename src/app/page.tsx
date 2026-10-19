
"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import DbTestButton from "@/components/DbTestButton";
import AddAccountForm from "@/components/AddAccountForm";
import AddTransactionForm from "@/components/AddTransactionForm";
import TransactionHistory from "@/components/TransactionHistory";
import type { HistoryTransaction } from "@/components/TransactionHistory";

type Account = {
  id: string;
  name: string;
  account_type: string;
  opening_balance_millimes: number;
  income_millimes: number;
  expense_millimes: number;
  balance_millimes: number;
};

type Transaction = {
  id: string;
  account_id: string;
  transaction_type: string;
  amount_millimes: number;
  category: string;
  description: string;
  transaction_date: string;
};

type Obligation = {
  id: string;
  name: string;
  obligation_type: string;
  amount_millimes: number;
  next_due_date: string;
};

const money = (millimes: number) =>
  new Intl.NumberFormat("fr-TN", {
    style: "currency",
    currency: "TND",
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  }).format(millimes / 1000);

export default function Home() {
  const router = useRouter();

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [obligations, setObligations] = useState<Obligation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentDate, setCurrentDate] = useState<Date | null>(null);
  const [editingTransaction, setEditingTransaction] =
  useState<Transaction | null>(null);
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);

  const loadDashboard = useCallback(async () => {
    try {
      const response = await fetch("/api/dashboard", { cache: "no-store" });

      if (response.status === 401) {
        router.replace("/login");
        return;
      }

      const result = (await response.json()) as {
         accounts?: Account[];
        balances?: Account[];
        transactions?: Transaction[];
        obligations?: Obligation[];
        error?: string;
      };

      if (!response.ok) {
        throw new Error(result.error ?? "Could not load your finances.");
      }

      setAccounts(result.balances ?? []);
      setTransactions(result.transactions ?? []);
      setObligations(result.obligations ?? []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not load your finances."
      );
    } finally {
      setCurrentDate(new Date());
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void Promise.resolve().then(loadDashboard);
  }, [loadDashboard]);

  async function signOut() {
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });

      if (!response.ok) {
        throw new Error("Could not sign out. Please try again.");
      }

      router.replace("/login");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not sign out. Please try again."
      );
    }
  }

  async function handleDeleteTransaction(id: string) {
  const confirmed = window.confirm(
    "Delete this transaction permanently? Your account balances will be recalculated."
  );

  if (!confirmed) return;

  setError("");

  try {
    const response = await fetch(`/api/transactions/${id}`, {
      method: "DELETE",
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error ?? "Could not delete the transaction.");
    }

    if (editingTransaction?.id === id) {
      setEditingTransaction(null);
    }

    setHistoryRefreshKey((key) => key + 1);
    await loadDashboard();
  } catch (err) {
    setError(
      err instanceof Error
        ? err.message
        : "Could not delete the transaction."
    );
  }
}

  // Balances are computed from each account's opening balance and
  // all transactions. Transfers are counted on their respective sides.
  // Fetch all transactions in a future server-side balance query;
  // this first dashboard will be accurate for small datasets only
  // after we remove the ten-row display limit from balance calculation.
  const balances = accounts.map((account) => ({
    ...account,
    balance: account.balance_millimes,
  }));

  const totalBalance = balances.reduce(
    (sum, account) => sum + account.balance,
    0
  );

  const now = currentDate;
const monthStart = now
  ? new Date(now.getFullYear(), now.getMonth(), 1)
  : null;
const monthEnd = now
  ? new Date(now.getFullYear(), now.getMonth() + 1, 1)
  : null;

const monthlyTransactions = transactions.filter((transaction) => {
  if (!monthStart || !monthEnd) return false;

  const date = new Date(`${transaction.transaction_date}T12:00:00`);
  return date >= monthStart && date < monthEnd;
});

const monthlyIncome = monthlyTransactions
  .filter((t) => t.transaction_type === "income")
  .reduce((sum, t) => sum + t.amount_millimes, 0);

const monthlyExpenses = monthlyTransactions
  .filter((t) => t.transaction_type === "expense")
  .reduce((sum, t) => sum + t.amount_millimes, 0);

const today = now
  ? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
      now.getDate()
    ).padStart(2, "0")}`
  : "";

const upcoming = obligations.filter(
  (obligation) => !!today && obligation.next_due_date >= today
);

  const reservedPayments = upcoming.reduce(
    (sum, item) => sum + item.amount_millimes,
    0
  );

  const safeToSpend = totalBalance - reservedPayments;

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-300">
        Loading Expenza...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 p-4 text-white sm:p-8">
      <div className="mx-auto max-w-6xl space-y-8">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="font-semibold tracking-widest text-emerald-400">
              EXPENZA
            </p>
            <h1 className="mt-2 text-3xl font-bold">Your finances</h1>
            <p className="mt-1 text-sm text-slate-400">
              Your money, clearly organized.
            </p>
          </div>
          <button
            onClick={signOut}
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm hover:bg-slate-900"
          >
            Sign out
          </button>
        </header>

        {error && (
          <div role="alert" className="rounded-xl border border-red-800 p-4 text-red-300">
            {error}
          </div>
        )}

        <section className="rounded-xl border border-gray-200 p-5">
            <h2 className="mb-4 text-lg font-semibold">Add an account</h2>

            <AddAccountForm onCreated={() => window.location.reload()} />
        </section>
        <section className="rounded-xl border border-gray-200 p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">
              {editingTransaction ? "Edit transaction" : "Add a transaction"}
            </h2>

            {editingTransaction && (
              <button
                type="button"
                onClick={() => setEditingTransaction(null)}
                className="rounded-lg border border-slate-600 px-3 py-2 text-sm hover:bg-slate-800"
              >
                Cancel edit
              </button>
            )}
          </div>

          <AddTransactionForm
            key={editingTransaction?.id ?? "new-transaction"}
            accounts={accounts}
            transaction={editingTransaction ?? undefined}
            onCreated={() => window.location.reload()}
          />
        </section>
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <article className="rounded-2xl border border-emerald-800 bg-emerald-950/40 p-5 sm:col-span-2">
            <p className="text-sm text-emerald-300">Current account balances</p>
            <p className="mt-3 text-3xl font-bold sm:text-4xl">
              {money(totalBalance)}
            </p>
            <p className="mt-2 text-sm text-slate-400">
              Your balances reflect your opening amounts and recorded transactions.
            </p>
          </article>

          <article className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">Income this month</p>
            <p className="mt-3 text-2xl font-semibold text-emerald-400">
              {money(monthlyIncome)}
            </p>
          </article>

          <article className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">Expenses this month</p>
            <p className="mt-3 text-2xl font-semibold text-rose-400">
              {money(monthlyExpenses)}
            </p>
          </article>
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          <article className="rounded-2xl border border-slate-800 bg-slate-900 p-6 lg:col-span-2">
            <p className="text-sm text-slate-400">Safe to spend</p>
            <p className={`mt-3 text-3xl font-bold ${
              safeToSpend < 0 ? "text-rose-400" : "text-emerald-400"
            }`}>
              {money(safeToSpend)}
            </p>
            <p className="mt-2 text-sm text-slate-400">
              Current recorded balances minus upcoming payment reservations.
              Savings reserves and the salary-cycle budget will be added next.
            </p>
          </article>

          <article className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="font-semibold">Upcoming payments</h2>
            <p className="mt-3 text-2xl font-bold">
              {money(reservedPayments)}
            </p>
            <p className="mt-1 text-sm text-slate-400">
              {upcoming.length} active payment
              {upcoming.length === 1 ? "" : "s"} due
            </p>
          </article>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <article className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <h2 className="text-lg font-semibold">Your accounts</h2>
            <div className="mt-4 space-y-3">
              {balances.length === 0 ? (
                <p className="text-sm text-slate-400">
                  No accounts yet. We&apos;ll add your bank and cash balances next.
                </p>
              ) : (
                balances.map((account) => (
                  <div
                    key={account.id}
                    className="flex items-center justify-between gap-4 border-b border-slate-800 pb-3"
                  >
                    <div>
                      <p>{account.name}</p>
                      <p className="text-sm text-slate-400">
                        {account.account_type}
                      </p>
                    </div>
                    <p className="font-medium">{money(account.balance)}</p>
                  </div>
                ))
              )}
            </div>
          </article>

          <article className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <h2 className="text-lg font-semibold">Recent transactions</h2>
            <div className="mt-4 space-y-3">
              {transactions.length === 0 ? (
                <p className="text-sm text-slate-400">
                  No transactions recorded yet.
                </p>
              ) : (
                transactions.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between gap-4 border-b border-slate-800 pb-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate">
                        {transaction.description || transaction.category}
                      </p>
                      <p className="text-sm text-slate-400">
                        {transaction.transaction_date}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <p
                        className={
                          transaction.transaction_type === "income"
                            ? "font-medium text-emerald-400"
                            : "font-medium text-rose-400"
                        }
                      >
                        {transaction.transaction_type === "income" ? "+" : "−"}
                        {money(transaction.amount_millimes)}
                      </p>

                      <button
                        type="button"
                        onClick={() => setEditingTransaction(transaction)}
                        className="rounded-md border border-slate-700 px-2 py-1 text-sm hover:bg-slate-800"
                        aria-label={`Edit ${transaction.description || transaction.category}`}
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        onClick={() => void handleDeleteTransaction(transaction.id)}
                        className="rounded-md border border-red-900 px-2 py-1 text-sm text-red-400 hover:bg-red-950"
                        aria-label={`Delete ${transaction.description || transaction.category}`}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </article>
        </section>

        <TransactionHistory
          accounts={accounts}
          refreshKey={historyRefreshKey}
          onEdit={(transaction: HistoryTransaction) => {
            setEditingTransaction(transaction);
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
          onDelete={(id) => {
            void handleDeleteTransaction(id);
          }}
        />

        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <h2 className="text-lg font-semibold">Payment schedule</h2>
          <div className="mt-4 space-y-3">
            {upcoming.length === 0 ? (
              <p className="text-sm text-slate-400">
                No upcoming payments. Add your installments and bills in the
                next step.
              </p>
            ) : (
              upcoming.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3"
                >
                  <div>
                    <p>{item.name}</p>
                    <p className="text-sm text-slate-400">
                      {item.obligation_type} · Due {item.next_due_date}
                    </p>
                  </div>
                  <p className="font-semibold">{money(item.amount_millimes)}</p>
                </div>
              ))
            )}
          </div>
        </section>

        <button
          onClick={() => {
            setLoading(true);
            setError("");
            void loadDashboard();
          }}
          className="rounded-lg border border-slate-700 px-4 py-2 text-sm hover:bg-slate-900"
        >
          Refresh dashboard
        </button>
      </div>
    </main>
  );
}
