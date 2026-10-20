import { Card } from "@/components/ui/Card";
import { money } from "@/lib/money";

type Transaction = {
  id: string;
  account_id: string;
  transaction_type: string;
  amount_millimes: number;
  category: string;
  description: string;
  transaction_date: string;
};

type Props = {
  transactions: Transaction[];
  onEdit: (transaction: Transaction) => void;
  onDelete: (id: string) => void;
};

export function RecentTransactions({ transactions, onEdit, onDelete }: Props) {
  return (
    <Card>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Recent transactions</h2>
        {transactions.length > 0 && (
          <span className="text-xs text-slate-500">Latest {transactions.length}</span>
        )}
      </div>

      <div className="mt-4 space-y-1">
        {transactions.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-400">
            No transactions recorded yet.
          </p>
        ) : (
          transactions.map((transaction) => (
            <div
              key={transaction.id}
              className="flex items-center justify-between gap-3 rounded-xl px-3 py-3 transition-colors hover:bg-slate-800/50"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">
                  {transaction.description || transaction.category}
                </p>
                <p className="text-sm text-slate-400">
                  {transaction.category} · {transaction.transaction_date}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <p
                  className={`tabular-nums font-semibold ${
                    transaction.transaction_type === "income"
                      ? "text-emerald-400"
                      : "text-rose-400"
                  }`}
                >
                  {transaction.transaction_type === "income" ? "+" : "−"}
                  {money(transaction.amount_millimes)}
                </p>

                <button
                  type="button"
                  onClick={() => onEdit(transaction)}
                  className="rounded-md border border-slate-700 px-2 py-1 text-xs hover:bg-slate-800 transition-colors"
                  aria-label={`Edit ${transaction.description || transaction.category}`}
                >
                  Edit
                </button>

                <button
                  type="button"
                  onClick={() => onDelete(transaction.id)}
                  className="rounded-md border border-red-900 px-2 py-1 text-xs text-red-400 hover:bg-red-950 transition-colors"
                  aria-label={`Delete ${transaction.description || transaction.category}`}
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}