
"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Account = {
  id: string;
  name: string;
  account_type: string;
};

type Purchase = {
  id: string;
  name: string;
  accountId: string;
  totalAmountMillimes: number;
  installmentCount: number;
  active: boolean;
};

type Payment = {
  id: string;
  obligationId: string;
  number: number;
  amountMillimes: number;
  dueDate: string;
  status: "unpaid" | "processing" | "paid";
  paidAt: string | null;
};

type NewPaymentRow = {
  amount: string;
};

type EditPaymentRow = {
  id: string;
  number: number;
  amount: string;
  dueDate: string;
  status: Payment["status"];
};

const money = (millimes: number) =>
  new Intl.NumberFormat("fr-TN", {
    style: "currency",
    currency: "TND",
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  }).format(millimes / 1000);

function toMillimes(value: string): number {
  return Math.round(Number(value) * 1000);
}

function addMonths(dateString: string, months: number): string {
  const [year, month, day] = dateString.split("-").map(Number);
  const targetMonth = month - 1 + months;
  const targetYear = year + Math.floor(targetMonth / 12);
  const normalizedMonth = ((targetMonth % 12) + 12) % 12;
  const lastDay = new Date(
    Date.UTC(targetYear, normalizedMonth + 1, 0)
  ).getUTCDate();

  return [
    targetYear,
    String(normalizedMonth + 1).padStart(2, "0"),
    String(Math.min(day, lastDay)).padStart(2, "0"),
  ].join("-");
}

