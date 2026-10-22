"use client";

import { useState } from "react";
import { createPortal } from "react-dom";

/* ── types ── */
type ExportItem = "accounts" | "transactions" | "installments";
type PeriodType = "all" | "this_month" | "last_month" | "custom";

type Props = {
  onClose: () => void;
};

/* ── helpers ── */
function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function getLastMonth(): string {
  const now = new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1);
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function monthToRange(ym: string): { from: string; to: string } {
  const [y, m] = ym.split("-").map(Number);
  const last = new Date(y, m, 0).getDate();
  return {
    from: `${ym}-01`,
    to: `${ym}-${String(last).padStart(2, "0")}`,
  };
}

/* ── component ── */
export function ExportDialog({ onClose }: Props) {
  const [items, setItems] = useState<Set<ExportItem>>(
    new Set(["accounts", "transactions", "installments"])
  );
  const [period, setPeriod] = useState<PeriodType>("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function toggleItem(item: ExportItem) {
    setItems((prev) => {
      const next = new Set(prev);
      if (next.has(item)) {
        if (next.size === 1) return prev; // keep at least one
        next.delete(item);
      } else {
        next.add(item);
      }
      return next;
    });
  }

  async function handleExport() {
    setError("");
    setLoading(true);

    try {
      const params = new URLSearchParams();
      params.set("items", [...items].join(","));

      if (period !== "all") {
        let from = "";
        let to = "";

        if (period === "this_month") {
          ({ from, to } = monthToRange(getCurrentMonth()));
        } else if (period === "last_month") {
          ({ from, to } = monthToRange(getLastMonth()));
        } else if (period === "custom") {
          if (!customFrom || !customTo) {
            setError("Enter both a start and end date.");
            setLoading(false);
            return;
          }
          if (customFrom > customTo) {
            setError("Start date must be before end date.");
            setLoading(false);
            return;
          }
          from = customFrom;
          to = customTo;
        }

        params.set("from", from);
        params.set("to", to);
      }

      const res = await fetch(`/api/export?${params.toString()}`);

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Export failed.");
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const date = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `finance-export-${date}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed.");
    } finally {
      setLoading(false);
    }
  }

  const ITEMS: { id: ExportItem; label: string; sub: string }[] = [
    { id: "accounts", label: "Accounts", sub: "Names, types, and balances" },
    { id: "transactions", label: "Transactions", sub: "Income, expenses, and transfers" },
    { id: "installments", label: "Installments", sub: "Purchases and payment schedules" },
  ];

  const PERIODS: { id: PeriodType; label: string }[] = [
    { id: "all", label: "All time" },
    { id: "this_month", label: "This month" },
    { id: "last_month", label: "Last month" },
    { id: "custom", label: "Custom range" },
  ];

  return (createPortal(
    /* ── backdrop ── */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(3px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* ── panel ── */}
      <div
        className="surface w-full max-w-md rounded-xl shadow-2xl"
        style={{ border: "1px solid var(--border)" }}
      >
        {/* header */}
        <div
          className="flex items-center justify-between px-6 py-5"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          <div>
            <h2 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>
              Export data
            </h2>
            <p className="mt-0.5 text-sm" style={{ color: "var(--text-muted)" }}>
              Download as JSON for Flutter import
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-md text-lg leading-none transition-colors"
            style={{ color: "var(--text-muted)" }}
          >
            ×
          </button>
        </div>

        <div className="px-6 py-5 space-y-6">

          {/* ── what to include ── */}
          <div>
            <p className="mb-3 text-xs font-medium uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
              Include
            </p>
            <div className="space-y-2">
              {ITEMS.map(({ id, label, sub }) => (
                <label
                  key={id}
                  className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 transition-colors"
                  style={{
                    background: items.has(id) ? "var(--bg-subtle)" : "transparent",
                    border: `1px solid ${items.has(id) ? "var(--accent)" : "var(--border)"}`,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={items.has(id)}
                    onChange={() => toggleItem(id)}
                    className="h-4 w-4 rounded"
                    style={{ accentColor: "var(--accent)" }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                      {label}
                    </p>
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                      {sub}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* ── period ── */}
          <div>
            <p className="mb-3 text-xs font-medium uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
              Period
            </p>
            <div className="grid grid-cols-2 gap-2">
              {PERIODS.map(({ id, label }) => (
                <label
                  key={id}
                  className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2.5 transition-colors"
                  style={{
                    background: period === id ? "var(--bg-subtle)" : "transparent",
                    border: `1px solid ${period === id ? "var(--accent)" : "var(--border)"}`,
                  }}
                >
                  <input
                    type="radio"
                    name="period"
                    checked={period === id}
                    onChange={() => setPeriod(id)}
                    style={{ accentColor: "var(--accent)" }}
                  />
                  <span className="text-sm" style={{ color: "var(--text-primary)" }}>
                    {label}
                  </span>
                </label>
              ))}
            </div>

            {/* custom date inputs */}
            {period === "custom" && (
              <div className="mt-3 grid grid-cols-2 gap-3">
                {(["customFrom", "customTo"] as const).map((field) => (
                  <div key={field}>
                    <label className="mb-1 block text-xs" style={{ color: "var(--text-muted)" }}>
                      {field === "customFrom" ? "From" : "To"}
                    </label>
                    <input
                      type="date"
                      value={field === "customFrom" ? customFrom : customTo}
                      onChange={(e) =>
                        field === "customFrom"
                          ? setCustomFrom(e.target.value)
                          : setCustomTo(e.target.value)
                      }
                      className="w-full rounded-md border px-3 py-1.5 text-sm"
                      style={{
                        background: "var(--bg-surface)",
                        color: "var(--text-primary)",
                        borderColor: "var(--border)",
                      }}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* error */}
          {error && (
            <p className="rounded-md px-3 py-2 text-sm" style={{
              background: "color-mix(in srgb, var(--danger) 10%, transparent)",
              color: "var(--danger)",
            }}>
              {error}
            </p>
          )}
        </div>

        {/* footer */}
        <div
          className="flex items-center justify-end gap-3 px-6 py-4"
          style={{ borderTop: "1px solid var(--border)" }}
        >
          <button
            onClick={onClose}
            className="rounded-md px-4 py-2 text-sm font-medium transition-colors"
            style={{
              background: "var(--bg-subtle)",
              color: "var(--text-secondary)",
              border: "1px solid var(--border)",
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            disabled={loading || items.size === 0}
            className="rounded-md px-4 py-2 text-sm font-medium transition-opacity disabled:opacity-50"
            style={{
              background: "var(--accent)",
              color: "#fff",
            }}
          >
            {loading ? "Exporting…" : "Export JSON"}
          </button>
        </div>
      </div>
    </div>, document.body)
  );
}