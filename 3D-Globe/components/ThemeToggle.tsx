"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const initial = localStorage.getItem("theme") ?? (mq.matches ? "dark" : "light");
    document.documentElement.setAttribute("data-theme", initial);
    setDark(initial === "dark");
  }, []);

  const toggle = () => {
    const next = dark ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("theme", next);
    setDark(!dark);
  };

  return (
    <button
      onClick={toggle}
      aria-label="Toggle theme"
      className="rounded-full p-2 bg-black/5 dark:bg-white/10 hover:opacity-80"
    >
      {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </button>
  );
}
