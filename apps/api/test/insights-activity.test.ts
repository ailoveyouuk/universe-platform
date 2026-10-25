import { describe, expect, it } from "vitest";
import { rankActivity } from "../../../packages/insights-db/src/activity";

const row = (day: string, metric: string, events: number, organisations = 6) => ({ day, metric, events, organisations });

describe("rankActivity", () => {
  it("ranks by the latest day's count and compares with the previous seven days", () => {
    const rows = [row("2026-10-24", "LINES_ADDED", 30), ...[17, 18, 19, 20, 21, 22, 23].map((d) => row(`2026-10-${d}`, "LINES_ADDED", 10)), row("2026-10-24", "PROJECTS_STARTED", 5)];
    const out = rankActivity(rows, 4);
    expect(out.day).toBe("2026-10-24");
    expect(out.metrics[0]!.id).toBe("LINES_ADDED");
    expect(out.metrics[0]!.avgPrevious7).toBe(10);
    expect(out.metrics[0]!.changePct).toBe(200);
    expect(out.metrics[0]!.series).toHaveLength(14);
    expect(out.metrics[1]!.changePct).toBeNull();
  });
  it("limits the number of metrics and returns nothing for no rows", () => {
    expect(rankActivity([], 4)).toEqual({ day: null, metrics: [] });
    const many = ["LINES_ADDED", "PROJECTS_STARTED", "BIDS_SUBMITTED"].map((m, i) => row("2026-10-24", m, 10 + i));
    expect(rankActivity(many, 2).metrics).toHaveLength(2);
  });
});
