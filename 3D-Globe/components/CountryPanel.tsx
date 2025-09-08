"use client";

import useSWR from "swr";
import { useAppStore } from "@/store/useAppStore";
import { useEffect, useMemo } from "react";
import toast from "react-hot-toast";
import { RefreshCw, X } from "lucide-react";
import { countryBasicsByISO3 } from "@/lib/countryMap";

type Facts = {
  summary: string;
  landmarks: { name: string; city: string }[];
  languages: string[];
  fun_fact: string;
};

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function CountryPanel() {
  const { selectedIso3, clearSelection } = useAppStore((s) => ({
    selectedIso3: s.selectedIso3,
    clearSelection: s.clearSelection
  }));

  const basics = useMemo(
    () => (selectedIso3 ? countryBasicsByISO3(selectedIso3) : null),
    [selectedIso3]
  );

  const { data, isLoading, mutate, error } = useSWR<Facts>(
    selectedIso3 ? `/api/facts?country=${selectedIso3}` : null,
    fetcher
  );

  useEffect(() => {
    if (error) toast.error("Failed to load facts. Try again.");
  }, [error]);

  if (!selectedIso3) {
    return (
      <div className="card">
        <h2 className="text-lg font-semibold">No country selected</h2>
        <p className="text-sm opacity-75 mt-1">
          Click a country on the globe or use search.
        </p>
      </div>
    );
  }

  return (
    <div className="card" role="dialog" aria-labelledby="panel-title" aria-modal="false">
      <div className="flex items-center justify-between">
        <h2 id="panel-title" className="text-xl font-bold">
          {basics?.flag} {basics?.name ?? selectedIso3}
        </h2>
        <button
          className="rounded-full p-2 hover:bg-black/5 dark:hover:bg-white/10"
          onClick={clearSelection}
          aria-label="Close panel"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="mt-2 text-sm grid grid-cols-2 gap-2">
        <div className="rounded-lg bg-black/5 dark:bg-white/10 p-2">
          <div className="opacity-60">Capital</div>
          <div className="font-medium">{basics?.capital ?? "—"}</div>
        </div>
        <div className="rounded-lg bg-black/5 dark:bg-white/10 p-2">
          <div className="opacity-60">Region</div>
          <div className="font-medium">{basics?.region ?? "—"}</div>
        </div>
        <div className="rounded-lg bg-black/5 dark:bg-white/10 p-2">
          <div className="opacity-60">Population</div>
          <div className="font-medium">
            {basics?.population ? basics.population.toLocaleString() : "—"}
          </div>
        </div>
        <div className="rounded-lg bg-black/5 dark:bg-white/10 p-2">
          <div className="opacity-60">Currency</div>
          <div className="font-medium">{basics?.currency ?? "—"}</div>
        </div>
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Overview</h3>
          <button
            className="inline-flex items-center gap-2 text-xs rounded-xl border border-black/10 dark:border-white/10 px-3 py-1 hover:bg-black/5 dark:hover:bg-white/10"
            onClick={() => mutate()}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Regenerate
          </button>
        </div>
        <div className="mt-2 text-sm">
          {isLoading ? (
            <div className="animate-pulse h-16 rounded-lg bg-black/5 dark:bg-white/10" />
          ) : data ? (
            <>
              <p className="opacity-90">{data.summary}</p>
              <div className="mt-3">
                <h4 className="font-medium">Landmarks</h4>
                <ul className="mt-1 list-disc pl-5 space-y-1">
                  {data.landmarks?.slice(0, 5).map((l, i) => (
                    <li key={i} className="opacity-90">
                      {l.name} — <span className="opacity-75">{l.city}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="mt-3">
                <h4 className="font-medium">Languages</h4>
                <p className="opacity-90">{data.languages?.join(", ")}</p>
              </div>
              <div className="mt-3">
                <h4 className="font-medium">Fun fact</h4>
                <p className="opacity-90">{data.fun_fact}</p>
              </div>
            </>
          ) : (
            <p className="opacity-70">No facts available.</p>
          )}
        </div>
      </div>
    </div>
  );
}
