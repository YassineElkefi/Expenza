"use client";

import { useState } from "react";

export default function DbTestButton() {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function testConnection() {
    setLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/db-test", { cache: "no-store" });

      const result = await response.json();

      if (!response.ok) {
        setMessage(result.error ?? "Connection test failed.");
        return;
      }

      setMessage(result.message);
    } catch {
      setMessage("Could not reach the API. Check the server logs.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={testConnection}
        disabled={loading}
        className="rounded-lg bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
      >
        {loading ? "Testing..." : "Test MongoDB connection"}
      </button>

      {message && <p role="status">{message}</p>}
    </div>
  );
}