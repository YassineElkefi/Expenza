type Account = {
  id: string;
  name: string;
  account_type: string;
  balance_millimes: number;
};

type Props = {
  accounts: Account[];
  fmt: (millimes: number) => string;
};

export function AccountsPanel({ accounts, fmt }: Props) {
  const total = accounts.reduce((s, a) => s + a.balance_millimes, 0);

  return (
    <div
      className="surface sm:col-span-2 p-6"
      style={{
        background:
          "linear-gradient(135deg, color-mix(in srgb, var(--accent) 8%, var(--bg-surface)), var(--bg-surface))",
      }}
    >
      <p className="label">Total balance</p>
      <p className="stat-value-lg mt-3">{fmt(total)}</p>
      <p className="mt-2 text-sm" style={{ color: "var(--text-secondary)" }}>
        Across {accounts.length} account{accounts.length !== 1 ? "s" : ""}
      </p>

      {accounts.length > 0 && (
        <div className="mt-4 space-y-1.5">
          {accounts.map((a) => (
            <div key={a.id} className="flex justify-between text-sm">
              <span style={{ color: "var(--text-secondary)" }}>{a.name}</span>
              <span
                className="font-medium tabular-nums"
                style={{ color: "var(--text-primary)" }}
              >
                {fmt(a.balance_millimes)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}