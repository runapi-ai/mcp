import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

describe("stdio MCP server", () => {
  let client: Client | undefined;
  let transport: StdioClientTransport | undefined;
  let tempHome: string | undefined;

  afterEach(async () => {
    await client?.close();
    await transport?.close();
    if (tempHome) {
      fs.rmSync(tempHome, { recursive: true, force: true });
    }
    client = undefined;
    transport = undefined;
    tempHome = undefined;
  });

  it("lists and calls tools through the real stdio transport", async () => {
    // tsx may live in this package's node_modules or be hoisted to the workspace root.
    const tsxPath = [
      path.resolve("node_modules/.bin/tsx"),
      path.resolve("../../node_modules/.bin/tsx")
    ].find((candidate) => fs.existsSync(candidate));
    expect(tsxPath).toBeDefined();
    tempHome = fs.mkdtempSync(path.join(os.tmpdir(), "runapi-mcp-home-"));

    client = new Client({ name: "runapi-mcp-test", version: "0.1.0" });
    transport = new StdioClientTransport({
      command: tsxPath!,
      args: ["src/index.ts"],
      cwd: process.cwd(),
      stderr: "pipe",
      env: {
        HOME: tempHome,
        PATH: process.env.PATH || ""
      }
    });

    await client.connect(transport);

    const tools = await client.listTools();
    expect(tools.tools.map((tool) => tool.name)).toEqual(expect.arrayContaining([
      "list_models",
      "get_model_info",
      "list_actions",
      "check_pricing",
      "search_prompts",
      "check_balance",
      "create_task",
      "get_task",
      "login"
    ]));
    expect(tools.tools).toHaveLength(9);
    expect(tools.tools.map((tool) => tool.name)).not.toContain("chat");

    const models = await client.callTool({
      name: "list_models",
      arguments: {
        modality: "image"
      }
    });
    expect(JSON.parse(textContent(models))).toMatchObject({
      source: expect.stringContaining("embedded catalog")
    });

    const balance = await client.callTool({
      name: "check_balance",
      arguments: {}
    });
    expect(JSON.parse(textContent(balance)).error).toContain("login tool");
  });
});

function textContent(result: Awaited<ReturnType<Client["callTool"]>>): string {
  const content = result.content?.[0];
  if (!content || content.type !== "text") {
    throw new Error("Expected text tool response");
  }

  return content.text;
}
