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
};

function StatCard({
  label, value, sub, accent,
}: {
  label: string; value: string; sub?: string;
  accent?: "green" | "red" | "amber";
}) {
  const valueColor =
    accent === "green" ? "var(--success)" :
    accent === "red"   ? "var(--danger)"  :
    accent === "amber" ? "var(--warning)" :
    "var(--text-primary)";

  return (
    <div className="surface p-5">
      <p className="label">{label}</p>
      <p className="stat-value mt-3" style={{ color: valueColor }}>{value}</p>
      {sub && <p className="mt-1.5 text-xs" style={{ color: "var(--text-muted)" }}>{sub}</p>}
    </div>
  );
}

export function StatsRow({
  monthlyIncome, monthlyExpenses, lastMonthExpenses,
  netThisMonth, totalInstallmentsRemaining, unpaidCount,
  safeToSpend, reserveBuffer, fmt,
}: Props) {
  const expenseDelta =
    lastMonthExpenses === 0
      ? null
      : ((monthlyExpenses - lastMonthExpenses) / lastMonthExpenses) * 100;

  return (
    <>
      <StatCard label="Income this month" value={fmt(monthlyIncome)} accent="green" />
      <StatCard
        label="Expenses this month"
        value={fmt(monthlyExpenses)}
        sub={expenseDelta !== null
          ? `${expenseDelta > 0 ? "+" : ""}${expenseDelta.toFixed(0)}% vs last month`
          : undefined}
        accent="red"
      />
      <StatCard
        label="Net this month"
        value={fmt(netThisMonth)}
        accent={netThisMonth >= 0 ? "green" : "red"}
      />
      <StatCard
        label="Installments remaining"
        value={fmt(totalInstallmentsRemaining)}
        sub={`${unpaidCount} payment${unpaidCount !== 1 ? "s" : ""} left`}
        accent="amber"
      />
      <StatCard
        label="Safe to spend"
        value={fmt(safeToSpend)}
        sub={`${fmt(reserveBuffer)} buffer reserved`}
        accent={safeToSpend > 1_000_000 ? "green" : safeToSpend > 500_000 ? "amber" : "red"}
      />
    </>
  );
}