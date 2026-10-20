import { StatCard } from "@/components/ui/StatCard";
import { money } from "@/lib/money";

type Props = {
  totalBalance: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  safeToSpend: number;
  reservedPayments: number;
  upcomingCount: number;
};

export function StatsRow({
  totalBalance,
  monthlyIncome,
  monthlyExpenses,
  safeToSpend,
  reservedPayments,
  upcomingCount,
}: Props) {
  return (
    <section className="space-y-4">
      {/* Hero stat */}
      <div className="rounded-2xl border border-emerald-900/60 bg-gradient-to-br from-emerald-950/60 to-slate-900 p-6">
        <p className="text-sm font-medium text-emerald-400">Total balance</p>
        <p className="mt-2 text-5xl font-bold tracking-tight">
          {money(totalBalance)}
        </p>
        <p className="mt-1 text-sm text-slate-400">
          Across all accounts
        </p>
      </div>

      {/* Secondary stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Income this month"
          value={money(monthlyIncome)}
          accent="emerald"
        />
        <StatCard
          label="Expenses this month"
          value={money(monthlyExpenses)}
          accent="red"
        />
        <StatCard
          label="Safe to spend"
          value={money(safeToSpend)}
          accent={safeToSpend < 0 ? "red" : "emerald"}
          sub="After upcoming reservations"
        />
        <StatCard
          label="Reserved for payments"
          value={money(reservedPayments)}
          accent="amber"
          sub={`${upcomingCount} payment${upcomingCount === 1 ? "" : "s"} due`}
        />
      </div>
    </section>
  );
}