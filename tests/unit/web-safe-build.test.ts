import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  checkWebSafeBuild,
  isLocalOnlyInput
} from "../../scripts/check-web-safe-build.js";

describe("Business Tools browser build gate", () => {
  it("rejects a browser-safe artifact that imports a Local-only module", async () => {
    const fixture = path.resolve("tests/fixtures/hosted-imports-local-only.ts");

    await expect(checkWebSafeBuild(fixture)).rejects.toThrow(
      /Local-only modules:[\s\S]*server-instructions\.ts/
    );
  });

  it("rejects an artifact that imports a Node builtin", async () => {
    const fixture = path.resolve("tests/fixtures/hosted-imports-node-builtin.ts");

    await expect(checkWebSafeBuild(fixture)).rejects.toThrow(
      /browser build failed:[\s\S]*node:fs/
    );
  });

  it("recognizes Local-only inputs with Windows path separators", () => {
    expect(isLocalOnlyInput(
      "C:\\workspace\\mcp\\packages\\aggregate\\src\\server-instructions.ts"
    )).toBe(true);
  });

  it("recognizes Local-only inputs from the split repository root", () => {
    expect(isLocalOnlyInput("/workspace/mcp/src/server-instructions.ts")).toBe(true);
  });
});
