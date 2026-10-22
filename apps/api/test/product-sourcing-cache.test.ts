import { beforeEach, describe, expect, it, vi } from "vitest";

const calls = vi.fn();
vi.mock("@universe/insights-db", () => ({ getAggregatedProductSourcing: (sim: boolean) => calls(sim) }));

import { ProductSourcingInsightsService, SOURCING_CACHE_MS } from "../src/product-sourcing-insights/product-sourcing-insights.service";

describe("sourcing map cache", () => {
  beforeEach(() => calls.mockReset());
  it("reads the database once per audience within ten minutes, then again after", async () => {
    calls.mockResolvedValue([{ category: "A", manufactureCountryCode: "IN", sourceCount: 3, approvalCount: "5" }]);
    const s = new ProductSourcingInsightsService();
    expect(await s.getGlobalSourcing(false, 1000)).toEqual([{ category: "A", manufactureCountryCode: "IN", sourceCount: 3, approvalCount: 5 }]);
    await s.getGlobalSourcing(false, 2000);
    expect(calls).toHaveBeenCalledTimes(1);
    await s.getGlobalSourcing(true, 2000);          // demo audience is separate
    expect(calls).toHaveBeenCalledTimes(2);
    await s.getGlobalSourcing(false, 1000 + SOURCING_CACHE_MS + 1);
    expect(calls).toHaveBeenCalledTimes(3);
  });
  it("does not remember a failure", async () => {
    calls.mockRejectedValueOnce(new Error("boom")).mockResolvedValue([]);
    const s = new ProductSourcingInsightsService();
    await expect(s.getGlobalSourcing(false, 1000)).rejects.toThrow("boom");
    await new Promise((r) => setTimeout(r, 0));
    await expect(s.getGlobalSourcing(false, 1001)).resolves.toEqual([]);
  });
});
