"use client";

import { useEffect, useState } from "react";
import type { CountryOption } from "@universe/types";
import { apiClient } from "./apiClient";

// Module-level cache — the country reference list (194 rows) is global,
// essentially static, and the same for every page/org, so every CountrySelect
// usage across the app shares one fetch rather than re-requesting it per
// mount. Cleared only by a full page reload, which is fine for reference
// data that doesn't change during a session.
let cache: CountryOption[] | null = null;
let inFlight: Promise<CountryOption[]> | null = null;

/** Loads the shared Country reference list once per app session (see the
 * module-level cache above) for CountrySelect — added 2026-10-01 to back
 * the searchable country picker that replaced free-text "ISO alpha-2"
 * fields across the app. */
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
