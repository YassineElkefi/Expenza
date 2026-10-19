
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Account = {
  id: string;
  name: string;
  account_type: string;
};

export type HistoryTransaction = {
  id: string;
  account_id: string;
  transaction_type: string;
  amount_millimes: number;
  category: string;
  description: string;
  transaction_date: string;
};

type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
};

type Props = {
  accounts: Account[];
  refreshKey: number;
  onEdit: (transaction: HistoryTransaction) => void;
  onDelete: (id: string) => void;
};

const money = (millimes: number) =>
  new Intl.NumberFormat("fr-TN", {
    style: "currency",
    currency: "TND",
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  }).format(millimes / 1000);

export default function TransactionHistory({
  accounts,
  refreshKey,
  onEdit,
  onDelete,
}: Props) {
  const router = useRouter();

  const [transactions, setTransactions] = useState<HistoryTransaction[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [page, setPage] = useState(1);
  const [type, setType] = useState("");
  const [accountId, setAccountId] = useState("");
  const [category, setCategory] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function loadHistory() {
      setLoading(true);
      setError("");

      try {
        const params = new URLSearchParams({
          page: String(page),
          limit: "20",
        });

        if (type) params.set("type", type);
        if (accountId) params.set("accountId", accountId);
        if (category.trim()) params.set("category", category.trim());
        if (from) params.set("from", from);
        if (to) params.set("to", to);

        const response = await fetch(
          `/api/transactions/history?${params.toString()}`,
          {
            cache: "no-store",
            signal: controller.signal,
          }
        );

        if (response.status === 401) {
          router.replace("/login");
          return;
        }

        const result = await response.json();

        if (!response.ok) {
          throw new Error(
            result.error ?? "Could not load transaction history."
          );
        }

        setTransactions(result.transactions ?? []);
        setPagination(result.pagination ?? null);
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return;

        setError(
          err instanceof Error
            ? err.message
            : "Could not load transaction history."
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void loadHistory();

    return () => controller.abort();
  }, [page, type, accountId, category, from, to, refreshKey, router]);

  function resetFilters() {
    setType("");
    setAccountId("");
    setCategory("");
    setFrom("");
    setTo("");
    setPage(1);
  }

  const accountNames = new Map(
    accounts.map((account) => [account.id, account.name])
  );

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Transaction history</h2>
          <p className="mt-1 text-sm text-slate-400">
            Search and browse all your recorded transactions.
          </p>
        </div>

        <span className="text-sm text-slate-400">
          {pagination?.total ?? 0} transactions
        </span>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <label className="text-sm text-slate-300">
          Transaction type
          <select
            value={type}
            onChange={(event) => {
              setType(event.target.value);
              setPage(1);
            }}
            className="mt-1 block w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white"
          >
            <option value="">All types</option>
            <option value="income">Income</option>
            <option value="expense">Expense</option>
          </select>
        </label>

        <label className="text-sm text-slate-300">
          Account
          <select
            value={accountId}
            onChange={(event) => {
              setAccountId(event.target.value);
              setPage(1);
            }}
            className="mt-1 block w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white"
          >
            <option value="">All accounts</option>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm text-slate-300">
          Category
          <input
            value={category}
            onChange={(event) => {
              setCategory(event.target.value);
              setPage(1);
            }}
            placeholder="e.g. Food"
            maxLength={50}
            className="mt-1 block w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white placeholder:text-slate-500"
          />
        </label>

        <label className="text-sm text-slate-300">
          From date
          <input
            type="date"
            value={from}
            max={to || undefined}
            onChange={(event) => {
              setFrom(event.target.value);
              setPage(1);
            }}
            className="mt-1 block w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white"
          />
        </label>

        <label className="text-sm text-slate-300">
          To date
          <input
            type="date"
            value={to}
            min={from || undefined}
            onChange={(event) => {
              setTo(event.target.value);
              setPage(1);
            }}
            className="mt-1 block w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white"
          />
        </label>

        <div className="flex items-end">
          <button
            type="button"
            onClick={resetFilters}
            className="w-full rounded-lg border border-slate-700 px-3 py-2 text-sm hover:bg-slate-800"
          >
            Clear filters
          </button>
        </div>
      </div>

      {error && (
        <p role="alert" className="mt-4 rounded-lg border border-red-900 p-3 text-sm text-red-300">
          {error}
        </p>
      )}

      <div className="mt-5">
        {loading ? (
          <p className="py-8 text-center text-sm text-slate-400">
            Loading transactions...
          </p>
        ) : transactions.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">
            No transactions match these filters.
          </p>
        ) : (
          <div className="divide-y divide-slate-800">
            {transactions.map((transaction) => (
              <div
                key={transaction.id}
                className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">
                    {transaction.description || transaction.category}
                  </p>
                  <p className="mt-1 text-sm text-slate-400">
                    {transaction.category}
                    {" · "}
                    {accountNames.get(transaction.account_id) ?? "Account"}
                    {" · "}
                    {transaction.transaction_date}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <p
                    className={
                      transaction.transaction_type === "income"
                        ? "font-semibold text-emerald-400"
                        : "font-semibold text-rose-400"
                    }
                  >
                    {transaction.transaction_type === "income" ? "+" : "−"}
                    {money(transaction.amount_millimes)}
                  </p>

                  <button
                    type="button"
                    onClick={() => onEdit(transaction)}
                    className="rounded-md border border-slate-700 px-3 py-1.5 text-sm hover:bg-slate-800"
                  >
                    Edit
                  </button>

                  <button
                    type="button"
                    onClick={() => onDelete(transaction.id)}
                    className="rounded-md border border-red-900 px-3 py-1.5 text-sm text-red-400 hover:bg-red-950"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 pt-4">
        <p className="text-sm text-slate-400">
          Page {pagination && pagination.totalPages > 0 ? pagination.page : 0}
          {" of "}
          {pagination?.totalPages ?? 0}
        </p>

        <div className="flex gap-2">
          <button
            type="button"
            disabled={!pagination?.hasPreviousPage || loading}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Previous
          </button>

          <button
            type="button"
            disabled={!pagination?.hasNextPage || loading}
            onClick={() => setPage((current) => current + 1)}
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>
    </section>
  );
}
