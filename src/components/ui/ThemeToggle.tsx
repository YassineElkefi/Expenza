"use client";

import { useEffect, useSyncExternalStore } from "react";

const themeChangeEvent = "expenza-theme-change";

function subscribe(onChange: () => void) {
  function handleStorageChange() {
    const stored = localStorage.getItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    document.documentElement.classList.toggle(
      "dark",
      stored ? stored === "dark" : prefersDark,
    );
    onChange();
  }

  window.addEventListener(themeChangeEvent, onChange);
  window.addEventListener("storage", handleStorageChange);

  return () => {
    window.removeEventListener(themeChangeEvent, onChange);
    window.removeEventListener("storage", handleStorageChange);
  };
}

function getSnapshot() {
  return document.documentElement.classList.contains("dark");
}

function getServerSnapshot() {
  return false;
}

function applyTheme(dark: boolean, persist: boolean) {
  document.documentElement.classList.toggle("dark", dark);

  if (persist) {
    localStorage.setItem("theme", dark ? "dark" : "light");
  }

  window.dispatchEvent(new Event(themeChangeEvent));
}

export function ThemeToggle() {
  const dark = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  useEffect(() => {
    const stored = localStorage.getItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    applyTheme(stored ? stored === "dark" : prefersDark, false);
  }, []);

  function toggle() {
    applyTheme(!dark, true);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className="btn btn-ghost btn-sm"
      aria-label={`Switch to ${dark ? "light" : "dark"} theme`}
      aria-pressed={dark}
    >
      {dark ? (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
        </svg>
      ) : (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      )}
    </button>
  );
}