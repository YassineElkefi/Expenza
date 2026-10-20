"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

const nav = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    href: "/accounts",
    label: "Accounts",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <rect x="2" y="5" width="20" height="14" rx="2" />
        <path d="M2 10h20" />
      </svg>
    ),
  },
  {
    href: "/transactions",
    label: "Transactions",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path d="M8 6l4-4 4 4M16 18l-4 4-4-4M12 2v20" />
      </svg>
    ),
  },
  {
    href: "/installments",
    label: "Installments",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      </svg>
    ),
  },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState("");

  async function signOut() {
    setSigningOut(true);
    setSignOutError("");

    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });

      if (!response.ok) {
        throw new Error("Could not sign out. Please try again.");
      }

      router.replace("/login");
      router.refresh();
    } catch (error) {
      setSignOutError(
        error instanceof Error ? error.message : "Could not sign out. Please try again.",
      );
    } finally {
      setSigningOut(false);
    }
  }

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "var(--bg-base)" }}>
      <aside
        className="hidden w-56 shrink-0 flex-col border-r lg:flex"
        style={{ background: "var(--bg-surface)", borderColor: "var(--border)" }}
      >
        <div className="flex items-center justify-between px-5 py-4">
          <Link
            href="/dashboard"
            className="text-sm font-bold tracking-widest"
            style={{ color: "var(--accent)" }}
          >
            EXPENZA
          </Link>
          <ThemeToggle />
        </div>

        <div className="divider" />

        <nav aria-label="Main navigation" className="flex-1 space-y-0.5 p-3 pt-4">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(item.href) ? "page" : undefined}
              className={`sidebar-item ${isActive(item.href) ? "sidebar-item-active" : ""}`}
            >
              {item.icon}
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="p-3 pt-0">
          {/* <ThemeToggle /> */}
          <div className="divider mb-3" />
          {signOutError && (
            <Alert type="error" className="alert-compact mb-2">
              {signOutError}
            </Alert>
          )}
          <button
            type="button"
            onClick={signOut}
            disabled={signingOut}
            className="sidebar-item"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
            </svg>
            {signingOut ? "Signing out..." : "Sign out"}
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header
          className="border-b lg:hidden"
          style={{ background: "var(--bg-surface)", borderColor: "var(--border)" }}
        >
          <div className="flex h-12 items-center justify-between px-4">
            <Link href="/dashboard" className="text-sm font-bold tracking-widest" style={{ color: "var(--accent)" }}>
              EXPENZA
            </Link>
            <ThemeToggle />
          </div>
          <nav aria-label="Main navigation" className="flex gap-1 overflow-x-auto px-3 pb-2">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive(item.href) ? "page" : undefined}
                className={`sidebar-item w-auto shrink-0 ${isActive(item.href) ? "sidebar-item-active" : ""}`}
              >
                {item.icon}
                {item.label}
              </Link>
            ))}
            <button
              type="button"
              onClick={signOut}
              disabled={signingOut}
              className="sidebar-item w-auto shrink-0"
            >
              {signingOut ? "Signing out..." : "Sign out"}
            </button>
          </nav>
          {signOutError && (
            <Alert type="error" className="alert-compact mx-4 mb-2">
              {signOutError}
            </Alert>
          )}
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
