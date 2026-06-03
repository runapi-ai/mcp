import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { runInit } from "../../src/init.js";

describe("init", () => {
  const cwd = process.cwd();

  afterEach(() => {
    process.chdir(cwd);
    vi.restoreAllMocks();
  });

  it("writes Claude MCP config", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "runapi-mcp-"));
    process.chdir(dir);
    vi.spyOn(console, "log").mockImplementation(() => undefined);

    await runInit(["claude"]);

    const json = JSON.parse(fs.readFileSync(path.join(dir, ".mcp.json"), "utf8"));
    expect(json.mcpServers.runapi).toMatchObject({
      command: "npx",
      args: ["-y", "@runapi.ai/mcp"]
    });
  });

  it.each([
    ["cursor", ".cursor/mcp.json"],
    ["windsurf", ".windsurf/mcp.json"],
    ["roo", ".roo/mcp.json"]
  ])("writes %s MCP config", async (platform, relativePath) => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "runapi-mcp-"));
    process.chdir(dir);
    vi.spyOn(console, "log").mockImplementation(() => undefined);

    await runInit([platform]);

    const json = JSON.parse(fs.readFileSync(path.join(dir, relativePath), "utf8"));
    expect(json.mcpServers.runapi).toMatchObject({
      command: "npx",
      args: ["-y", "@runapi.ai/mcp"]
    });
  });

  it("writes VS Code stdio server config", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "runapi-mcp-"));
    process.chdir(dir);
    vi.spyOn(console, "log").mockImplementation(() => undefined);

    await runInit(["vscode"]);

    const json = JSON.parse(fs.readFileSync(path.join(dir, ".vscode/mcp.json"), "utf8"));
    expect(json.servers.runapi).toMatchObject({
      type: "stdio",
      command: "npx",
      args: ["-y", "@runapi.ai/mcp"]
    });
  });
});
