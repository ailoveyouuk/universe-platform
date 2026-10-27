import Link from "next/link";
import { SOURCES, type SourceKey } from "../lib/sources";

/** A small "Source" line under a tile, chart or table (2026-10-27). Words come from lib/sources.ts; the full explanation is on the Methodology page. */
export function SourceNote({ keys }: { keys: SourceKey[] }) {
  const anchor = SOURCES[keys[0]].anchor;
  return (
    <p style={{ margin: "2px 0 0", fontSize: 11.5, lineHeight: 1.5, color: "var(--u-ink-secondary)" }}>
      Source: {keys.map((k) => SOURCES[k].short).join(" ")} <Link href={`/methodology#${anchor}`} style={{ whiteSpace: "nowrap" }}>Methodology</Link>
    </p>
  );
}
