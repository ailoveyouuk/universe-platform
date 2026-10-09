"use client";

import { useEffect, useState } from "react";
import type { CountryOption } from "@universe/types";
import { apiClient } from "./apiClient";

// Module-level cache — mirrors apps/project-management/src/lib/useCountries.ts
// (the Country reference list is global/static, one fetch shared across every
// CountrySelect usage in this app). Duplicated per-app rather than shared via
// @universe/ui because apiClient itself is already duplicated per-app (each
// app wires its own MSAL token acquisition) — see that file's own header
// comment for the reasoning this mirrors.
let cache: CountryOption[] | null = null;
let inFlight: Promise<CountryOption[]> | null = null;

/** Loads the shared Country reference list once per app session — added
 * 2026-10-09 for Stage 0 point 2 (country display consistency audit), the
 * first time the Admin app has needed country data (Organization's country
 * of registration). */
export function useCountries(): CountryOption[] {
  const [countries, setCountries] = useState<CountryOption[]>(cache ?? []);

  useEffect(() => {
    if (cache) {
      setCountries(cache);
      return;
    }
    if (!inFlight) {
      inFlight = apiClient.listCountries().catch(() => []);
    }
    inFlight.then((rows) => {
      cache = rows;
      setCountries(rows);
    });
  }, []);

  return countries;
}
