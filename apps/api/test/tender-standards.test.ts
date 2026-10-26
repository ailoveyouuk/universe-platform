import { describe, expect, it } from "vitest";
import { GUIDANCE, STAGE_ORDER, STANDARD_SOURCES, guidanceFor } from "@universe/types";

describe("tender standards guidance", () => {
  it("has unique ids and every reference points at a known source", () => {
    expect(new Set(GUIDANCE.map((g) => g.id)).size).toBe(GUIDANCE.length);
    for (const g of GUIDANCE) for (const r of g.refs) expect(STANDARD_SOURCES[r.src], `${g.id} -> ${r.src}`).toBeDefined();
  });
  it("every item cites at least one source, apart from none that claim a source-less rule", () => {
    for (const g of GUIDANCE) expect(g.refs.length, g.id).toBeGreaterThan(0);
  });
  it("covers every stage, and both audiences are served at the bid and call-off stages", () => {
    for (const s of STAGE_ORDER) expect(guidanceFor(s).length, s).toBeGreaterThan(0);
    expect(guidanceFor("BID", "BIDDER").length).toBeGreaterThan(0);
    expect(guidanceFor("CALL_OFF", "BIDDER").length).toBeGreaterThan(0);
  });
  it("only gives a clause, article or paragraph for a source that was read at least in part", () => {
    for (const g of GUIDANCE) for (const r of g.refs) if (r.at) expect(STANDARD_SOURCES[r.src].basis, `${g.id} ${r.src}`).not.toBe("principle");
  });
  it("every source has a note saying what was read, and the 'principle' ones carry no clause numbers", () => {
    for (const s of Object.values(STANDARD_SOURCES)) expect(s.note.length, s.id).toBeGreaterThan(20);
    for (const g of GUIDANCE) for (const r of g.refs) if (STANDARD_SOURCES[r.src].basis === "principle") expect(r.at, `${g.id} ${r.src}`).toBeUndefined();
  });
  it("links only to https pages", () => { for (const s of Object.values(STANDARD_SOURCES)) if (s.url) expect(s.url.startsWith("https://")).toBe(true); });
});