export default function InstallmentsPage() {
  const router = useRouter();

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [payingId, setPayingId] = useState("");
  const [deletingId, setDeletingId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [accountId, setAccountId] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [firstDueDate, setFirstDueDate] = useState("");
  const [newRows, setNewRows] = useState<NewPaymentRow[]>([
    { amount: "" },
    { amount: "" },
  ]);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editAccountId, setEditAccountId] = useState("");
  const [editRows, setEditRows] = useState<EditPaymentRow[]>([]);
  const [editSaving, setEditSaving] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setError("");

      const [dashboardResponse, installmentResponse] = await Promise.all([
        fetch("/api/dashboard", { cache: "no-store" }),
        fetch("/api/obligations", { cache: "no-store" }),
      ]);

      if (
        dashboardResponse.status === 401 ||
        installmentResponse.status === 401
      ) {
        router.replace("/login");
        return;
      }

      const dashboard = await dashboardResponse.json();
      const installmentData = await installmentResponse.json();

      if (!dashboardResponse.ok) {
        throw new Error(dashboard.error ?? "Could not load accounts.");
      }

      if (!installmentResponse.ok) {
        throw new Error(
          installmentData.error ?? "Could not load installments."
        );
      }

      const loadedAccounts: Account[] =
        dashboard.balances ?? dashboard.accounts ?? [];

      setAccounts(loadedAccounts);
      setPurchases(installmentData.purchases ?? []);
      setPayments(installmentData.payments ?? []);
      setAccountId((current) => current || loadedAccounts[0]?.id || "");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not load installment purchases."
      );
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const newRowsTotal = newRows.reduce(
    (sum, row) => sum + (row.amount.trim() ? toMillimes(row.amount) : 0),
    0
  );

  const editRowsTotal = editRows.reduce(
    (sum, row) => sum + (row.amount.trim() ? toMillimes(row.amount) : 0),
    0
  );

  function updateNewRow(index: number, amount: string) {
    setNewRows((current) =>
      current.map((row, i) => (i === index ? { amount } : row))
    );
  }

  function updateEditRow(
    index: number,
    field: "amount" | "dueDate",
    value: string
  ) {
    setEditRows((current) =>
      current.map((row, i) =>
        i === index && row.status === "unpaid"
          ? { ...row, [field]: value }
          : row
      )
    );
  }

  async function createPurchase(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");

    if (!name.trim() || !accountId || !firstDueDate) {
      setError("Complete all purchase details.");
      return;
    }

    if (newRows.length < 2 || newRows.length > 120) {
      setError("A purchase must have between 2 and 120 installments.");
      return;
    }

    const amounts = newRows.map((row) => toMillimes(row.amount));
    const expectedTotal = toMillimes(totalAmount);

    if (
      !Number.isSafeInteger(expectedTotal) ||
      expectedTotal <= 0 ||
      amounts.some((amount) => !Number.isSafeInteger(amount) || amount <= 0)
    ) {
      setError("Enter a valid positive amount for the total and every installment.");
      return;
    }

    const calculatedTotal = amounts.reduce((sum, amount) => sum + amount, 0);

    if (
      !Number.isSafeInteger(calculatedTotal) ||
      calculatedTotal !== expectedTotal
    ) {
      setError(
        `Your installments total ${money(calculatedTotal)}, but the purchase total is ${money(expectedTotal)}. Make the amounts match.`
      );
      return;
    }

    const customPayments = amounts.map((amountMillimes, index) => ({
      amountMillimes,
      dueDate: addMonths(firstDueDate, index),
    }));

    setSaving(true);

    try {
      const response = await fetch("/api/obligations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          accountId,
          totalAmountMillimes: expectedTotal,
          installmentCount: newRows.length,
          firstDueDate,
          payments: customPayments,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ?? "Could not create installment purchase."
        );
      }

      setName("");
      setTotalAmount("");
      setFirstDueDate("");
      setNewRows([{ amount: "" }, { amount: "" }]);
      setNotice("Installment purchase created successfully.");
      await loadData();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not create installment purchase."
      );
    } finally {
      setSaving(false);
    }
  }

  function startEditing(purchase: Purchase) {
    const purchasePayments = payments
      .filter((payment) => payment.obligationId === purchase.id)
      .sort((a, b) => a.number - b.number);

    setEditingId(purchase.id);
    setEditName(purchase.name);
    setEditAccountId(purchase.accountId);
    setEditRows(
      purchasePayments.map((payment) => ({
        id: payment.id,
        number: payment.number,
        amount: (payment.amountMillimes / 1000).toFixed(3),
        dueDate: payment.dueDate,
        status: payment.status,
      }))
    );
    setError("");
    setNotice("");
    setExpandedId(purchase.id);
  }

  async function saveEdit(purchase: Purchase) {
    setError("");
    setNotice("");

    if (!editName.trim() || !editAccountId) {
      setError("Enter a purchase name and select an account.");
      return;
    }

    if (
      editRows.some(
        (row) =>
          !Number.isSafeInteger(toMillimes(row.amount)) ||
          toMillimes(row.amount) <= 0 ||
          !row.dueDate
      )
    ) {
      setError("Enter a valid amount and due date for every installment.");
      return;
    }

    if (
      editRows.some(
        (row) => row.status === "processing"
      )
    ) {
      setError("A payment is being processed. Refresh before editing.");
      return;
    }

    const submittedTotal = editRows.reduce(
      (sum, row) => sum + toMillimes(row.amount),
      0
    );

    if (!Number.isSafeInteger(submittedTotal) || submittedTotal <= 0) {
      setError("The purchase total is invalid.");
      return;
    }

    setEditSaving(true);

    try {
      const response = await fetch(`/api/obligations/${purchase.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName.trim(),
          accountId: editAccountId,
          totalAmountMillimes: submittedTotal,
          payments: editRows.map((row) => ({
            id: row.id,
            amountMillimes: toMillimes(row.amount),
            dueDate: row.dueDate,
          })),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error ?? "Could not update this purchase.");
      }

      setEditingId(null);
      setNotice("Purchase updated successfully.");
      await loadData();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not update this purchase."
      );
    } finally {
      setEditSaving(false);
    }
  }

  async function deletePurchase(purchase: Purchase) {
    const purchasePayments = payments.filter(
      (payment) => payment.obligationId === purchase.id
    );

    const hasPaid = purchasePayments.some(
      (payment) => payment.status === "paid"
    );

    const hasProcessing = purchasePayments.some(
      (payment) => payment.status === "processing"
    );

    if (hasPaid || hasProcessing) {
      setError(
        hasPaid
          ? "This purchase has paid installments. Deletion is disabled to protect your financial history."
          : "A payment is being processed. Try again after it finishes."
      );
      return;
    }

    const confirmed = window.confirm(
      `Delete "${purchase.name}" and its ${purchasePayments.length} scheduled installments? This cannot be undone.`
    );

    if (!confirmed) return;

    setDeletingId(purchase.id);
    setError("");
    setNotice("");

    try {
      const response = await fetch(`/api/obligations/${purchase.id}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error ?? "Could not delete this purchase.");
      }

      if (editingId === purchase.id) {
        setEditingId(null);
      }

      setNotice("Purchase deleted successfully.");
      await loadData();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not delete this purchase."
      );
    } finally {
      setDeletingId("");
    }
  }

  async function markPaid(purchase: Purchase, payment: Payment) {
    const confirmed = window.confirm(
      `Mark installment ${payment.number} of "${purchase.name}" as paid for ${money(payment.amountMillimes)}? This will record an expense in your account.`
    );

    if (!confirmed) return;

    setPayingId(payment.id);
    setError("");
    setNotice("");

    try {
      const response = await fetch(
        `/api/obligations/${purchase.id}/payments/${payment.id}`,
        { method: "PATCH" }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ?? "Could not mark the installment as paid."
        );
      }

      setNotice(
        result.completed
          ? "Payment recorded. This purchase is now fully paid."
          : "Payment recorded successfully."
      );

      await loadData();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not mark the installment as paid."
      );
    } finally {
      setPayingId("");
    }
  }

  const unpaidPayments = payments.filter(
    (payment) => payment.status === "unpaid"
  );

  const remainingAmount = unpaidPayments.reduce(
    (sum, payment) => sum + payment.amountMillimes,
    0
  );

  const paidAmount = payments
    .filter((payment) => payment.status === "paid")
    .reduce((sum, payment) => sum + payment.amountMillimes, 0);

  const activePurchases = purchases.filter((purchase) => purchase.active);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-300">
        Loading installments...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 p-4 text-white sm:p-8">
      <div className="mx-auto max-w-6xl space-y-8">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <Link
              href="/"
              className="text-sm font-medium text-emerald-400 hover:text-emerald-300"
            >
              ← Back to dashboard
            </Link>
            <p className="mt-4 font-semibold tracking-widest text-emerald-400">
              EXPENZA
            </p>
            <h1 className="mt-2 text-3xl font-bold">Installments</h1>
            <p className="mt-1 text-sm text-slate-400">
              Track purchases, due dates, and payments.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setLoading(true);
              void loadData();
            }}
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm hover:bg-slate-900"
          >
            Refresh
          </button>
        </header>

        {error && (
          <div
            role="alert"
            className="rounded-xl border border-red-800 bg-red-950/30 p-4 text-sm text-red-300"
          >
            {error}
          </div>
        )}

        {notice && (
          <div
            role="status"
            className="rounded-xl border border-emerald-800 bg-emerald-950/30 p-4 text-sm text-emerald-300"
          >
            {notice}
          </div>
        )}

        <section className="grid gap-4 sm:grid-cols-3">
          <article className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">Active purchases</p>
            <p className="mt-3 text-3xl font-bold">
              {activePurchases.length}
            </p>
          </article>

          <article className="rounded-2xl border border-amber-900 bg-amber-950/20 p-5">
            <p className="text-sm text-amber-300">Remaining installments</p>
            <p className="mt-3 text-2xl font-bold">
              {money(remainingAmount)}
            </p>
            <p className="mt-1 text-sm text-slate-400">
              {unpaidPayments.length} unpaid payments
            </p>
          </article>

          <article className="rounded-2xl border border-emerald-900 bg-emerald-950/20 p-5">
            <p className="text-sm text-emerald-300">Payments recorded</p>
            <p className="mt-3 text-2xl font-bold">{money(paidAmount)}</p>
            <p className="mt-1 text-sm text-slate-400">Total marked as paid</p>
          </article>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5 sm:p-6">
          <h2 className="text-xl font-semibold">Add an installment purchase</h2>
          <p className="mt-1 text-sm text-slate-400">
            Set each payment amount yourself. All installments must add up to
            the total price.
          </p>

          {accounts.length === 0 ? (
            <p className="mt-5 rounded-lg border border-amber-900 p-4 text-sm text-amber-300">
              Create an account on your dashboard before adding a purchase.
            </p>
          ) : (
            <form onSubmit={createPurchase} className="mt-6 space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm text-slate-300">
                  Purchase name
                  <input
                    required
                    maxLength={100}
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="e.g. TV"
                    className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-3 text-white outline-none focus:border-emerald-500"
                  />
                </label>

                <label className="block text-sm text-slate-300">
                  Total price (TND)
                  <input
                    required
                    type="number"
                    min="0.001"
                    step="0.001"
                    value={totalAmount}
                    onChange={(event) => setTotalAmount(event.target.value)}
                    placeholder="970.000"
                    className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-3 text-white outline-none focus:border-emerald-500"
                  />
                </label>

                <label className="block text-sm text-slate-300 sm:col-span-2">
                  Pay from account
                  <select
                    required
                    value={accountId}
                    onChange={(event) => setAccountId(event.target.value)}
                    className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-3 text-white outline-none focus:border-emerald-500"
                  >
                    {accounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block text-sm text-slate-300 sm:col-span-2">
                  First payment due date
                  <input
                    required
                    type="date"
                    value={firstDueDate}
                    onChange={(event) => setFirstDueDate(event.target.value)}
                    className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-3 text-white outline-none focus:border-emerald-500 sm:max-w-md"
                  />
                  <span className="mt-1 block text-xs text-slate-500">
                    Later payments are scheduled monthly on the same day where
                    possible.
                  </span>
                </label>
              </div>

              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="font-semibold">Payment amounts</h3>
                  <button
                    type="button"
                    disabled={newRows.length >= 120}
                    onClick={() =>
                      setNewRows((rows) => [...rows, { amount: "" }])
                    }
                    className="rounded-lg border border-slate-700 px-3 py-2 text-sm hover:bg-slate-800 disabled:opacity-40"
                  >
                    + Add installment
                  </button>
                </div>

                {newRows.map((row, index) => (
                  <div
                    key={index}
                    className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-800 p-3"
                  >
                    <label className="min-w-0 flex-1 text-sm text-slate-300">
                      Installment {index + 1} (TND)
                      <input
                        required
                        type="number"
                        min="0.001"
                        step="0.001"
                        value={row.amount}
                        onChange={(event) =>
                          updateNewRow(index, event.target.value)
                        }
                        placeholder="e.g. 500.000"
                        className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-3 text-white outline-none focus:border-emerald-500"
                      />
                    </label>
                    <button
                      type="button"
                      disabled={newRows.length <= 2}
                      onClick={() =>
                        setNewRows((rows) =>
                          rows.filter((_, i) => i !== index)
                        )
                      }
                      className="rounded-lg border border-red-900 px-3 py-3 text-sm text-red-300 hover:bg-red-950/40 disabled:opacity-30"
                    >
                      Remove
                    </button>
                  </div>
                ))}

                <div className="flex flex-wrap justify-between gap-2 rounded-xl bg-slate-950 p-4 text-sm">
                  <span className="text-slate-400">Installments total</span>
                  <span
                    className={`font-semibold ${
                      totalAmount &&
                      toMillimes(totalAmount) === newRowsTotal
                        ? "text-emerald-300"
                        : "text-amber-300"
                    }`}
                  >
                    {money(newRowsTotal)}
                  </span>
                </div>

                {totalAmount &&
                  toMillimes(totalAmount) !== newRowsTotal && (
                    <p className="text-sm text-amber-300">
                      Difference:{" "}
                      {money(toMillimes(totalAmount) - newRowsTotal)}. The
                      installment amounts must equal the purchase price.
                    </p>
                  )}
              </div>

              <button
                type="submit"
                disabled={
                  saving ||
                  !accountId ||
                  newRows.length < 2 ||
                  !totalAmount ||
                  toMillimes(totalAmount) !== newRowsTotal
                }
                className="rounded-lg bg-emerald-500 px-5 py-3 font-semibold text-slate-950 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? "Creating purchase..." : "Add purchase"}
              </button>
            </form>
          )}
        </section>

        <section className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold">Your purchases</h2>
            <p className="mt-1 text-sm text-slate-400">
              Expand a purchase to view its schedule, edit it, or delete it.
            </p>
          </div>

          {purchases.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-700 p-10 text-center">
              <h3 className="font-semibold">No installment purchases yet</h3>
              <p className="mt-2 text-sm text-slate-400">
                Add your first purchase using the form above.
              </p>
            </div>
          ) : (
            purchases.map((purchase) => {
              const purchasePayments = payments
                .filter((payment) => payment.obligationId === purchase.id)
                .sort((a, b) => a.number - b.number);

              const purchaseRemaining = purchasePayments
                .filter((payment) => payment.status !== "paid")
                .reduce((sum, payment) => sum + payment.amountMillimes, 0);

              const purchasePaid = purchasePayments.filter(
                (payment) => payment.status === "paid"
              ).length;

              const expanded = expandedId === purchase.id;
              const editing = editingId === purchase.id;
              const hasPaid = purchasePayments.some(
                (payment) => payment.status === "paid"
              );
              const hasProcessing = purchasePayments.some(
                (payment) => payment.status === "processing"
              );

              return (
                <article
                  key={purchase.id}
                  className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900"
                >
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedId(expanded ? null : purchase.id)
                    }
                    aria-expanded={expanded}
                    className="flex w-full flex-wrap items-center justify-between gap-4 p-5 text-left hover:bg-slate-800/50 sm:p-6"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-semibold">
                          {purchase.name}
                        </h3>
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs ${
                            purchase.active
                              ? "bg-emerald-950 text-emerald-300"
                              : "bg-slate-800 text-slate-300"
                          }`}
                        >
                          {purchase.active ? "Active" : "Completed"}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-slate-400">
                        {purchasePaid} of {purchase.installmentCount} payments
                        paid
                      </p>
                      <div className="mt-3 h-2 w-48 max-w-full overflow-hidden rounded-full bg-slate-800">
                        <div
                          className="h-full rounded-full bg-emerald-500"
                          style={{
                            width: `${
                              purchase.installmentCount > 0
                                ? (purchasePaid / purchase.installmentCount) *
                                  100
                                : 0
                            }%`,
                          }}
                        />
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="text-sm text-slate-400">Total price</p>
                      <p className="mt-1 text-lg font-semibold">
                        {money(purchase.totalAmountMillimes)}
                      </p>
                      <p className="mt-1 text-sm text-amber-300">
                        {money(purchaseRemaining)} remaining
                      </p>
                      <p className="mt-2 text-xs text-slate-500">
                        {expanded ? "Hide schedule ↑" : "View schedule ↓"}
                      </p>
                    </div>
                  </button>

                  {expanded && (
                    <div className="space-y-5 border-t border-slate-800 p-4 sm:p-6">
                      <div className="flex flex-wrap gap-3">
                        <button
                          type="button"
                          disabled={hasProcessing || editSaving}
                          onClick={() => {
                            if (editing) {
                              setEditingId(null);
                            } else {
                              startEditing(purchase);
                            }
                          }}
                          className="rounded-lg border border-emerald-800 px-4 py-2 text-sm text-emerald-300 hover:bg-emerald-950/40 disabled:opacity-40"
                        >
                          {editing ? "Cancel editing" : "Edit purchase"}
                        </button>

                        <button
                          type="button"
                          disabled={!!deletingId || hasPaid || hasProcessing}
                          onClick={() => void deletePurchase(purchase)}
                          className="rounded-lg border border-red-900 px-4 py-2 text-sm text-red-300 hover:bg-red-950/40 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          {deletingId === purchase.id
                            ? "Deleting..."
                            : "Delete purchase"}
                        </button>
                      </div>

                      {editing && (
                        <div className="space-y-4 rounded-xl border border-emerald-900/70 bg-slate-950 p-4">
                          <h4 className="font-semibold">Edit purchase</h4>

                          <label className="block text-sm text-slate-300">
                            Purchase name
                            <input
                              value={editName}
                              maxLength={100}
                              onChange={(event) =>
                                setEditName(event.target.value)
                              }
                              className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-3 text-white outline-none focus:border-emerald-500"
                            />
                          </label>

                          <label className="block text-sm text-slate-300">
                            Pay from account
                            <select
                              value={editAccountId}
                              onChange={(event) =>
                                setEditAccountId(event.target.value)
                              }
                              className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-3 text-white outline-none focus:border-emerald-500"
                            >
                              {accounts.map((account) => (
                                <option key={account.id} value={account.id}>
                                  {account.name}
                                </option>
                              ))}
                            </select>
                          </label>

                          {hasPaid && (
                            <p className="text-sm text-amber-300">
                              Paid installments are locked. Their amounts and
                              due dates cannot be changed, and the account
                              cannot be changed after a payment has been
                              recorded.
                            </p>
                          )}

                          <div className="space-y-3">
                            {editRows.map((row, index) => (
                              <div
                                key={row.id}
                                className="grid gap-3 rounded-lg border border-slate-800 p-3 sm:grid-cols-2"
                              >
                                <label className="text-sm text-slate-300">
                                  Installment {row.number} amount (TND)
                                  <input
                                    type="number"
                                    min="0.001"
                                    step="0.001"
                                    value={row.amount}
                                    disabled={row.status !== "unpaid"}
                                    onChange={(event) =>
                                      updateEditRow(
                                        index,
                                        "amount",
                                        event.target.value
                                      )
                                    }
                                    className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-3 text-white outline-none focus:border-emerald-500 disabled:opacity-60"
                                  />
                                </label>

                                <label className="text-sm text-slate-300">
                                  Due date
                                  <input
                                    type="date"
                                    value={row.dueDate}
                                    disabled={row.status !== "unpaid"}
                                    onChange={(event) =>
                                      updateEditRow(
                                        index,
                                        "dueDate",
                                        event.target.value
                                      )
                                    }
                                    className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-3 text-white outline-none focus:border-emerald-500 disabled:opacity-60"
                                  />
                                  <span className="mt-1 block text-xs text-slate-500">
                                    {row.status === "paid"
                                      ? "Paid — locked"
                                      : row.status === "processing"
                                        ? "Processing — locked"
                                        : "Unpaid"}
                                  </span>
                                </label>
                              </div>
                            ))}
                          </div>

                          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-900 p-3">
                            <span className="text-sm text-slate-400">
                              Total purchase price
                            </span>
                            <span className="font-semibold">
                              {money(editRowsTotal)}
                            </span>
                          </div>

                          <button
                            type="button"
                            disabled={
                              editSaving ||
                              editRows.some(
                                (row) =>
                                  !row.amount ||
                                  toMillimes(row.amount) <= 0 ||
                                  !row.dueDate
                              )
                            }
                            onClick={() => void saveEdit(purchase)}
                            className="rounded-lg bg-emerald-500 px-5 py-3 font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-50"
                          >
                            {editSaving ? "Saving..." : "Save changes"}
                          </button>
                        </div>
                      )}

                      {purchasePayments.length === 0 ? (
                        <p className="text-sm text-slate-400">
                          No payments were found for this purchase.
                        </p>
                      ) : (
                        <div className="space-y-3">
                          {purchasePayments.map((payment) => (
                            <div
                              key={payment.id}
                              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 p-4"
                            >
                              <div>
                                <p className="font-medium">
                                  Installment {payment.number}
                                </p>
                                <p className="mt-1 text-sm text-slate-400">
                                  Due {payment.dueDate}
                                </p>
                              </div>

                              <div className="flex flex-wrap items-center gap-3">
                                <p className="font-semibold">
                                  {money(payment.amountMillimes)}
                                </p>

                                {payment.status === "paid" ? (
                                  <span className="rounded-full bg-emerald-950 px-3 py-1.5 text-sm text-emerald-300">
                                    Paid
                                  </span>
                                ) : payment.status === "processing" ? (
                                  <span className="rounded-full bg-amber-950 px-3 py-1.5 text-sm text-amber-300">
                                    Processing
                                  </span>
                                ) : (
                                  <button
                                    type="button"
                                    disabled={!!payingId || editing}
                                    onClick={() =>
                                      void markPaid(purchase, payment)
                                    }
                                    className="rounded-lg bg-emerald-500 px-3 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-50"
                                  >
                                    {payingId === payment.id
                                      ? "Recording..."
                                      : "Mark as paid"}
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </article>
              );
            })
          )}
        </section>

        <footer className="border-t border-slate-800 pt-5">
          <Link
            href="/"
            className="text-sm text-emerald-400 hover:text-emerald-300"
          >
            ← Return to your finances
          </Link>
        </footer>
      </div>
    </main>
  );
}
