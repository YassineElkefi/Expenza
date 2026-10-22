"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AddAccountForm from "@/components/AddAccountForm";
import { Alert } from "@/components/ui/Alert";
import { money } from "@/lib/money";

type Account = {
  id: string;
  name: string;
  account_type: string;
  opening_balance_millimes: number;
  income_millimes: number;
  expense_millimes: number;
  balance_millimes: number;
};

const accountTypeLabels: Record<string, string> = {
  bank: "Bank account",
  cash: "Cash wallet",
  savings: "Savings",
  other: "Other",
};

export default function AccountsPage() {
  const router = useRouter();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadAccounts = useCallback(async () => {
    try {
      setError("");
      const response = await fetch("/api/dashboard", { cache: "no-store" });

      if (response.status === 401) {
        router.replace("/login");
        return;
      }

      const result = (await response.json()) as {
        balances?: Account[];
        error?: string;
      };

      if (!response.ok) {
        throw new Error(result.error ?? "Could not load your accounts.");
      }

      setAccounts(result.balances ?? []);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Could not load your accounts.",
      );
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void Promise.resolve().then(loadAccounts);
  }, [loadAccounts]);

  const totalBalance = accounts.reduce(
    (total, account) => total + account.balance_millimes,
    0,
  );

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <header>
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>
          Accounts
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
          Manage the places where you keep your money.
        </p>
      </header>

      {error && <Alert type="error">{error}</Alert>}

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(18rem,1fr)]">
        <div className="surface p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
                Your accounts
              </h2>
              <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
                {accounts.length} account{accounts.length === 1 ? "" : "s"}
              </p>
            </div>
            <div className="text-right">
              <p className="label">Combined balance</p>
              <p className="mt-1 text-lg font-semibold tabular-nums" style={{ color: "var(--text-primary)" }}>
                {money(totalBalance)}
              </p>
            </div>
          </div>

          {loading ? (
            <p className="py-10 text-center text-sm" style={{ color: "var(--text-muted)" }}>
              Loading accounts...
            </p>
          ) : accounts.length === 0 ? (
            <p className="py-10 text-center text-sm" style={{ color: "var(--text-muted)" }}>
              No accounts yet. Add your first account to start tracking your finances.
            </p>
          ) : (
            <div className="mt-4 divide-y" style={{ borderColor: "var(--border)" }}>
              {accounts.map((account) => (
                <article key={account.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
                  <div className="min-w-0">
                    <h3 className="truncate font-medium" style={{ color: "var(--text-primary)" }}>
                      {account.name}
                    </h3>
                    <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
                      {accountTypeLabels[account.account_type] ?? account.account_type}
                    </p>
                  </div>
                  <p
                    className="shrink-0 text-base font-semibold tabular-nums"
                    style={{ color: account.balance_millimes < 0 ? "var(--danger)" : "var(--text-primary)" }}
                  >
                    {money(account.balance_millimes)}
                  </p>
                </article>
              ))}
            </div>
          )}
        </div>

        <section className="surface p-5 sm:p-6">
          <h2 className="mb-4 text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
            Add an account
          </h2>
          <AddAccountForm onCreated={() => void loadAccounts()} />
        </section>
      </section>
    </div>
  );
}
