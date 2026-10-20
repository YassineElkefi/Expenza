"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Alert } from "@/components/ui/Alert";
import { AccountPicker } from "./ui/AccountPicker";

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

const CATEGORY_ICONS: Record<string, string> = {
  "Food": "🍽️",
  "Transport": "🚗",
  "Shopping": "🛍️",
  "E-Shopping": "🛒",
  "Health": "💊",
  "Housing": "🏠",
  "Entertainment": "🎬",
  "Utilities": "⚡",
  "Salary": "💼",
  "Freelance": "💻",
  "Other": "📦",
  "ATM": "🏧",
  "Transfer": "🔄",
  "Banking": "🏦",
  "Gaming": "🎮",
};

const TYPE_CONFIG: Record<
  string,
  { label: string; sign: "+" | "−" | null; color: string }
> = {
  income:       { label: "Income",     sign: "+", color: "var(--success)" },
  expense:      { label: "Expense",    sign: "−", color: "var(--danger)"  },
  transfer_in:  { label: "Transfer ←", sign: "+", color: "var(--accent)"  },
  transfer_out: { label: "Transfer →", sign: "−", color: "var(--accent)"  },
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
  const [accountIds, setAccountIds] = useState<string[]>([]);
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
        const params = new URLSearchParams({ page: String(page), limit: "20" });
        if (type) params.set("type", type);
        if (accountIds.length > 0) params.set("accountIds", accountIds.join(","));
        if (category.trim()) params.set("category", category.trim());
        if (from) params.set("from", from);
        if (to) params.set("to", to);

        const response = await fetch(
          `/api/transactions/history?${params.toString()}`,
          { cache: "no-store", signal: controller.signal }
        );

        if (response.status === 401) { router.replace("/login"); return; }

        const result = await response.json();
        if (!response.ok) throw new Error(result.error ?? "Could not load transaction history.");

        setTransactions(result.transactions ?? []);
        setPagination(result.pagination ?? null);
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return;
        setError(err instanceof Error ? err.message : "Could not load transaction history.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void loadHistory();
    return () => controller.abort();
  }, [page, type, accountIds, category, from, to, refreshKey, router]);

  function resetFilters() {
    setType("");
    setAccountIds([]);
    setCategory("");
    setFrom("");
    setTo("");
    setPage(1);
  }

  const accountNames = new Map(accounts.map((a) => [a.id, a.name]));

  const hasActiveFilters = type || accountIds.length > 0 || category || from || to;

  return (
    <section className="surface p-5">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
            Transaction history
          </h2>
          <p className="mt-0.5 text-sm" style={{ color: "var(--text-secondary)" }}>
            {pagination?.total ?? 0} transactions found
          </p>
        </div>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={resetFilters}
            className="text-xs font-medium"
            style={{ color: "var(--accent)" }}
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Filters */}
      <div
        className="mt-4 rounded-xl p-4"
        style={{ background: "var(--bg-subtle)" }}
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <label className="field-label">
            Type
            <select
              value={type}
              onChange={(e) => { setType(e.target.value); setPage(1); }}
              className="input mt-1"
            >
              <option value="">All types</option>
              <option value="income">Income</option>
              <option value="expense">Expense</option>
              <option value="transfer_in">Transfer ←</option>
              <option value="transfer_out">Transfer →</option>
            </select>
          </label>

          <label className="field-label">
            Account
            <div className="mt-1">
              <AccountPicker
                accounts={accounts}
                value={accountIds}
                onChange={(ids) => { setAccountIds(ids); setPage(1); }}
              />
            </div>
          </label>

          <label className="field-label">
            Category
            <input
              value={category}
              onChange={(e) => { setCategory(e.target.value); setPage(1); }}
              placeholder="e.g. Food"
              maxLength={50}
              className="input mt-1"
            />
          </label>

          <label className="field-label">
            From
            <input
              type="date"
              value={from}
              max={to || undefined}
              onChange={(e) => { setFrom(e.target.value); setPage(1); }}
              className="input mt-1"
            />
          </label>

          <label className="field-label">
            To
            <input
              type="date"
              value={to}
              min={from || undefined}
              onChange={(e) => { setTo(e.target.value); setPage(1); }}
              className="input mt-1"
            />
          </label>
        </div>
      </div>

      {error && (
        <div className="mt-4">
          <Alert type="error">{error}</Alert>
        </div>
      )}

      {/* List */}
      <div className="mt-4">
        {loading ? (
          <div className="flex flex-col gap-3 py-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-3 rounded-xl p-3"
                style={{ background: "var(--bg-subtle)", opacity: 1 - i * 0.15 }}
              >
                <div className="h-10 w-10 shrink-0 rounded-full" style={{ background: "var(--border)" }} />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-2/5 rounded" style={{ background: "var(--border)" }} />
                  <div className="h-2.5 w-1/3 rounded" style={{ background: "var(--border)" }} />
                </div>
                <div className="h-4 w-20 rounded" style={{ background: "var(--border)" }} />
              </div>
            ))}
          </div>
        ) : transactions.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-3xl">🔍</p>
            <p className="mt-2 text-sm font-medium" style={{ color: "var(--text-primary)" }}>
              No transactions found
            </p>
            <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
              Try adjusting your filters
            </p>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: "var(--border)" }}>
            {transactions.map((t) => {
              const cfg = TYPE_CONFIG[t.transaction_type] ?? {
                label: t.transaction_type,
                sign: null,
                color: "var(--text-secondary)",
              };
              const isTransfer =
                t.transaction_type === "transfer_in" ||
                t.transaction_type === "transfer_out";
              const icon =
                isTransfer
                  ? "🔄"
                  : (CATEGORY_ICONS[t.category] ?? "📦");

              const date = new Date(t.transaction_date);
              const dateLabel = date.toLocaleDateString("en-TN", {
                month: "short",
                day: "numeric",
                year: date.getFullYear() !== new Date().getFullYear()
                  ? "numeric"
                  : undefined,
              });

              return (
                <div
                  key={t.id}
                  className="flex items-center gap-3 py-3"
                >
                  {/* Icon */}
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg"
                    style={{ background: "var(--bg-subtle)" }}
                  >
                    {icon}
                  </div>

                  {/* Description + meta */}
                  <div className="min-w-0 flex-1">
                    <p
                      className="truncate text-sm font-medium"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {t.description || t.category}
                    </p>
                    <p className="mt-0.5 text-xs" style={{ color: "var(--text-muted)" }}>
                      {t.category}
                      {" · "}
                      {accountNames.get(t.account_id) ?? "Account"}
                      {" · "}
                      {dateLabel}
                    </p>
                  </div>

                  {/* Right side: amount + type badge + actions */}
                  <div className="flex shrink-0 items-center gap-3">
                    {/* Amount + badge stacked */}
                    <div className="flex flex-col items-end gap-1">
                      <span
                        className="text-sm font-semibold tabular-nums"
                        style={{ color: cfg.color }}
                      >
                        {cfg.sign}{money(t.amount_millimes)}
                      </span>
                      <span
                        className="text-[10px] font-medium rounded-full px-1.5 py-px"
                        style={{
                          background: `color-mix(in srgb, ${cfg.color} 12%, transparent)`,
                          color: cfg.color,
                        }}
                      >
                        {cfg.label}
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => onEdit(t)}
                        disabled={isTransfer}
                        title={isTransfer ? "Transfers can't be edited individually" : undefined}
                        className="btn btn-secondary btn-sm"
                        style={isTransfer ? { opacity: 0.4, cursor: "not-allowed" } : undefined}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => onDelete(t.id)}
                        disabled={isTransfer}
                        title={isTransfer ? "Transfers can't be deleted individually" : undefined}
                        className="btn btn-danger btn-sm"
                        style={isTransfer ? { opacity: 0.4, cursor: "not-allowed" } : undefined}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div
          className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t pt-4"
          style={{ borderColor: "var(--border)" }}
        >
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            Page {pagination.totalPages > 0 ? pagination.page : 0} of {pagination.totalPages}
          </p>

          <div className="flex gap-2">
            <button
              type="button"
              disabled={!pagination.hasPreviousPage || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="btn btn-secondary btn-sm"
            >
              ← Previous
            </button>
            <button
              type="button"
              disabled={!pagination.hasNextPage || loading}
              onClick={() => setPage((p) => p + 1)}
              className="btn btn-secondary btn-sm"
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </section>
  );
}