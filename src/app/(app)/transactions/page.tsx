"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AddTransactionForm from "@/components/AddTransactionForm";
import TransactionHistory, {
  type HistoryTransaction,
} from "@/components/TransactionHistory";
import { Alert } from "@/components/ui/Alert";
import TransferForm from "@/components/TransferForm";

type Account = {
  id: string;
  name: string;
  account_type: string;
};

export default function TransactionsPage() {
  const router = useRouter();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [editingTransaction, setEditingTransaction] =
    useState<HistoryTransaction | null>(null);
  const [formMode, setFormMode] = useState<"transaction" | "transfer">("transaction");


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

  function handleSaved() {
    setEditingTransaction(null);
    setRefreshKey((key) => key + 1);
    void loadAccounts();
  }

  async function deleteTransaction(id: string) {
    if (
      !window.confirm(
        "Delete this transaction permanently? Your account balances will be recalculated.",
      )
    ) {
      return;
    }

    setError("");

    try {
      const response = await fetch(`/api/transactions/${id}`, {
        method: "DELETE",
      });
      const result = (await response.json()) as { error?: string };

      if (response.status === 401) {
        router.replace("/login");
        return;
      }

      if (!response.ok) {
        throw new Error(result.error ?? "Could not delete the transaction.");
      }

      if (editingTransaction?.id === id) {
        setEditingTransaction(null);
      }

      setRefreshKey((key) => key + 1);
      await loadAccounts();
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Could not delete the transaction.",
      );
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <header>
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>
          Transactions
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
          Record income and expenses, and browse your complete transaction history.
        </p>
      </header>

      {error && <Alert type="error">{error}</Alert>}

      <section className="surface p-5 sm:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
              {editingTransaction ? "Edit transaction" : "Add a transaction"}
            </h2>
            <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
              {editingTransaction
                ? "Update the selected transaction."
                : "Record income, an expense, or a transfer between accounts."}
            </p>
          </div>

          {/* Mode toggle — only show when not editing */}
          {!editingTransaction && (
            <div className="flex gap-1 rounded-lg p-1" style={{ background: "var(--bg-subtle)" }}>
              <button
                type="button"
                onClick={() => setFormMode("transaction")}
                className={`btn btn-sm ${formMode === "transaction" ? "btn-primary" : "btn-ghost"}`}
              >
                Transaction
              </button>
              <button
                type="button"
                onClick={() => setFormMode("transfer")}
                className={`btn btn-sm ${formMode === "transfer" ? "btn-primary" : "btn-ghost"}`}
              >
                Transfer
              </button>
            </div>
          )}

          {editingTransaction && (
            <button type="button" onClick={() => setEditingTransaction(null)} className="btn btn-secondary btn-sm">
              Cancel edit
            </button>
          )}
        </div>

        {loading ? (
          <p className="py-4 text-sm" style={{ color: "var(--text-muted)" }}>Loading accounts...</p>
        ) : formMode === "transfer" ? (
          <TransferForm
            accounts={accounts}
            onTransferred={() => {
              setRefreshKey((k) => k + 1);
              void loadAccounts();
            }}
          />
        ) : (
          <AddTransactionForm
            key={editingTransaction?.id ?? "new"}
            accounts={accounts}
            transaction={editingTransaction ?? undefined}
            onCreated={handleSaved}
          />
        )}
      </section>

      <TransactionHistory
        accounts={accounts}
        refreshKey={refreshKey}
        onEdit={(transaction) => {
          setFormMode("transaction");
          setEditingTransaction(transaction);
          window.scrollTo({ top: 0, behavior: "smooth" });
        }}
        onDelete={(id) => void deleteTransaction(id)}
      />
    </div>
  );
}
