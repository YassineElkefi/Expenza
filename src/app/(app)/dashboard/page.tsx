"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Alert } from "@/components/ui/Alert";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { AccountsPanel } from "@/components/dashboard/AccountsPanel";
import { StatsRow } from "@/components/dashboard/StatsRow";
import { PlannedTransactions } from "@/components/dashboard/PlannedTransactions";
import { RecentTransactions } from "@/components/dashboard/RecentTransactions";
import { ExportDialog } from "@/components/ui/ExportDialog";


/* ── types ──────────────────────────────────── */

type Account = {
  id: string;
  name: string;
  account_type: string;
  balance_millimes: number;
};

type Transaction = {
  id: string;
  transaction_type: string;
  amount_millimes: number;
  category: string;
  description: string;
  transaction_date: string;
};

type InstallmentPayment = {
  id: string;
  obligationId: string;
  number: number;
  amountMillimes: number;
  dueDate: string;
  status: "unpaid" | "processing" | "paid";
};

type InstallmentPurchase = {
  id: string;
  name: string;
};

/* ── helpers ─────────────────────────────────── */

const fmt = (millimes: number) =>
  new Intl.NumberFormat("fr-TN", {
    style: "currency",
    currency: "TND",
    minimumFractionDigits: 3,
  }).format(millimes / 1000);

const short = (millimes: number) =>
  new Intl.NumberFormat("fr-TN", {
    style: "currency",
    currency: "TND",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(millimes / 1000);
  

/* ── sub-components ──────────────────────────── */

function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: "green" | "red" | "amber";
}) {
  const valueColor =
    accent === "green"
      ? "var(--success)"
      : accent === "red"
        ? "var(--danger)"
        : accent === "amber"
          ? "var(--warning)"
          : "var(--text-primary)";

  return (
    <div className="surface p-5">
      <p className="label">{label}</p>
      <p className="stat-value mt-3" style={{ color: valueColor }}>
        {value}
      </p>
      {sub && (
        <p className="mt-1.5 text-xs" style={{ color: "var(--text-muted)" }}>
          {sub}
        </p>
      )}
    </div>
  );
}

function SectionHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>
        {title}
      </h2>
      {sub && (
        <p className="mt-0.5 text-sm" style={{ color: "var(--text-secondary)" }}>
          {sub}
        </p>
      )}
    </div>
  );
}

/* ── custom tooltip ──────────────────────────── */

type ChartTooltipEntry = {
  name: string;
  color: string;
  value: number;
};

type ChartTooltipProps = {
  active?: boolean;
  payload?: ChartTooltipEntry[];
  label?: string;
};

function ChartTooltip({ active, payload, label }: ChartTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="surface px-3 py-2 text-sm"
      style={{ minWidth: 130 }}
    >
      <p className="mb-1 font-medium" style={{ color: "var(--text-primary)" }}>
        {label}
      </p>
      {payload.map((entry) => (
        <p key={entry.name} style={{ color: entry.color }}>
          {entry.name}: {short(entry.value)}
        </p>
      ))}
    </div>
  );
}



/* ── page ────────────────────────────────────── */

