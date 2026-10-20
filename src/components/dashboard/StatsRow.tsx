import {
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  Minus,
  CreditCard,
  ShieldCheck,
  Download,
} from "lucide-react";

type Props = {
  accounts: { id: string; name: string; balance_millimes: number }[];
  monthlyIncome: number;
  monthlyExpenses: number;
  lastMonthExpenses: number;
  netThisMonth: number;
  totalInstallmentsRemaining: number;
  unpaidCount: number;
  safeToSpend: number;
  reserveBuffer: number;
  fmt: (millimes: number) => string;
  onExport: () => void;
  incomeEntries: number;
  topCategory: string;
  nextInstallmentDate: string | null;
  nextInstallmentAmount: number | null;
};

function ProgressBar({ pct, color = "var(--accent)" }: { pct: number; color?: string }) {
  return (
    <div className="progress-track mt-2">
      <div
        className="progress-fill"
        style={{ width: `${Math.min(100, Math.max(0, pct))}%`, background: color }}
      />
    </div>
  );
}

export function StatsRow({
  accounts,
  monthlyIncome, monthlyExpenses, lastMonthExpenses,
  netThisMonth, totalInstallmentsRemaining, unpaidCount,
  safeToSpend, reserveBuffer, fmt, onExport,
  incomeEntries, topCategory,
  nextInstallmentDate, nextInstallmentAmount,
}: Props) {
  const expenseDelta =
    lastMonthExpenses === 0
      ? null
      : ((monthlyExpenses - lastMonthExpenses) / lastMonthExpenses) * 100;

  const daysInMonth = new Date(
    new Date().getFullYear(),
    new Date().getMonth() + 1,
    0
  ).getDate();
  const dayOfMonth = new Date().getDate();
  const dailyAvg = dayOfMonth > 0 ? monthlyExpenses / dayOfMonth : 0;

  const incomeRetainedPct =
    monthlyIncome > 0 ? (netThisMonth / monthlyIncome) * 100 : 0;

  const monthProgressPct = (dayOfMonth / daysInMonth) * 100;

  return (
    <>
      {/* Income */}
      <div className="surface p-5">
        <p className="label">Income this month</p>
        <p className="stat-value mt-3" style={{ color: "var(--success)" }}>
          {fmt(monthlyIncome)}
        </p>
        <div className="mt-3 space-y-1.5 text-xs" style={{ color: "var(--text-muted)" }}>
          <div className="flex justify-between">
            <span>Income entries</span>
            <span className="font-medium" style={{ color: "var(--text-primary)" }}>
              {incomeEntries}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Month progress</span>
            <span className="font-medium" style={{ color: "var(--text-primary)" }}>
              {Math.round(monthProgressPct)}%
            </span>
          </div>
        </div>
        <ProgressBar pct={monthProgressPct} color="var(--success)" />
      </div>

      {/* Expenses */}
      <div className="surface p-5">
        <p className="label">Expenses this month</p>
        <p className="stat-value mt-3" style={{ color: "var(--danger)" }}>
          {fmt(monthlyExpenses)}
        </p>
        {expenseDelta !== null && (
          <div
            className="mt-2 flex items-center gap-1.5 text-xs font-medium"
            style={{ color: expenseDelta < 0 ? "var(--success)" : "var(--danger)" }}
          >
            {expenseDelta < 0
              ? <TrendingDown size={13} />
              : <ArrowUpRight size={13} />
            }
            <span>
              {Math.abs(expenseDelta).toFixed(0)}%{" "}
              {expenseDelta < 0 ? "less" : "more"} than last month
            </span>
          </div>
        )}
        <div className="mt-3 space-y-1.5 text-xs" style={{ color: "var(--text-muted)" }}>
          <div className="flex justify-between">
            <span>Daily average</span>
            <span className="font-medium tabular-nums" style={{ color: "var(--text-primary)" }}>
              {fmt(dailyAvg)}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Largest category</span>
            <span className="font-medium" style={{ color: "var(--text-primary)" }}>
              {topCategory || "—"}
            </span>
          </div>
        </div>
      </div>

      {/* Net */}
      <div className="surface p-5">
        <p className="label">Net this month</p>
        <p
          className="stat-value mt-3"
          style={{ color: netThisMonth >= 0 ? "var(--success)" : "var(--danger)" }}
        >
          {netThisMonth >= 0 ? "+" : ""}{fmt(netThisMonth)}
        </p>
        <div className="mt-3 space-y-1.5 text-xs" style={{ color: "var(--text-muted)" }}>
          <div className="flex justify-between">
            <span>Income retained</span>
            <span className="font-medium tabular-nums" style={{ color: "var(--text-primary)" }}>
              {incomeRetainedPct > 0 ? incomeRetainedPct.toFixed(1) : "0"}%
            </span>
          </div>
          <div className="flex justify-between">
            <span>Income - Expenses</span>
            <span className="font-medium tabular-nums" style={{ color: "var(--text-secondary)" }}>
              {fmt(monthlyIncome)} − {fmt(monthlyExpenses)}
            </span>
          </div>
        </div>
        <ProgressBar
          pct={Math.max(0, incomeRetainedPct)}
          color={incomeRetainedPct >= 20 ? "var(--success)" : "var(--danger)"}
        />
      </div>

      {/* Installments */}
      <div className="surface p-5">
        <p className="label">Installments remaining</p>
        <p className="stat-value mt-3" style={{ color: "var(--warning)" }}>
          {fmt(totalInstallmentsRemaining)}
        </p>
        <div className="mt-3 space-y-1.5 text-xs" style={{ color: "var(--text-muted)" }}>
          <div className="flex justify-between">
            <span>Unpaid payments</span>
            <span className="font-medium" style={{ color: "var(--text-primary)" }}>
              {unpaidCount}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Next due</span>
            <span className="font-medium tabular-nums" style={{ color: "var(--text-primary)" }}>
              {nextInstallmentDate ?? "—"}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Next payment</span>
            <span className="font-medium tabular-nums" style={{ color: "var(--text-primary)" }}>
              {nextInstallmentAmount != null ? fmt(nextInstallmentAmount) : "—"}
            </span>
          </div>
        </div>
      </div>

      {/* Safe to spend */}
      <div className="surface p-5">
        <p className="label">Safe to spend</p>
        <p
          className="stat-value mt-3"
          style={{
            color:
              safeToSpend > 1_000_000
                ? "var(--success)"
                : safeToSpend > 500_000
                ? "var(--warning)"
                : "var(--danger)",
          }}
        >
          {fmt(safeToSpend)}
        </p>
        <div
          className="mt-2 flex items-center gap-1.5 text-xs font-medium"
          style={{ color: "var(--success)" }}
        >
          <ShieldCheck size={13} />
          <span>Reserve protected</span>
        </div>
        <div className="mt-2 space-y-1.5 text-xs" style={{ color: "var(--text-muted)" }}>
          <div className="flex justify-between">
            <span>Reserve buffer</span>
            <span className="font-medium tabular-nums" style={{ color: "var(--text-primary)" }}>
              {fmt(reserveBuffer)}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Available accounts</span>
            <span className="font-medium" style={{ color: "var(--text-primary)" }}>
              {accounts.length}
            </span>
          </div>
        </div>
      </div>

      {/* Export */}
      <div className="surface p-5 flex flex-col justify-between">
        <div>
          <p className="label">Export</p>
          <p className="mt-3 stat-value" style={{ color: "var(--text-primary)" }}>JSON</p>
          <p className="mt-1.5 text-xs" style={{ color: "var(--text-muted)" }}>
            Accounts · Transactions · Installments
          </p>
        </div>
        <button
          onClick={onExport}
          className="mt-5 w-full rounded-md py-2 text-sm font-medium transition-opacity hover:opacity-80 flex items-center justify-center gap-2"
          style={{ background: "var(--accent)", color: "#fff" }}
        >
          <Download size={14} />
          Export data
        </button>
      </div>
    </>
  );
}