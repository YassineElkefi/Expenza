const CATEGORY_ICONS: Record<string, string> = {
  Food: "🍽️", Transport: "🚗", Shopping: "🛍️", "E-Shopping": "🛒",
  Health: "💊", Housing: "🏠", Entertainment: "🎬", Utilities: "⚡",
  Salary: "💼", Freelance: "💻", Other: "📦", ATM: "🏧",
  Transfer: "🔄", Banking: "🏦", Gaming: "🎮",
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
  fmt: (millimes: number) => string;
};

function groupTransactions(transactions: Transaction[]) {
  const sorted = [...transactions].sort((a, b) =>
    b.transaction_date.localeCompare(a.transaction_date)
  );
  const seen = new Set<string>();
  const result: (Transaction & { paired?: true })[] = [];

  for (const t of sorted) {
    if (seen.has(t.id)) continue;
    if (t.transaction_type === "transfer_out") {
      const pair = sorted.find(
        (o) =>
          o.transaction_type === "transfer_in" &&
          o.transaction_date === t.transaction_date &&
          o.description === t.description &&
          !seen.has(o.id)
      );
      if (pair) {
        seen.add(t.id);
        seen.add(pair.id);
        result.push({ ...t, paired: true });
        continue;
      }
    }
    if (t.transaction_type === "transfer_in") { seen.add(t.id); continue; }
    seen.add(t.id);
    result.push(t);
  }
  return result.slice(0, 5);
}

export function RecentTransactions({ transactions, fmt }: Props) {
  const grouped = groupTransactions(transactions);

  return (
    <div className="surface p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>
            Recent transactions
          </h2>
        </div>
        <a href="/transactions" className="text-xs font-medium" style={{ color: "var(--accent)" }}>
          View all →
        </a>
      </div>

      {grouped.length === 0 ? (
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>No transactions yet.</p>
      ) : (
        <div className="divide-y" style={{ borderColor: "var(--border)" }}>
          {grouped.map((t) => {
            const isIncome = t.transaction_type === "income";
            const isTransfer = t.transaction_type === "transfer_out" || t.transaction_type === "transfer_in";
            const icon = isTransfer ? "🔄" : (CATEGORY_ICONS[t.category] ?? "📦");
            const dateLabel = new Date(t.transaction_date).toLocaleDateString("en-TN", {
              month: "short", day: "numeric",
            });

            return (
              <div key={t.id} className="flex items-center gap-3 py-3">
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-base"
                  style={{ background: "var(--bg-subtle)" }}
                >
                  {icon}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                    {t.description || t.category}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                    {isTransfer ? "Transfer" : t.category} · {dateLabel}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  {isTransfer ? (
                    <span className="text-sm font-semibold tabular-nums" style={{ color: "var(--text-muted)" }}>
                      {fmt(t.amount_millimes)}
                    </span>
                  ) : (
                    <span
                      className="text-sm font-semibold tabular-nums"
                      style={{ color: isIncome ? "var(--success)" : "var(--danger)" }}
                    >
                      {isIncome ? "+" : "−"}{fmt(t.amount_millimes)}
                    </span>
                  )}
                  <span
                    className="text-[10px] font-medium rounded-full px-1.5 py-0.5 capitalize"
                    style={{
                      background: "color-mix(in srgb, var(--text-muted) 12%, transparent)",
                      color: isTransfer ? "var(--text-muted)" : isIncome ? "var(--success)" : "var(--danger)",
                    }}
                  >
                    {isTransfer ? "transfer" : t.transaction_type}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}