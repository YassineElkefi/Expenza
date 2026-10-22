
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Alert } from "@/components/ui/Alert";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const response = await fetch(
        mode === "signup" ? "/api/auth/register" : "/api/auth/login",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        }
      );
      const result = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(result.error ?? "Authentication failed.");
      }

      router.replace("/dashboard");
      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center bg-base p-6 text-primary">
      <div className="absolute right-6 top-6">
        <ThemeToggle />
      </div>
      <form onSubmit={handleSubmit} className="surface w-full max-w-md space-y-5 p-6 sm:p-8">
        <div>
          <p className="text-accent text-sm font-semibold tracking-widest">EXPENZA</p>
          <h1 className="mt-2 text-3xl font-bold">
            {mode === "login" ? "Welcome back" : "Create your account"}
          </h1>
          <p className="text-secondary mt-2 text-sm">
            Your personal finances, all in one place.
          </p>
        </div>

        <label htmlFor="email" className="field-label">
          Email address
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input mt-2"
          />
        </label>

        <label htmlFor="password" className="field-label">
          Password
          <input
            id="password"
            type="password"
            required
            minLength={8}
            maxLength={128}
            autoComplete={
              mode === "login" ? "current-password" : "new-password"
            }
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input mt-2"
          />
        </label>

        {message && <Alert type="error">{message}</Alert>}

        <button
          type="submit"
          disabled={loading}
          className="btn btn-primary w-full"
        >
          {loading
            ? "Please wait..."
            : mode === "login"
              ? "Sign in"
              : "Create account"}
        </button>

        <button
          type="button"
          onClick={() => {
            setMode(mode === "login" ? "signup" : "login");
            setMessage("");
          }}
          className="btn btn-ghost w-full"
        >
          {mode === "login"
            ? "New to Expenza? Create an account"
            : "Already have an account? Sign in"}
        </button>
      </form>
    </main>
  );
}
