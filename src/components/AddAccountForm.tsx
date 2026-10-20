"use client";

import { useState } from "react";
import { FormField } from "@/components/ui/FormField";
import { Alert } from "@/components/ui/Alert";
import { ui } from "@/lib/theme";

type Props = { onCreated: () => void };

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
      <FormField
        id="account-name"
        label="Account name"
        value={name}
        onChange={(e) => setName((e.target as HTMLInputElement).value)}
        maxLength={100}
        placeholder="e.g. My bank account"
        required
      />

      <FormField
        as="select"
        id="account-type"
        label="Account type"
        value={accountType}
        onChange={(e) => setAccountType((e.target as HTMLSelectElement).value)}
      >
        <option value="bank">Bank account</option>
        <option value="cash">Cash wallet</option>
        <option value="savings">Savings</option>
        <option value="other">Other</option>
      </FormField>

      <FormField
        id="account-balance"
        label="Current balance (TND)"
        type="number"
        min="0"
        step="0.001"
        value={balance}
        onChange={(e) => setBalance((e.target as HTMLInputElement).value)}
        placeholder="1250.500"
        required
      />

      {error && <Alert type="error">{error}</Alert>}
      {success && <Alert type="success">{success}</Alert>}

      <button type="submit" disabled={loading} className={ui.btnPrimary}>
        {loading ? "Creating..." : "Add account"}
      </button>
    </form>
  );
}