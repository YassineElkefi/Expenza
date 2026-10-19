
"use client";

import { useState } from "react";

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
      <div>
        <label htmlFor="transaction-type" className="mb-1 block text-sm font-medium">
          Transaction type
        </label>
        <select
          id="transaction-type"
          value={transactionType}
          onChange={(e) => setTransactionType(e.target.value)}
          className="w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2"
        >
          <option value="expense">Expense</option>
          <option value="income">Income</option>
        </select>
      </div>

      <div>
        <label htmlFor="transaction-account" className="mb-1 block text-sm font-medium">
          Account
        </label>
        <select
          id="transaction-account"
          value={accountId}
          onChange={(e) => setAccountId(e.target.value)}
          required
          className="w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2"
        >
          <option value="">Choose an account</option>
          {accounts.map((account) => (
            <option key={account.id} value={account.id}>
              {account.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="transaction-amount" className="mb-1 block text-sm font-medium">
          Amount (TND)
        </label>
        <input
          id="transaction-amount"
          type="number"
          min="0.001"
          step="0.001"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="e.g. 45.500"
          required
          className="w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2"
        />
      </div>

      <div>
        <label htmlFor="transaction-category" className="mb-1 block text-sm font-medium">
          Category
        </label>
        <input
          id="transaction-category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          maxLength={50}
          placeholder="e.g. Food, Salary, Transport"
          required
          className="w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2"
        />
      </div>

      <div>
        <label htmlFor="transaction-date" className="mb-1 block text-sm font-medium">
          Date
        </label>
        <input
          id="transaction-date"
          type="date"
          value={transactionDate}
          onChange={(e) => setTransactionDate(e.target.value)}
          required
          className="w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2"
        />
      </div>

      <div>
        <label htmlFor="transaction-description" className="mb-1 block text-sm font-medium">
          Description (optional)
        </label>
        <input
          id="transaction-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={500}
          placeholder="e.g. Weekly groceries"
          className="w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2"
        />
      </div>

      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      {success && <p role="status" className="text-sm text-green-700">{success}</p>}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
      >
      {loading
        ? isEditing ? "Updating..." : "Saving..."
        : isEditing ? "Update transaction" : "Save transaction"}      </button>
    </form>
  );
}
