import { createHash, randomUUID } from "node:crypto";
import { withPlatformStaffContext } from "@universe/db";

export interface TenderEventInput {
  organizationId: string;
  counterpartyOrganizationId?: string | null;
  tenderId: string;
  actorOrganizationId: string;
  actorUserId?: string | null;
  kind: string;
  summary: string;
  details?: unknown;
}

interface HashedFields {
  prevHash: string | null; id: string; tenderId: string; organizationId: string; counterpartyOrganizationId: string | null;
  actorOrganizationId: string; actorUserId: string | null; kind: string; summary: string; detailsJson: string | null; createdAt: Date;
}

/** SHA-256 over the previous event's hash and this event's content. Any later edit of an event, or removal of one from the middle, breaks the chain. */
export function eventHash(e: HashedFields): string {
  const body = JSON.stringify([e.prevHash ?? "", e.id, e.tenderId, e.organizationId, e.counterpartyOrganizationId ?? "", e.actorOrganizationId, e.actorUserId ?? "", e.kind, e.summary, e.detailsJson ?? "", e.createdAt.toISOString()]);
  return createHash("sha256").update(body).digest("hex");
}

/**
 * Appends one event to a tender's tamper-evident timeline (2026-10-19). It runs in a platform-staff context because the chain tail
 * must be read across both parties' rows, which a single organisation's session cannot see; the lock on the tail keeps concurrent
 * writers in sequence. The event is committed on its own, so a failure after it in the caller's transaction leaves the event behind;
 * that is judged safer for an audit log than the reverse.
 */
export async function appendTenderEvent(input: TenderEventInput): Promise<void> {
  await withPlatformStaffContext(async (tx) => {
    const tail = await tx.$queryRaw<{ hash: string | null }[]>`
      SELECT TOP 1 [hash] FROM [dbo].[tender_events] WITH (UPDLOCK, HOLDLOCK)
      WHERE [tenderId] = ${input.tenderId} AND [hash] IS NOT NULL ORDER BY [createdAt] DESC, [id] DESC`;
    const row: HashedFields = {
      prevHash: tail[0]?.hash ?? null, id: randomUUID(), tenderId: input.tenderId, organizationId: input.organizationId,
      counterpartyOrganizationId: input.counterpartyOrganizationId ?? null, actorOrganizationId: input.actorOrganizationId,
      actorUserId: input.actorUserId ?? null, kind: input.kind, summary: input.summary.slice(0, 500),
      detailsJson: input.details ? JSON.stringify(input.details) : null, createdAt: new Date(),
    };
    await tx.tenderEvent.create({ data: { ...row, hash: eventHash(row) } });
  });
}

/** Walks the chain from its first event by following prevHash links and recomputing every hash. Events written before 2026-10-19 carry no hash and are ignored. */
export function verifyChain(events: (HashedFields & { hash: string | null })[]): { ok: boolean; events: number; brokenAt: string | null } {
  const chained = events.filter((e) => e.hash);
  if (chained.length === 0) return { ok: true, events: 0, brokenAt: null };
  const byPrev = new Map<string, (typeof chained)[number][]>();
  for (const e of chained) byPrev.set(e.prevHash ?? "", [...(byPrev.get(e.prevHash ?? "") ?? []), e]);
  let prev = "";
  let seen = 0;
  for (;;) {
    const next = byPrev.get(prev);
    if (!next) break;
    if (next.length !== 1) return { ok: false, events: chained.length, brokenAt: next[0]!.id };
    const e = next[0]!;
    if (eventHash(e) !== e.hash) return { ok: false, events: chained.length, brokenAt: e.id };
    prev = e.hash!;
    seen++;
  }
  if (seen !== chained.length) {
    const reached = new Set<string>();
    let p = ""; for (;;) { const n = byPrev.get(p)?.[0]; if (!n) break; reached.add(n.id); p = n.hash!; }
    const orphan = chained.find((e) => !reached.has(e.id));
    return { ok: false, events: chained.length, brokenAt: orphan?.id ?? null };
  }
  return { ok: true, events: chained.length, brokenAt: null };
}
