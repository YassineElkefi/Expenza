"use client";

import { useRef, useState, useEffect } from "react";

type Account = { id: string; name: string };

type Props = {
  accounts: Account[];
  value: string[];
  onChange: (ids: string[]) => void;
};

export function AccountPicker({ accounts, value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function toggle(id: string) {
    onChange(
      value.includes(id) ? value.filter((v) => v !== id) : [...value, id]
    );
  }

  const label =
    value.length === 0
      ? "All accounts"
      : value.length === 1
        ? (accounts.find((a) => a.id === value[0])?.name ?? "1 account")
        : `${value.length} accounts`;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="input flex w-full items-center justify-between gap-2 text-left"
      >
        <span className={value.length === 0 ? "text-secondary" : "text-primary"}>
          {label}
        </span>
        <svg
          className="text-secondary size-4 shrink-0"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {open && (
        <div className="surface absolute z-20 mt-1 w-full rounded-lg border py-1 shadow-lg">
          {accounts.map((account) => (
            <label
              key={account.id}
              className="flex cursor-pointer items-center gap-3 px-3 py-2 hover:bg-[var(--bg-subtle)]"
            >
              <input
                type="checkbox"
                checked={value.includes(account.id)}
                onChange={() => toggle(account.id)}
                className="accent-[var(--accent)]"
              />
              <span className="text-primary text-sm">{account.name}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}