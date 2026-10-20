
"use client";

import { useState } from "react";
import { FormField } from "@/components/ui/FormField";
import { ui } from "@/lib/theme";

type AccountOption = {
  id: string;
  name: string;
  account_type: string;
};

type EditableTransaction = {
  id: string;
  account_id: string;
  transaction_type: string;
  amount_millimes: number;
  category: string;
  description: string;
  transaction_date: string;
};

type Props = {
  accounts: AccountOption[];
  onCreated: () => void;
  transaction?: EditableTransaction;
};

function getLocalDate() {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 10);
}

export default function AddTransactionForm({
  accounts,
  onCreated,
  transaction,
}: Props) {
  const isEditing = Boolean(transaction);

  const [accountId, setAccountId] = useState(
    transaction?.account_id ?? ""
  );
  const [transactionType, setTransactionType] = useState(
    transaction?.transaction_type ?? "expense"
  );
  const [amount, setAmount] = useState(
    transaction ? (transaction.amount_millimes / 1000).toFixed(3) : ""
  );
  const [category, setCategory] = useState(
    transaction?.category ?? "Other"
  );
  const [description, setDescription] = useState(
    transaction?.description ?? ""
  );
  const [transactionDate, setTransactionDate] = useState(
    transaction?.transaction_date ?? getLocalDate()
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSuccess("");

    const trimmedAmount = amount.trim();
    const parsedAmount = Number(trimmedAmount);

    if (!accountId) {
      setError("Choose an account.");
      return;
    }

    if (
      !/^\d+(\.\d{1,3})?$/.test(trimmedAmount) ||
      !Number.isFinite(parsedAmount) ||
      !Number.isSafeInteger(Math.round(parsedAmount * 1000)) ||
      parsedAmount <= 0
    ) {
      setError("Enter an amount greater than zero, with up to 3 decimal places.");
      return;
    }

    if (!category.trim() || category.trim().length > 50) {
      setError("Enter a category of up to 50 characters.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
      isEditing
        ? `/api/transactions/${transaction!.id}`
        : "/api/transactions",
      {
        method: isEditing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId,
          transactionType,
          amountMillimes: Math.round(parsedAmount * 1000),
          category: category.trim(),
          description: description.trim(),
          transactionDate,
        }),
      }
    );

      const result = await response.json();

      if (!response.ok) {
        setError(result.error ?? "Could not save the transaction.");
        return;
      }

      setAmount("");
      setDescription("");
      setSuccess(isEditing
      ? "Transaction updated successfully."
      : "Transaction saved successfully.");
      onCreated();
    } catch {
      setError("Could not reach the server. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (accounts.length === 0) {
    return (
      <p className="text-sm text-gray-500">
        Create an account before adding a transaction.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <FormField
        as="select"
        id="transaction-type"
        label="Transaction type"
        value={transactionType}
        onChange={(e) => setTransactionType((e.target as HTMLSelectElement).value)}
      >
        <option value="expense">Expense</option>
        <option value="income">Income</option>
      </FormField>

      <FormField
        as="select"
        id="transaction-account"
        label="Account"
        value={accountId}
        onChange={(e) => setAccountId((e.target as HTMLSelectElement).value)}
        required
      >
        <option value="">Choose an account</option>
        {accounts.map((account) => (
          <option key={account.id} value={account.id}>
            {account.name}
          </option>
        ))}
      </FormField>

      <FormField
        id="transaction-amount"
        label="Amount (TND)"
        type="number"
        min="0.001"
        step="0.001"
        value={amount}
        onChange={(e) => setAmount((e.target as HTMLInputElement).value)}
        placeholder="e.g. 45.500"
        required
      />

      <FormField
        id="transaction-category"
        label="Category"
        value={category}
        onChange={(e) => setCategory((e.target as HTMLInputElement).value)}
        maxLength={50}
        placeholder="e.g. Food, Salary, Transport"
        required
      />

      <FormField
        id="transaction-date"
        label="Date"
        type="date"
        value={transactionDate}
        onChange={(e) => setTransactionDate((e.target as HTMLInputElement).value)}
        required
      />

      <FormField
        id="transaction-description"
        label="Description (optional)"
        value={description}
        onChange={(e) => setDescription((e.target as HTMLInputElement).value)}
        maxLength={500}
        placeholder="e.g. Weekly groceries"
      />

      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      {success && <p role="status" className="text-sm text-green-700">{success}</p>}

      <button
        type="submit"
        disabled={loading}
        className={ui.btnPrimary}
      >
      {loading
        ? isEditing ? "Updating..." : "Saving..."
        : isEditing ? "Update transaction" : "Save transaction"}      </button>
    </form>
  );
}
