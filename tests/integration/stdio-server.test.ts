import fs from "node:fs";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

describe("stdio MCP server", () => {
  let client: Client | undefined;
  let transport: StdioClientTransport | undefined;
  let tempHome: string | undefined;
  let api: Server | undefined;

  afterEach(async () => {
    await client?.close();
    await transport?.close();
    await new Promise<void>((resolve, reject) => api?.close((error) => error ? reject(error) : resolve()) ?? resolve());
    if (tempHome) {
      fs.rmSync(tempHome, { recursive: true, force: true });
    }
    client = undefined;
    transport = undefined;
    tempHome = undefined;
    api = undefined;
  });

  it("lists and calls tools through the real stdio transport", async () => {
    // tsx may live in this package's node_modules or be hoisted to the workspace root.
    const tsxPath = [
      path.resolve("node_modules/.bin/tsx"),
      path.resolve("../../node_modules/.bin/tsx")
    ].find((candidate) => fs.existsSync(candidate));
    expect(tsxPath).toBeDefined();
    tempHome = fs.mkdtempSync(path.join(os.tmpdir(), "runapi-mcp-home-"));

    api = createRuntimeApi();
    await new Promise<void>((resolve) => api!.listen(0, "127.0.0.1", resolve));
    const apiUrl = `http://127.0.0.1:${(api.address() as AddressInfo).port}`;

    client = new Client({ name: "runapi-mcp-test", version: "0.1.0" });
    transport = new StdioClientTransport({
      command: tsxPath!,
      args: ["src/index.ts"],
      cwd: process.cwd(),
      stderr: "pipe",
      env: {
        HOME: tempHome,
        PATH: process.env.PATH || "",
        RUNAPI_API_KEY: "stdio-test-key",
        RUNAPI_BASE_URL: apiUrl
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

    const pricing = await client.callTool({
      name: "check_pricing",
      arguments: {service: "flux-kontext", action: "text_to_image", model: "flux-kontext-pro"}
    });
    expect(JSON.parse(textContent(pricing))).toMatchObject({
      supported: true,
      price: {price_schedule: {unit_price_cents: 37}}
    });

    const unavailablePricing = await client.callTool({
      name: "get_model_info",
      arguments: {model: "flux-kontext-pro"}
    });
    expect(JSON.parse(textContent(unavailablePricing))).toMatchObject({
      price: {error: expect.stringContaining("https://runapi.ai/pricing")}
    });

    const task = await client.callTool({
      name: "get_task",
      arguments: {service: "flux-kontext", action: "text_to_image", task_id: "550e8400-e29b-41d4-a716-446655440000"}
    });
    expect(JSON.parse(textContent(task))).toMatchObject({
      task: {billing: {reservation: {amount_cents: 37}, settlement: {charged_amount_cents: 37, amount_micro_cents: 37_000_000}, refund: null}}
    });
  });
});

function createRuntimeApi(): Server {
  let priceScheduleRequests = 0;
  return createServer((request, response) => {
    response.setHeader("content-type", "application/json");
    if (request.url === "/v1/models") {
      response.end(JSON.stringify({data: []}));
    } else if (request.url?.startsWith("/api/v1/price_schedules")) {
      priceScheduleRequests += 1;
      if (priceScheduleRequests > 1) {
        response.statusCode = 503;
        response.end(JSON.stringify({message: "runtime pricing unavailable"}));
        return;
      }
      response.end(JSON.stringify({
        as_of: "2026-07-23T00:00:00.000000Z",
        price_schedules: [{service: "flux_kontext", action: "text_to_image", model: "flux-kontext-pro", unit_price_cents: 37}]
      }));
    } else if (request.url?.includes("550e8400-e29b-41d4-a716-446655440000")) {
      response.end(JSON.stringify({
        id: "550e8400-e29b-41d4-a716-446655440000",
        status: "completed",
        billing: {reservation: {amount_cents: 37}, settlement: {charged_amount_cents: 37, amount_micro_cents: 37_000_000}, refund: null}
      }));
    } else {
      response.statusCode = 404;
      response.end(JSON.stringify({message: "not found"}));
    }
  });
}

function textContent(result: Awaited<ReturnType<Client["callTool"]>>): string {
  const content = result.content?.[0];
  if (!content || content.type !== "text") {
    throw new Error("Expected text tool response");
  }

  return content.text;
}
