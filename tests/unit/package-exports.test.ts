import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

describe("MCP package exports compatibility", () => {
  it("keeps previously importable dist paths available", () => {
    const script = `
      await import("@runapi.ai/mcp-core/dist/config.js");
      await import("@runapi.ai/mcp/dist/src/server.js");
    `;
    const result = spawnSync(process.execPath, ["--input-type=module", "-e", script], {
      cwd: process.cwd(),
      encoding: "utf8"
    });

    expect(result.stderr).toBe("");
    expect(result.status).toBe(0);
  });
});
