"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BellIcon, CheckCircleIcon } from "./icons";

/* Structural copies of NotificationItem / NotificationSummary from
 * @universe/types (this package deliberately has no dependency on it). */
export interface NotificationRowData {
  id: string;
  kind: string;
  title: string;
  body: string | null;
  link: string | null;
  actorName: string | null;
  requiresAction: boolean;
  actionStatus: "OPEN" | "DONE" | null;
  dueDate: string | null;
  read: boolean;
  createdAt: string;
}
export interface NotificationSummaryData {
  unread: number;
  openActions: number;
  overdueActions: number;
  nextActions: NotificationRowData[];
}
/** What the components need from an app's api client — the app's `apiClient`
 * satisfies this directly. */
export interface NotificationsApi {
  getNotificationSummary(): Promise<NotificationSummaryData>;
  listNotifications(filter?: "all" | "unread" | "actions" | "done"): Promise<NotificationRowData[]>;
  markNotificationRead(id: string): Promise<unknown>;
  markAllNotificationsRead(): Promise<unknown>;
  completeNotification(id: string): Promise<unknown>;
  reopenNotification(id: string): Promise<unknown>;
}

export function relativeTime(iso: string): string {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 86400 * 7) return `${Math.floor(s / 86400)}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

/** "Due today", "Overdue 3d", "Due 12 Nov" … plus whether it is overdue. */
export function dueLabel(iso: string | null): { text: string; overdue: boolean } | null {
  if (!iso) return null;
  const due = new Date(iso);
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const days = Math.floor((due.getTime() - startOfToday.getTime()) / 86400000);
  if (days < 0) return { text: `Overdue ${-days}d`, overdue: true };
  if (days === 0) return { text: "Due today", overdue: false };
  if (days === 1) return { text: "Due tomorrow", overdue: false };
  return { text: `Due ${due.toLocaleDateString(undefined, { day: "numeric", month: "short" })}`, overdue: false };
}

/** One notification / action row, shared by the bell, dashboard card and page. */
export function NotificationRow({
  n,
  LinkComponent,
  onOpen,
  onToggleDone,
  compact = false,
}: {
  n: NotificationRowData;
  LinkComponent: any;
  onOpen?: (n: NotificationRowData) => void;
  onToggleDone?: (n: NotificationRowData) => void;
  compact?: boolean;
}) {
  const Link = LinkComponent;
  const due = n.requiresAction && n.actionStatus === "OPEN" ? dueLabel(n.dueDate) : null;
  const done = n.actionStatus === "DONE";
  const text = (
    <span style={{ display: "block", minWidth: 0 }}>
      <span style={{ display: "block", fontSize: 13, fontWeight: n.read && !n.requiresAction ? 500 : 650, color: "var(--u-ink)", textDecoration: done ? "line-through" : "none", opacity: done ? 0.6 : 1, overflowWrap: "anywhere" }}>
        {n.title}
      </span>
      {!compact && n.body && <span style={{ display: "block", fontSize: 12, color: "var(--u-ink-secondary)", marginTop: 2, overflowWrap: "anywhere" }}>{n.body}</span>}
      <span style={{ display: "flex", gap: 8, flexWrap: "wrap", fontSize: 11, color: "var(--u-ink-secondary)", marginTop: 3 }}>
        {n.actorName && <span>from {n.actorName}</span>}
        <span>{relativeTime(n.createdAt)}</span>
        {due && <span style={{ fontWeight: 650, color: due.overdue ? "var(--u-status-critical)" : "var(--u-ink-secondary)" }}>{due.text}</span>}
      </span>
    </span>
  );
  return (
    <li style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "10px 12px", borderTop: "1px solid var(--u-border)", background: n.read ? "transparent" : "color-mix(in srgb, var(--u-org-accent, var(--u-brand-violet)) 6%, transparent)" }}>
      {n.requiresAction && onToggleDone ? (
        <button
          type="button"
          aria-label={done ? "Reopen action" : "Mark action done"}
          onClick={() => onToggleDone(n)}
          style={{ border: "none", background: "none", padding: 2, marginTop: 1, cursor: "pointer", color: done ? "var(--u-status-success, #2a7d46)" : "var(--u-ink-secondary)", display: "flex" }}
        >
          {done ? <CheckCircleIcon size={18} /> : <span style={{ width: 16, height: 16, borderRadius: "50%", border: "1.8px solid currentColor", display: "block", margin: 1 }} />}
        </button>
      ) : (
        <span style={{ width: 8, height: 8, borderRadius: "50%", marginTop: 6, flexShrink: 0, background: n.read ? "transparent" : "var(--u-org-accent, var(--u-brand-violet))" }} />
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        {n.link ? (
          <Link href={n.link} onClick={() => onOpen?.(n)} style={{ textDecoration: "none", display: "block" }}>
            {text}
          </Link>
        ) : (
          <div onClick={() => onOpen?.(n)}>{text}</div>
        )}
      </div>
    </li>
  );
}

/** Header bell: unread badge, popover with Notifications / Actions tabs.
 * Polls the summary every minute and refreshes when opened. */
export function NotificationBell({ api, LinkComponent, viewAllHref = "/notifications" }: { api: NotificationsApi; LinkComponent: any; viewAllHref?: string }) {
  const Link = LinkComponent;
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"all" | "actions">("all");
  const [summary, setSummary] = useState<NotificationSummaryData | null>(null);
  const [items, setItems] = useState<NotificationRowData[] | null>(null);
  const [failed, setFailed] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const refreshSummary = useCallback(() => api.getNotificationSummary().then(setSummary).catch(() => undefined), [api]);
  const refreshList = useCallback(
    (t: "all" | "actions") => api.listNotifications(t === "actions" ? "actions" : "all").then((r) => { setItems(r.slice(0, 12)); setFailed(false); }).catch(() => setFailed(true)),
    [api],
  );

  useEffect(() => {
    refreshSummary();
    const id = setInterval(refreshSummary, 60000);
    return () => clearInterval(id);
  }, [refreshSummary]);

  useEffect(() => {
    if (open) refreshList(tab);
  }, [open, tab, refreshList]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const badge = (summary?.unread ?? 0) + (summary?.openActions ?? 0) > 0 ? Math.max(summary?.unread ?? 0, summary?.openActions ?? 0) : 0;

  async function openItem(n: NotificationRowData) {
    setOpen(false);
    if (!n.read) await api.markNotificationRead(n.id).catch(() => undefined);
    refreshSummary();
  }
  async function toggle(n: NotificationRowData) {
    await (n.actionStatus === "DONE" ? api.reopenNotification(n.id) : api.completeNotification(n.id)).catch(() => undefined);
    refreshList(tab);
    refreshSummary();
  }
  async function readAll() {
    await api.markAllNotificationsRead().catch(() => undefined);
    refreshList(tab);
    refreshSummary();
  }

  const tabBtn = (t: "all" | "actions", label: string) => (
    <button
      type="button"
      onClick={() => setTab(t)}
      style={{ flex: 1, padding: "10px 0", border: "none", background: "none", cursor: "pointer", fontSize: 13, fontWeight: 650, color: tab === t ? "var(--u-org-accent, var(--u-brand-violet))" : "var(--u-ink-secondary)", borderBottom: `2px solid ${tab === t ? "var(--u-org-accent, var(--u-brand-violet))" : "transparent"}` }}
    >
      {label}
    </button>
  );

  return (
    <div ref={ref} style={{ position: "relative", display: "flex" }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={badge ? `Notifications, ${badge} need attention` : "Notifications"}
        aria-expanded={open}
        title="Notifications"
        style={{ border: "none", background: "none", padding: 0, cursor: "pointer", color: "var(--u-ink-secondary)", display: "flex", position: "relative" }}
      >
        <BellIcon size={18} />
        {badge > 0 && (
          <span style={{ position: "absolute", top: -6, right: -8, minWidth: 16, height: 16, padding: "0 4px", borderRadius: 8, background: (summary?.overdueActions ?? 0) > 0 ? "var(--u-status-critical)" : "var(--u-org-accent, var(--u-brand-violet))", color: "var(--u-org-accent-on, #fff)", fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1 }}>
            {badge > 99 ? "99+" : badge}
          </span>
        )}
      </button>
      {open && (
        <div role="dialog" aria-label="Notifications" style={{ position: "absolute", top: "calc(100% + 10px)", right: 0, width: 360, maxWidth: "calc(100vw - 24px)", background: "var(--u-surface-raised, var(--u-surface))", border: "1px solid var(--u-border)", borderRadius: "var(--u-radius-md)", boxShadow: "var(--u-shadow-card)", zIndex: 60, overflow: "hidden" }}>
          <div style={{ display: "flex", borderBottom: "1px solid var(--u-border)" }}>
            {tabBtn("all", `Notifications${summary?.unread ? ` (${summary.unread})` : ""}`)}
            {tabBtn("actions", `My actions${summary?.openActions ? ` (${summary.openActions})` : ""}`)}
          </div>
          <ul style={{ listStyle: "none", margin: 0, padding: 0, maxHeight: "min(60vh, 420px)", overflowY: "auto" }}>
            {items === null && !failed && <li style={{ padding: 16, fontSize: 13, color: "var(--u-ink-secondary)" }}>Loading…</li>}
            {failed && <li style={{ padding: 16, fontSize: 13, color: "var(--u-ink-secondary)" }}>Couldn’t load notifications.</li>}
            {items?.length === 0 && <li style={{ padding: 16, fontSize: 13, color: "var(--u-ink-secondary)" }}>{tab === "actions" ? "No open actions — you’re all caught up." : "Nothing yet."}</li>}
            {items?.map((n) => <NotificationRow key={n.id} n={n} LinkComponent={LinkComponent} compact onOpen={openItem} onToggleDone={toggle} />)}
          </ul>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 12px", borderTop: "1px solid var(--u-border)", fontSize: 12 }}>
            <button type="button" onClick={readAll} style={{ border: "none", background: "none", cursor: "pointer", color: "var(--u-ink-secondary)", padding: 0, fontSize: 12 }}>
              Mark all read
            </button>
            <Link href={viewAllHref} onClick={() => setOpen(false)} style={{ color: "var(--u-org-accent, var(--u-brand-violet))", fontWeight: 650, textDecoration: "none" }}>
              View all
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

/** Dashboard shortlist: the user's most pressing open actions, tick to complete. */
export function ActionsCard({ api, LinkComponent, viewAllHref = "/notifications?tab=actions" }: { api: NotificationsApi; LinkComponent: any; viewAllHref?: string }) {
  const Link = LinkComponent;
  const [summary, setSummary] = useState<NotificationSummaryData | null>(null);
  const load = useCallback(() => api.getNotificationSummary().then(setSummary).catch(() => undefined), [api]);
  useEffect(() => {
    load();
  }, [load]);

  async function toggle(n: NotificationRowData) {
    await api.completeNotification(n.id).catch(() => undefined);
    load();
  }

  return (
    <section style={{ border: "1px solid var(--u-border)", borderRadius: "var(--u-radius-lg, 12px)", background: "var(--u-surface)", overflow: "hidden", marginBottom: 32 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 16px", gap: 12, flexWrap: "wrap" }}>
        <h2 style={{ margin: 0, fontSize: 16 }}>
          My actions
          {summary && summary.openActions > 0 && <span style={{ marginLeft: 8, fontSize: 12, fontWeight: 700, padding: "2px 8px", borderRadius: 10, background: "color-mix(in srgb, var(--u-org-accent, var(--u-brand-violet)) 14%, transparent)", color: "var(--u-org-accent, var(--u-brand-violet))" }}>{summary.openActions} open</span>}
          {summary && summary.overdueActions > 0 && <span style={{ marginLeft: 6, fontSize: 12, fontWeight: 700, color: "var(--u-status-critical)" }}>{summary.overdueActions} overdue</span>}
        </h2>
        <Link href={viewAllHref} style={{ fontSize: 13, fontWeight: 650, color: "var(--u-org-accent, var(--u-brand-violet))", textDecoration: "none" }}>
          View all
        </Link>
      </div>
      <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
        {summary === null && <li style={{ padding: "12px 16px", fontSize: 13, color: "var(--u-ink-secondary)", borderTop: "1px solid var(--u-border)" }}>Loading…</li>}
        {summary && summary.nextActions.length === 0 && (
          <li style={{ padding: "14px 16px", fontSize: 13, color: "var(--u-ink-secondary)", borderTop: "1px solid var(--u-border)" }}>Nothing waiting on you. Actions assigned to you on a project will appear here.</li>
        )}
        {summary?.nextActions.map((n) => <NotificationRow key={n.id} n={n} LinkComponent={LinkComponent} onToggleDone={toggle} />)}
      </ul>
    </section>
  );
}

const FILTERS: { key: "all" | "unread" | "actions" | "done"; label: string }[] = [
  { key: "actions", label: "My actions" },
  { key: "unread", label: "Unread" },
  { key: "all", label: "All" },
  { key: "done", label: "Completed" },
];

/** Full page: the signed-in user's notifications and actions, filterable.
 * Each app renders this at /notifications. */
export function NotificationsView({ api, LinkComponent }: { api: NotificationsApi; LinkComponent: any }) {
  const [filter, setFilter] = useState<"all" | "unread" | "actions" | "done">("actions");
  const [items, setItems] = useState<NotificationRowData[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const t = new URLSearchParams(window.location.search).get("tab");
      if (t === "all" || t === "unread" || t === "done") setFilter(t);
    } catch {
      /* default tab */
    }
  }, []);

  const load = useCallback(() => {
    setItems(null);
    api.listNotifications(filter).then((r) => { setItems(r); setError(null); }).catch((e) => setError(e instanceof Error ? e.message : "Could not load"));
  }, [api, filter]);
  useEffect(load, [load]);

  async function toggle(n: NotificationRowData) {
    await (n.actionStatus === "DONE" ? api.reopenNotification(n.id) : api.completeNotification(n.id)).catch(() => undefined);
    load();
  }
  async function open(n: NotificationRowData) {
    if (!n.read) await api.markNotificationRead(n.id).catch(() => undefined);
  }

  // Group actions by what they are about (category), then show newest first.
  const groups = new Map<string, NotificationRowData[]>();
  for (const n of items ?? []) {
    const cat = String((n as any).category ?? "PROJECT");
    const label = ({ PROJECT: "Projects", QUALITY: "Quality", LOGISTICS: "Logistics", RISK: "Risk", SYSTEM: "Platform" } as Record<string, string>)[cat] ?? cat;
    groups.set(label, [...(groups.get(label) ?? []), n]);
  }

  return (
    <main style={{ padding: "24px clamp(16px, 4vw, 32px)", maxWidth: 820 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <h1 style={{ margin: 0 }}>Notifications &amp; actions</h1>
        <button type="button" onClick={() => api.markAllNotificationsRead().then(load)} style={{ border: "1px solid var(--u-border)", background: "var(--u-surface)", borderRadius: "var(--u-radius-md)", padding: "7px 12px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
          Mark all read
        </button>
      </div>
      <div role="tablist" style={{ display: "flex", gap: 6, flexWrap: "wrap", margin: "16px 0" }}>
        {FILTERS.map((f) => (
          <button
            key={f.key}
            role="tab"
            aria-selected={filter === f.key}
            onClick={() => setFilter(f.key)}
            style={{ padding: "6px 14px", borderRadius: 999, fontSize: 13, fontWeight: 650, cursor: "pointer", border: "1px solid var(--u-border)", background: filter === f.key ? "var(--u-org-accent, var(--u-brand-violet))" : "var(--u-surface)", color: filter === f.key ? "var(--u-org-accent-on, #fff)" : "var(--u-ink)" }}
          >
            {f.label}
          </button>
        ))}
      </div>
      {error && <p style={{ color: "var(--u-status-critical)" }}>{error}</p>}
      {items === null && !error && <p style={{ color: "var(--u-ink-secondary)" }}>Loading…</p>}
      {items?.length === 0 && <p style={{ color: "var(--u-ink-secondary)" }}>{filter === "actions" ? "No open actions — you’re all caught up." : "Nothing here yet."}</p>}
      {[...groups.entries()].map(([label, rows]) => (
        <section key={label} style={{ marginBottom: 20 }}>
          <h3 style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 1, color: "var(--u-ink-secondary)", margin: "0 0 8px" }}>{label}</h3>
          <ul style={{ listStyle: "none", margin: 0, padding: 0, border: "1px solid var(--u-border)", borderRadius: "var(--u-radius-lg, 12px)", background: "var(--u-surface)", overflow: "hidden" }}>
            {rows.map((n) => (
              <NotificationRow key={n.id} n={n} LinkComponent={LinkComponent} onOpen={open} onToggleDone={toggle} />
            ))}
          </ul>
        </section>
      ))}
    </main>
  );
}
