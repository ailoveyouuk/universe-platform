import { beforeEach, describe, expect, it } from "vitest";
import { rateLimit, resetRateLimits } from "../src/common/rate-limit";

describe("rateLimit", () => {
  beforeEach(resetRateLimits);
  it("allows up to the limit, then refuses with 429 and a wait time", () => {
    for (let i = 0; i < 3; i++) rateLimit("u1", "x", 3, 60_000, 1000 + i);
    expect(() => rateLimit("u1", "x", 3, 60_000, 1010)).toThrow(/Too many requests/);
    try { rateLimit("u1", "x", 3, 60_000, 1010); } catch (e) { expect((e as { getStatus(): number }).getStatus()).toBe(429); }
  });
  it("is per user and per key, and recovers after the window", () => {
    for (let i = 0; i < 3; i++) rateLimit("u1", "x", 3, 60_000, 1000);
    expect(() => rateLimit("u2", "x", 3, 60_000, 1001)).not.toThrow();
    expect(() => rateLimit("u1", "y", 3, 60_000, 1001)).not.toThrow();
    expect(() => rateLimit("u1", "x", 3, 60_000, 1000 + 60_001)).not.toThrow();
  });
});
