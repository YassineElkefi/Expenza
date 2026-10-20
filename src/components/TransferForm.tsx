"use client";

import { useState } from "react";

type Account = { id: string; name: string };

type Props = {
  accounts: Account[];
  onTransferred: () => void;
};

export default function TransferForm({ accounts, onTransferred }: Props) {
  const [fromId, setFromId] = useState(accounts[0]?.id ?? "");
  const [toId, setToId] = useState(accounts[1]?.id ?? "");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const amountMillimes = Math.round(parseFloat(amount) * 1000);
    if (!amountMillimes || amountMillimes <= 0) {
      setError("Enter a valid amount.");
      return;
    }
    if (fromId === toId) {
      setError("Source and destination must be different accounts.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/transfers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromAccountId: fromId,
          toAccountId: toId,
          amountMillimes,
          transactionDate: date,
          description,
        }),
      });
      const result = await res.json() as { error?: string };
      if (!res.ok) throw new Error(result.error ?? "Transfer failed.");

      setAmount("");
      setDescription("");
      onTransferred();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Transfer failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="field-label">
          From
          <select
            value={fromId}
            onChange={(e) => setFromId(e.target.value)}
            className="input mt-1"
          >
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
        </label>

        <label className="field-label">
          To
          <select
            value={toId}
            onChange={(e) => setToId(e.target.value)}
            className="input mt-1"
          >
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="field-label">
          Amount (TND)
          <input
            type="number"
            min="0.001"
            step="0.001"
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="input mt-1"
            placeholder="0.000"
          />
        </label>

        <label className="field-label">
          Date
          <input
            type="date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="input mt-1"
          />
        </label>
      </div>

      <label className="field-label">
        Note (optional)
        <input
          type="text"
          maxLength={500}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="input mt-1"
          placeholder="e.g. ATM withdrawal"
        />
      </label>

      {error && <p className="text-sm" style={{ color: "var(--danger)" }}>{error}</p>}

      <button type="submit" disabled={loading} className="btn btn-primary w-full">
        {loading ? "Transferring..." : "Transfer"}
      </button>
    </form>
  );
}