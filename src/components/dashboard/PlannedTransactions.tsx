import {
  Utensils,
  Car,
  ShoppingBag,
  ShoppingCart,
  Pill,
  House,
  Clapperboard,
  Zap,
  BriefcaseBusiness,
  Laptop,
  Package,
  Landmark,
  ArrowLeftRight,
  Gamepad2,
  type LucideIcon,
  CreditCardReader,
  Groceries,
  CalendarClock,
} from "lucide-react";

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  Food: Utensils,
  Transport: Car,
  Shopping: ShoppingBag,
  "E-Shopping": CreditCardReader,
  Health: Pill,
  Housing: House,
  Entertainment: Clapperboard,
  Utilities: Zap,
  Salary: BriefcaseBusiness,
  Freelance: Laptop,
  Other: Package,
  ATM: Landmark,
  Transfer: ArrowLeftRight,
  Banking: Landmark,
  Gaming: Gamepad2,
  Groceries: Groceries,
  "Installment payment": CalendarClock,
};

type Transaction = {
  id: string;
  transaction_type: string;
  amount_millimes: number;
  category: string;
  description: string;
  transaction_date: string;
};

type Props = {
  transactions: Transaction[];
  totalBalance: number;
  fmt: (millimes: number) => string;
};

export function PlannedTransactions({ transactions, totalBalance, fmt }: Props) {
  if (transactions.length === 0) return null;

  const sorted = [...transactions].sort((a, b) =>
    a.transaction_date.localeCompare(b.transaction_date)
  );

  let running = totalBalance;
  const withRunning = sorted.map((t) => {
    if (t.transaction_type === "income") running += t.amount_millimes;
    else if (t.transaction_type === "expense") running -= t.amount_millimes;
    return { ...t, runningBalance: running };
  });

  const projectedBalance = running;

  return (
    <div className="surface p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>
            Planned transactions
          </h2>
          <p className="mt-0.5 text-sm" style={{ color: "var(--text-secondary)" }}>
            {transactions.length} upcoming · projected balance: {fmt(projectedBalance)}
          </p>
        </div>
      </div>

      <div className="divide-y" style={{ borderColor: "var(--border)" }}>
        {withRunning.slice(0, 5).map((t) => {
          const isIncome = t.transaction_type === "income";
          const Icon = CATEGORY_ICONS[t.category] ?? Package;
          return (
            <div key={t.id} className="flex items-center gap-3 py-3">
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                style={{
                  background: "var(--bg-subtle)",
                  color: "var(--text-muted)",
                }}
              >
                <Icon size={18} strokeWidth={1.8} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                  {t.description || t.category}
                </p>
                <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                  {t.category} · {t.transaction_date}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                <span
                  className="text-sm font-semibold tabular-nums"
                  style={{ color: isIncome ? "var(--success)" : "var(--danger)" }}
                >
                  {isIncome ? "+" : "−"}{fmt(t.amount_millimes)}
                </span>
                <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                  → {fmt(t.runningBalance)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}