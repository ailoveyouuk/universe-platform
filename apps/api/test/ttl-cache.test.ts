import { beforeEach, describe, expect, it, vi } from "vitest";
import { cached, clearCache, invalidate } from "../src/common/ttl-cache";

describe("ttl cache", () => {
  beforeEach(clearCache);
  it("computes once within the ttl, shares an in-flight call, and recomputes after", async () => {
    const f = vi.fn().mockResolvedValue(1);
    const [a, b] = await Promise.all([cached("k", 1000, f, 0), cached("k", 1000, f, 10)]);
    expect([a, b]).toEqual([1, 1]);
    expect(f).toHaveBeenCalledTimes(1);
    await cached("k", 1000, f, 1001);
    expect(f).toHaveBeenCalledTimes(2);
  });
  it("drops a family of keys on invalidate, and never remembers a failure", async () => {
    const f = vi.fn().mockResolvedValue(1);
    await cached("safety:dashboard:true", 60000, f, 0); await cached("safety:dashboard:false", 60000, f, 0); await cached("regulatory:x", 60000, f, 0);
    expect(f).toHaveBeenCalledTimes(3);
    invalidate("safety:");
    await cached("safety:dashboard:true", 60000, f, 1); await cached("regulatory:x", 60000, f, 1);
    expect(f).toHaveBeenCalledTimes(4);
    const bad = vi.fn().mockRejectedValueOnce(new Error("x")).mockResolvedValue(2);
    await expect(cached("bad", 1000, bad, 0)).rejects.toThrow("x");
    await new Promise((r) => setTimeout(r, 0));
    await expect(cached("bad", 1000, bad, 1)).resolves.toBe(2);
  });
});
