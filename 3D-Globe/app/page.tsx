"use client";

import dynamic from "next/dynamic";
import { useEffect } from "react";
import { shallow } from "zustand/shallow";
import { useAppStore } from "@/store/useAppStore";
import { CountryPanel } from "@/components/CountryPanel";
import { SearchBox } from "@/components/SearchBox";
import { GlobeSkeleton } from "@/components/GlobeSkeleton";
import { cn } from "@/lib/utils";

const Globe = dynamic(() => import("@/components/Globe"), {
  ssr: false,
  loading: () => <GlobeSkeleton />
});

export default function Page() {
  const [selectedIso3, clearSelection] = useAppStore(
    (s) => [s.selectedIso3, s.clearSelection],
    shallow
  );

  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") clearSelection();
    };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [clearSelection]);

  return (
    <main
      className={cn(
        "flex min-h-screen flex-col lg:flex-row gap-4 p-4 md:p-6",
        "bg-gradient-to-b from-white to-slate-50 dark:from-[#0b0e14] dark:to-[#080a10]"
      )}
    >
      <section className="relative flex-1 rounded-2xl overflow-hidden border border-black/5 dark:border-white/10">
        <div className="absolute left-4 top-4 z-20 max-w-[520px]">
          <div className="card">
            <h1 className="text-lg font-semibold">Globe Facts</h1>
            <p className="text-sm opacity-80">
              Click a country or search for a city/country to explore quick,
              factual highlights.
            </p>
            <div className="mt-3">
              <SearchBox />
            </div>
          </div>
        </div>
        <Globe />
      </section>

      <aside className="w-full lg:w-[420px] xl:w-[460px] shrink-0 sticky top-4 self-start">
        <CountryPanel key={selectedIso3 ?? "none"} />
      </aside>
    </main>
  );
}
