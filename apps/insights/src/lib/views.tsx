"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import type { InsightsUserItem, SaveInsightsUserItemInput } from "@universe/types";
import { apiClient } from "./apiClient";
import { setInsightsFilters, type InsightsFilters } from "./filters";

/**
 * Per-person personalisation (2026-10-25): saved views (a page with its filters and selections) and the highlights pinned to the Overview.
 * Kept on the server per person, so they follow the person to any device. This file holds the shared store, and the bridge a page uses to say
 * what its current view is (get) and how to restore one (apply).
 */
let items: InsightsUserItem[] | null = null;
let loading = false;
let failed = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function loadInsightsItems(force = false) {
  if ((items !== null || loading) && !force) return;
  loading = true;
  apiClient.insightsItems().then((r) => { items = r; failed = false; }).catch(() => { items = items ?? []; failed = true; }).finally(() => { loading = false; emit(); });
}
export function useInsightsItems(): { items: InsightsUserItem[] | null; failed: boolean } {
  useEffect(() => { loadInsightsItems(); }, []);
  const snap = useSyncExternalStore((cb) => { listeners.add(cb); return () => { listeners.delete(cb); }; }, () => items, () => null);
  return { items: snap, failed };
}
export async function saveInsightsItem(input: SaveInsightsUserItemInput) { const r = await apiClient.insightsSaveItem(input); loadInsightsItems(true); return r; }
export async function removeInsightsItem(id: string) { await apiClient.insightsRemoveItem(id); items = (items ?? []).filter((i) => i.id !== id); emit(); }

// ---- the page bridge
export interface ViewBridge { get: () => Record<string, unknown> }
let bridge: ViewBridge | null = null;
export const currentViewBridge = () => bridge;
export interface SavedViewState { filters: InsightsFilters; page: Record<string, unknown> }

/**
 * A page calls this with how to read its own view and how to restore one. When the person opens a saved view (the address carries ?view=id) the
 * saved state is applied once, as soon as their saved items have loaded.
 */
export function useViewBridge<S extends Record<string, unknown>>(get: () => S, apply: (s: Partial<S>) => void) {
  const { items: list } = useInsightsItems();
  const applied = useRef(false);
  const latest = useRef({ get, apply }); latest.current = { get, apply };
  useEffect(() => { bridge = { get: () => latest.current.get() }; return () => { bridge = null; }; }, []);
  useEffect(() => {
    if (applied.current || !list) return;
    const id = new URLSearchParams(window.location.search).get("view"); if (!id) return;
    applied.current = true;
    const v = list.find((i) => i.id === id); const st = v?.state as SavedViewState | null | undefined; if (!st) return;
    if (st.filters) setInsightsFilters(st.filters);
    if (st.page) latest.current.apply(st.page as Partial<S>);
  }, [list]);
}

/** A value passed in the address (for example /services?service=ADVISORY), read once on arrival. */
export function readParam(name: string): string {
  if (typeof window === "undefined") return "";
  return new URLSearchParams(window.location.search).get(name) ?? "";
}
