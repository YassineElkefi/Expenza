
"use client";

import { useState } from "react";

type Props = {
  onCreated: () => void;
};

export default function AddAccountForm({ onCreated }: Props) {
  const [name, setName] = useState("");
  const [accountType, setAccountType] = useState("bank");
  const [balance, setBalance] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSuccess("");

    const trimmedBalance = balance.trim();
    const amount = Number(trimmedBalance);

    if (!name.trim() || name.trim().length > 100) {
      setError("Enter an account name (up to 100 characters).");
      return;
    }

    if (
      !/^\d+(\.\d{1,3})?$/.test(trimmedBalance) ||
      !Number.isFinite(amount) ||
      !Number.isSafeInteger(Math.round(amount * 1000))
    ) {
      setError("Enter a valid TND balance with up to 3 decimal places.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          accountType,
          openingBalanceMillimes: Math.round(amount * 1000),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error ?? "Could not create the account.");
        return;
      }

      setName("");
      setAccountType("bank");
      setBalance("");
      setSuccess("Account created successfully.");
      onCreated();
    } catch {
      setError("Could not reach the server. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="account-name" className="mb-1 block text-sm font-medium">
          Account name
        </label>
        <input
          id="account-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={100}
          placeholder="e.g. My bank account"
          required
          className="w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2"
        />
      </div>

      <div>
        <label htmlFor="account-type" className="mb-1 block text-sm font-medium">
          Account type
        </label>
        <select
          id="account-type"
          value={accountType}
          onChange={(e) => setAccountType(e.target.value)}
          className="w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2"
        >
          <option value="bank">Bank account</option>
          <option value="cash">Cash wallet</option>
          <option value="savings">Savings</option>
          <option value="other">Other</option>
        </select>
      </div>

      <div>
        <label htmlFor="account-balance" className="mb-1 block text-sm font-medium">
          Current balance (TND)
        </label>
        <input
          id="account-balance"
          type="number"
          min="0"
          step="0.001"
          value={balance}
          onChange={(e) => setBalance(e.target.value)}
          placeholder="1250.500"
          required
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
        {loading ? "Creating..." : "Add account"}
      </button>
    </form>
  );
}
