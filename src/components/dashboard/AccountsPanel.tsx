import { Card } from "@/components/ui/Card";
import { money } from "@/lib/money";

type Account = {
  id: string;
  name: string;
  account_type: string;
  balance: number;
};

type Props = {
  accounts: Account[];
};

const typeLabel: Record<string, string> = {
  bank: "Bank account",
  cash: "Cash wallet",
  savings: "Savings",
  other: "Other",
};

export function AccountsPanel({ accounts }: Props) {
  return (
    <Card>
      <h2 className="text-lg font-semibold">Your accounts</h2>

      <div className="mt-4 space-y-1">
        {accounts.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-400">
            No accounts yet. Add one using the form above.
          </p>
        ) : (
          accounts.map((account) => (
            <div
              key={account.id}
              className="flex items-center justify-between gap-4 rounded-xl px-3 py-3 transition-colors hover:bg-slate-800/50"
            >
              <div className="min-w-0">
                <p className="truncate font-medium">{account.name}</p>
                <p className="text-sm text-slate-400">
                  {typeLabel[account.account_type] ?? account.account_type}
                </p>
              </div>
              <p
                className={`shrink-0 font-semibold tabular-nums ${
                  account.balance < 0 ? "text-rose-400" : "text-white"
                }`}
              >
                {money(account.balance)}
              </p>
            </div>
          ))
        )}
      </div>

      {accounts.length > 0 && (
        <div className="mt-3 flex items-center justify-between border-t border-slate-800 pt-3 px-3">
          <p className="text-sm text-slate-400">Total</p>
          <p className="font-bold tabular-nums">
            {money(accounts.reduce((sum, a) => sum + a.balance, 0))}
          </p>
        </div>
      )}
    </Card>
  );
}