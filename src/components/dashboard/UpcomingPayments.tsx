import { Card } from "@/components/ui/Card";
import { money } from "@/lib/money";

type ProjectionItem = {
  date: string;
  incomeMillimes: number;
  expenseMillimes: number;
  labels: string[];
  projectedBalance: number;
};

type Props = {
  projection: ProjectionItem[];
  totalBalance: number;
};

function formatDueDate(dateString: string) {
  const [year, month, day] = dateString.split("-");
  return `${day}/${month}/${year}`;
}

export function UpcomingPayments({ projection, totalBalance }: Props) {
  return (
    <Card>
      <div>
        <h2 className="text-lg font-semibold">
          Future payments & projected balance
        </h2>
        <p className="mt-1 text-sm text-slate-400">
          Estimated balance after scheduled payments, assuming no additional
          income, spending, or transfers.
        </p>
      </div>

      <div className="mt-5 space-y-3">
        {projection.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-700 py-8 text-center">
            <p className="text-sm text-slate-400">No upcoming unpaid payments.</p>
            <p className="mt-1 text-sm text-slate-500">
              Current balance:{" "}
              <span className="font-semibold text-white">
                {money(totalBalance)}
              </span>
            </p>
          </div>
        ) : (
          projection.map((item) => (
            <article
              key={item.date}
              className="rounded-xl border border-slate-800 p-4 transition-colors hover:border-slate-700"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-2">
                  <p className="font-semibold">{formatDueDate(item.date)}</p>

                  <p className="text-sm text-slate-400 leading-relaxed">
                    {item.labels.join(", ")}
                  </p>

                  <div className="flex flex-wrap gap-4 pt-1">
                    {item.incomeMillimes > 0 && (
                      <div>
                        <p className="text-xs text-slate-500">Planned income</p>
                        <p className="text-sm font-medium text-emerald-400">
                          +{money(item.incomeMillimes)}
                        </p>
                      </div>
                    )}
                    {item.expenseMillimes > 0 && (
                      <div>
                        <p className="text-xs text-slate-500">Planned expenses</p>
                        <p className="text-sm font-medium text-rose-400">
                          −{money(item.expenseMillimes)}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-xs text-slate-500">Projected balance</p>
                  <p
                    className={`mt-1 text-xl font-bold tabular-nums ${
                      item.projectedBalance < 0
                        ? "text-rose-400"
                        : "text-emerald-400"
                    }`}
                  >
                    {money(item.projectedBalance)}
                  </p>
                  {item.projectedBalance < 0 && (
                    <p className="mt-1 text-xs text-rose-400/70">
                      Insufficient funds
                    </p>
                  )}
                </div>
              </div>
            </article>
          ))
        )}
      </div>
    </Card>
  );
}