export default function DashboardPage() {
  const router = useRouter();

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [installmentPurchases, setInstallmentPurchases] = useState<InstallmentPurchase[]>([]);
  const [installmentPayments, setInstallmentPayments] = useState<InstallmentPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentDate, setCurrentDate] = useState<Date | null>(null);
  const [monthlyChart, setMonthlyChart] = useState<{ month: string; income: number; expenses: number }[]>([]);
  const [categoryMonth, setCategoryMonth] = useState<string>("");
  const [futureTransactions, setFutureTransactions] = useState<Transaction[]>([]);
  const [showExport, setShowExport] = useState(false);



  const load = useCallback(async () => {
    try {
      const [dashRes, instRes] = await Promise.all([
        fetch("/api/dashboard", { cache: "no-store" }),
        fetch("/api/obligations", { cache: "no-store" }),
      ]);

      if (dashRes.status === 401) { router.replace("/login"); return; }

      const dash = await dashRes.json();
      const inst = await instRes.json();

      setAccounts(dash.balances ?? []);
      setTransactions(dash.transactions ?? []);
      setMonthlyChart(dash.monthlyChart ?? []);
      setFutureTransactions(dash.futureTransactions ?? []);
      setInstallmentPurchases(inst.purchases ?? []);
      setInstallmentPayments(inst.payments ?? []);
    } catch {
      setError("Could not load dashboard.");
    } finally {
      setCurrentDate(new Date());
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void Promise.resolve().then(load);
  }, [load]);

  if (loading || !currentDate) {
    return (
      <div
        className="flex h-full items-center justify-center text-sm"
        style={{ color: "var(--text-muted)" }}
      >
        Loading...
      </div>
    );
  }

  /* ── derived data ─── */
  const purchaseProgress = new Map<string, { paid: number; total: number }>();
  installmentPayments.forEach((p) => {
    const cur = purchaseProgress.get(p.obligationId) ?? { paid: 0, total: 0 };
    purchaseProgress.set(p.obligationId, {
      paid: cur.paid + (p.status === "paid" ? 1 : 0),
      total: cur.total + 1,
    });
  });

  // Helper
  function daysUntil(dateStr: string, from: Date): number {
    const due = new Date(dateStr);
    const diff = due.getTime() - new Date(from.getFullYear(), from.getMonth(), from.getDate()).getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  // Group transfer_in / transfer_out pairs into single display items
  const groupedRecentTx = (() => {
    const sorted = [...transactions].sort((a, b) =>
      b.transaction_date.localeCompare(a.transaction_date)
    );

    const seen = new Set<string>();
    const result: (Transaction & { paired?: true })[] = [];

    for (const t of sorted) {
      if (seen.has(t.id)) continue;

      if (t.transaction_type === "transfer_out") {
        // Find the matching transfer_in (same date + description)
        const pair = sorted.find(
          (other) =>
            other.transaction_type === "transfer_in" &&
            other.transaction_date === t.transaction_date &&
            other.description === t.description &&
            !seen.has(other.id)
        );
        if (pair) {
          seen.add(t.id);
          seen.add(pair.id);
          result.push({ ...t, paired: true }); // keep the outgoing leg for the label
          continue;
        }
      }

      if (t.transaction_type === "transfer_in") {
        seen.add(t.id); // already consumed above or orphaned — skip
        continue;
      }

      seen.add(t.id);
      result.push(t);
    }

    return result.slice(0, 5);
  })();

  const totalBalance = accounts.reduce((s, a) => s + a.balance_millimes, 0);
  const projectedBalance = futureTransactions.reduce((sum, t) => {
    if (t.transaction_type === "income") return sum + t.amount_millimes;
    if (t.transaction_type === "expense") return sum - t.amount_millimes;
    return sum;
  }, totalBalance);

  const now = currentDate;
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const effectiveCategoryMonth = categoryMonth || thisMonth;

  const lastMonth = (() => {
    const d = new Date(now.getFullYear(), now.getMonth() - 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  })();

  const categoryMonthTx = transactions.filter((t) =>
    t.transaction_date.startsWith(effectiveCategoryMonth)
  );
  const lastMonthTx = transactions.filter((t) =>
    t.transaction_date.startsWith(lastMonth)
  );

  const monthlyIncome = categoryMonthTx
    .filter((t) => t.transaction_type === "income")
    .reduce((s, t) => s + t.amount_millimes, 0);

  const monthlyExpenses = categoryMonthTx
    .filter((t) => t.transaction_type === "expense")
    .reduce((s, t) => s + t.amount_millimes, 0);

  const lastMonthExpenses = lastMonthTx
    .filter((t) => t.transaction_type === "expense")
    .reduce((s, t) => s + t.amount_millimes, 0);

  const expenseDelta =
    lastMonthExpenses === 0
      ? null
      : ((monthlyExpenses - lastMonthExpenses) / lastMonthExpenses) * 100;

  // Monthly bar chart data — last 6 months
  const monthlyChartData = Array.from({ length: 6 }, (_, i) => {
    let year = now.getFullYear();
    let month = now.getMonth() + 1 - (5 - i);
    if (month <= 0) { month += 12; year -= 1; }
    const key = `${year}-${String(month).padStart(2, "0")}`;
    const label = new Date(year, month - 1, 1).toLocaleString("default", { month: "short" });
    const found = monthlyChart.find((m) => m.month === key);
    return {
      month: label,
      income: found?.income ?? 0,
      expenses: found?.expenses ?? 0,
    };
  });

  // Spending by category — this month
  const categoryMap = new Map<string, number>();
  categoryMonthTx
    .filter((t) => t.transaction_type === "expense")
    .forEach((t) => {
      categoryMap.set(t.category, (categoryMap.get(t.category) ?? 0) + t.amount_millimes);
    });

  const categoryMonthExpenses = categoryMonthTx
    .filter((t) => t.transaction_type === "expense")
    .reduce((s, t) => s + t.amount_millimes, 0);

  const categoryData = [...categoryMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([name, value]) => ({ name, value }));

  // Upcoming installments
  const today = thisMonth + "-" + String(now.getDate()).padStart(2, "0");
  const purchaseNames = new Map(installmentPurchases.map((p) => [p.id, p.name]));

  const upcomingInstallments = installmentPayments
    .filter((p) => p.status === "unpaid" && p.dueDate >= today)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    .slice(0, 5);

  const totalInstallmentsRemaining = installmentPayments
    .filter((p) => p.status === "unpaid")
    .reduce((s, p) => s + p.amountMillimes, 0);

  const incomeEntries = categoryMonthTx.filter(
    (t) => t.transaction_type === "income"
  ).length;

  const topCategory = categoryData[0]?.name ?? "";

  const nextInstallment = upcomingInstallments[0] ?? null;

  // Recent 5 transactions
  const recentTx = [...transactions]
    .sort((a, b) => b.transaction_date.localeCompare(a.transaction_date))
    .slice(0, 5);
  
  const monthOptions = Array.from({ length: 6 }, (_, i) => {
    let year = now.getFullYear();
    let month = now.getMonth() + 1 - (5 - i);
    if (month <= 0) { month += 12; year -= 1; }
    const value = `${year}-${String(month).padStart(2, "0")}`;
    const label = new Date(year, month - 1, 1).toLocaleString("default", { month: "long", year: "numeric" });
    return { value, label };
  });

  const futureExpenses = futureTransactions
  .filter((t) => t.transaction_type === "expense")
  .reduce((s, t) => s + t.amount_millimes, 0);

  const futureIncome = futureTransactions
    .filter((t) => t.transaction_type === "income")
    .reduce((s, t) => s + t.amount_millimes, 0);

  const RESERVE_BUFFER = 1_000_000; // 1000 TND in millimes

  const safeToSpend = Math.max(
    0,
    totalBalance
      - totalInstallmentsRemaining
      - futureExpenses
      + futureIncome
      - RESERVE_BUFFER
  );

  return (
    <div className="space-y-8">

      {/* Page title */}
      <div>
        <h1
          className="text-2xl font-bold tracking-tight"
          style={{ color: "var(--text-primary)" }}
        >
          Dashboard
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
          {now.toLocaleDateString("en-TN", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>
      </div>

      {error && <Alert type="error">{error}</Alert>}

      {/* ── Hero balance + top stats ── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <AccountsPanel accounts={accounts} fmt={fmt} />
        <StatsRow
          monthlyIncome={monthlyIncome}
          monthlyExpenses={monthlyExpenses}
          lastMonthExpenses={lastMonthExpenses}
          netThisMonth={monthlyIncome - monthlyExpenses}
          totalInstallmentsRemaining={totalInstallmentsRemaining}
          unpaidCount={installmentPayments.filter((p) => p.status === "unpaid").length}
          safeToSpend={safeToSpend}
          reserveBuffer={RESERVE_BUFFER}
          fmt={fmt} accounts={[]}
          onExport={() => setShowExport(true)}
          incomeEntries={incomeEntries}
          topCategory={topCategory}
          nextInstallmentDate={nextInstallment?.dueDate ?? null}
          nextInstallmentAmount={nextInstallment?.amountMillimes ?? null} 
        />
      </div>
      
      {/* ── Planned transactions ── */}
      <PlannedTransactions
        transactions={futureTransactions}
        totalBalance={totalBalance}
        fmt={fmt}
      />

      {/* ── Charts ── */}
      <div className="grid gap-6 lg:grid-cols-5">

        {/* Income vs Expenses — 3 cols */}
        <div className="surface p-5 lg:col-span-3">
          <SectionHeader
            title="Income vs Expenses"
            sub="Last 6 months"
          />
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={monthlyChartData} barGap={4} barCategoryGap="30%">
              <CartesianGrid
                vertical={false}
                stroke="var(--border)"
                strokeDasharray="3 3"
              />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 12, fill: "var(--text-muted)" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "var(--text-muted)" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => short(v).replace("DT", "").trim()}
                width={55}
              />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--bg-subtle)" }} />
              <Bar
                dataKey="income"
                name="Income"
                fill="var(--chart-1)"
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="expenses"
                name="Expenses"
                fill="var(--chart-4)"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Spending by category — 2 cols */}
        <div className="surface p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between gap-2">
            <h2 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>
              Spending by category
            </h2>
            <select
              value={effectiveCategoryMonth}
              onChange={(e) => setCategoryMonth(e.target.value)}
              className="text-xs rounded-md border px-2 py-1"
              style={{
                background: "var(--bg-surface)",
                color: "var(--text-secondary)",
                borderColor: "var(--border)",
              }}
            >
              {monthOptions.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          {categoryData.length === 0 ? (
            <p className="mt-6 text-center text-sm" style={{ color: "var(--text-muted)" }}>
              No expenses this month.
            </p>
          ) : (
            <div className="mt-2 space-y-3">
              {categoryData.map((cat, i) => {
                const pct = categoryMonthExpenses > 0 ? (cat.value / categoryMonthExpenses) * 100 : 0;
                const colors = [
                  "var(--chart-1)",
                  "var(--chart-2)",
                  "var(--chart-3)",
                  "var(--chart-4)",
                  "var(--chart-5)",
                  "var(--text-muted)",
                ];
                return (
                  <div key={cat.name}>
                    <div className="flex justify-between text-sm mb-1">
                      <span style={{ color: "var(--text-secondary)" }}>{cat.name}</span>
                      <span className="tabular-nums font-medium" style={{ color: "var(--text-primary)" }}>
                        {fmt(cat.value)}
                      </span>
                    </div>
                    <div className="progress-track">
                      <div
                        className="progress-fill"
                        style={{ width: `${pct}%`, background: colors[i % colors.length] }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div> 

      {/* ── Bottom row ── */}
      <div className="grid gap-6 lg:grid-cols-2">

        {/* Recent transactions */}
        <RecentTransactions transactions={transactions} fmt={fmt} />

        {/* Upcoming installments */}
        <div className="surface p-5">
          <div className="mb-4 flex items-center justify-between">
            <SectionHeader
              title="Upcoming installments"
              sub={`${installmentPayments.filter((p) => p.status === "unpaid").length} payments remaining`}
            />
            <a
              href="/installments"
              className="text-xs font-medium"
              style={{ color: "var(--accent)" }}
            >
              View all →
            </a>
          </div>

          {upcomingInstallments.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              No upcoming installment payments.
            </p>
          ) : (
            <div className="divide-y" style={{ borderColor: "var(--border)" }}>
              {upcomingInstallments.map((p) => {
                const progress = purchaseProgress.get(p.obligationId);
                const days = daysUntil(p.dueDate, now);
                const isUrgent = days <= 7;
                const paidPct = progress
                  ? Math.round((progress.paid / progress.total) * 100)
                  : 0;

                return (
                  <div key={p.id} className="flex items-center gap-3 py-3">
                    {/* Mini progress ring */}
                    <div className="relative shrink-0 h-9 w-9">
                      <svg viewBox="0 0 36 36" className="h-9 w-9 -rotate-90">
                        <circle
                          cx="18" cy="18" r="14"
                          fill="none"
                          stroke="var(--border)"
                          strokeWidth="3"
                        />
                        <circle
                          cx="18" cy="18" r="14"
                          fill="none"
                          stroke="var(--chart-1)"
                          strokeWidth="3"
                          strokeDasharray={`${paidPct * 0.88} 88`}
                          strokeLinecap="round"
                        />
                      </svg>
                      <span
                        className="absolute inset-0 flex items-center justify-center text-[9px] font-bold"
                        style={{ color: "var(--text-muted)" }}
                      >
                        {progress?.paid ?? 0}/{progress?.total ?? "?"}
                      </span>
                    </div>

                    {/* Name + due */}
                    <div className="min-w-0 flex-1">
                      <p
                        className="truncate text-sm font-medium"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {purchaseNames.get(p.obligationId) ?? "Purchase"}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                          Payment {p.number} · {p.dueDate}
                        </p>
                        {isUrgent && (
                          <span
                            className="text-[10px] font-semibold rounded-full px-1.5 py-px"
                            style={{
                              background: "color-mix(in srgb, var(--danger) 12%, transparent)",
                              color: "var(--danger)",
                            }}
                          >
                            {days === 0 ? "Today" : `${days}d`}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Amount */}
                    <span
                      className="shrink-0 text-sm font-semibold tabular-nums"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {fmt(p.amountMillimes)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      {showExport && <ExportDialog onClose={() => setShowExport(false)} />}
    </div>
  );
}