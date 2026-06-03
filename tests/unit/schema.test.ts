import { describe, expect, it } from "vitest";
import { z } from "zod";
import { validateParams } from "../../src/lib/schema.js";

describe("schema validation", () => {
  it("validates required enum fields", () => {
    const result = validateParams({
      size: {
        required: true,
        enum: ["1:1", "16:9"]
      }
    }, {
      size: "1:1",
      prompt: "hello"
    });

    expect(result).toMatchObject({ size: "1:1", prompt: "hello" });
  });

  it("rejects invalid enum values", () => {
    expect(() => validateParams({
      size: {
        enum: ["1:1", "16:9"]
      }
    }, {
      size: "bad"
    })).toThrow(z.ZodError);
  });
});
