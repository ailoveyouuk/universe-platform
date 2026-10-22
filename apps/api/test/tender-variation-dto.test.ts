import "reflect-metadata";
import { describe, expect, it } from "vitest";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { CallOffReasonDto, OptionalReasonDto } from "../src/tenders/dto/tenders.dto";

describe("withdrawing a variation", () => {
  it("accepts no reason, because the screen says the reason is optional", async () => {
    expect(await validate(plainToInstance(OptionalReasonDto, {}))).toHaveLength(0);
    expect(await validate(plainToInstance(OptionalReasonDto, { reason: "" }))).toHaveLength(0);
    expect(await validate(plainToInstance(OptionalReasonDto, { reason: "Agreed by phone" }))).toHaveLength(0);
  });
  it("still requires a reason where one is mandatory", async () => {
    expect((await validate(plainToInstance(CallOffReasonDto, { reason: "" }))).length).toBeGreaterThan(0);
  });
});
