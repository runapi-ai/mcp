import { afterEach, describe, expect, it, vi } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { RunApiClientError } from "@runapi.ai/mcp-core/web";
import {
  createBusinessServer,
  createDiscoveryServer,
  type BusinessToolClient
} from "@runapi.ai/mcp/business-tools";
import type { Contract, PricingConfig } from "../../src/types.js";

const contract: Contract = {
  catalog_models: ["hosted-only-model"],
  actions: {
    "hosted-fixture/text_to_image": {
      model: "hosted-fixture",
      endpoint: "text_to_image",
      models: ["hosted-only-model"],
      fields_by_model: {
        "hosted-only-model": {
          prompt: { type: "string", required: true }
        }
      }
    }
  }
};
const pricing: PricingConfig = {
  endpoints: {
    "hosted-only-model/text_to_image": { unit_price_cents: 314 }
  }
};

const client: BusinessToolClient = {
  listModels: async () => ({ data: [] }),
  searchPrompts: async () => ({
    prompts: [],
    pagination: { page: 1, per_page: 20, total: 0, pages: 0 }
  }),
  balance: async () => ({ balance_cents: 0 }),
  createTask: async () => ({ id: "task_1", status: "queued" }),
  getTask: async () => ({ id: "task_1", status: "completed" }),
  pollTask: async () => ({ id: "task_1", status: "completed" })
};

let mcpClient: Client | undefined;

afterEach(async () => {
  await mcpClient?.close();
  mcpClient = undefined;
});

describe("Business Tools composition", () => {
  it("exposes exactly the five Hosted discovery tools", async () => {
    const server = createDiscoveryServer({
      name: "runapi-hosted-discovery-test",
      version: "0.0.0",
      contract,
      pricing,
      client
    });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    mcpClient = new Client({ name: "hosted-discovery-test", version: "0.0.0" });

    await Promise.all([
      server.connect(serverTransport),
      mcpClient.connect(clientTransport)
    ]);

    const tools = await mcpClient.listTools();

    expect(tools.tools.map((tool) => tool.name).sort()).toEqual([
      "check_pricing",
      "get_model_info",
      "list_actions",
      "list_models",
      "search_prompts"
    ]);
  });

  it("exposes exactly the eight Business Tools without Local Login", async () => {
    const server = createBusinessServer({
      name: "runapi-business-tools-test",
      version: "0.0.0",
      contract,
      pricing,
      client
    });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    mcpClient = new Client({ name: "business-tools-test", version: "0.0.0" });

    await Promise.all([
      server.connect(serverTransport),
      mcpClient.connect(clientTransport)
    ]);

    const tools = await mcpClient.listTools();

    expect(tools.tools.map((tool) => tool.name).sort()).toEqual([
      "check_balance",
      "check_pricing",
      "create_task",
      "get_model_info",
      "get_task",
      "list_actions",
      "list_models",
      "search_prompts"
    ]);
    const createTask = tools.tools.find((tool) => tool.name === "create_task");
    expect(createTask?.inputSchema.required).toContain("idempotency_key");
    expect(createTask?.inputSchema.properties?.timeout_ms).not.toHaveProperty("maximum");
  });

  it("forwards the caller's opaque idempotency key to the injected task client", async () => {
    const createTask = vi.fn(async () => ({ id: "task_1", status: "queued" }));
    const server = createBusinessServer({
      name: "runapi-business-tools-test",
      version: "0.0.0",
      contract,
      pricing,
      client: {...client, createTask}
    });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    mcpClient = new Client({ name: "business-tools-test", version: "0.0.0" });

    await Promise.all([
      server.connect(serverTransport),
      mcpClient.connect(clientTransport)
    ]);

    await mcpClient.callTool({
      name: "create_task",
      arguments: {
        service: "hosted-fixture",
        action: "text_to_image",
        model: "hosted-only-model",
        params: {prompt: "fixture"},
        idempotency_key: "opaque-business-request-1",
        wait: false
      }
    });

    expect(createTask).toHaveBeenCalledWith(
      "hosted-fixture",
      "text_to_image",
      {model: "hosted-only-model", prompt: "fixture"},
      "opaque-business-request-1"
    );
  });

  it("marks task creation failures as MCP tool errors", async () => {
    const server = createBusinessServer({
      name: "runapi-business-tools-test",
      version: "0.0.0",
      contract,
      pricing,
      client: {
        ...client,
        createTask: async () => {
          throw new RunApiClientError("conflicting task input", 409);
        }
      }
    });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    mcpClient = new Client({ name: "business-tools-test", version: "0.0.0" });
    await Promise.all([
      server.connect(serverTransport),
      mcpClient.connect(clientTransport)
    ]);

    const result = await mcpClient.callTool({
      name: "create_task",
      arguments: {
        service: "hosted-fixture",
        action: "text_to_image",
        model: "hosted-only-model",
        params: {prompt: "fixture"},
        idempotency_key: "conflicting-business-request",
        wait: false
      }
    });

    expect(result.isError).toBe(true);
    expect(parseText(result).error).toBeTruthy();
  });

  it("does not mark post-creation polling failures as MCP tool errors", async () => {
    const server = createBusinessServer({
      name: "runapi-business-tools-test",
      version: "0.0.0",
      contract,
      pricing,
      client: {
        ...client,
        pollTask: async () => {
          throw new RunApiClientError("poll unavailable", 503);
        }
      }
    });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    mcpClient = new Client({ name: "business-tools-test", version: "0.0.0" });
    await Promise.all([
      server.connect(serverTransport),
      mcpClient.connect(clientTransport)
    ]);

    const result = await mcpClient.callTool({
      name: "create_task",
      arguments: {
        service: "hosted-fixture",
        action: "text_to_image",
        model: "hosted-only-model",
        params: {prompt: "fixture"},
        idempotency_key: "polling-business-request",
        wait: true
      }
    });

    expect(result.isError).not.toBe(true);
    expect(parseText(result)).toMatchObject({
      task_id: "task_1",
      status: "queued",
      hint: expect.stringContaining("get_task")
    });
  });

  it("serves model information and pricing from injected static data", async () => {
    const server = createBusinessServer({
      name: "runapi-business-tools-test",
      version: "0.0.0",
      contract,
      pricing,
      client
    });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    mcpClient = new Client({ name: "business-tools-test", version: "0.0.0" });

    await Promise.all([
      server.connect(serverTransport),
      mcpClient.connect(clientTransport)
    ]);

    const modelInfo = await mcpClient.callTool({
      name: "get_model_info",
      arguments: { model: "hosted-only-model" }
    });
    const checkedPrice = await mcpClient.callTool({
      name: "check_pricing",
      arguments: {
        service: "hosted-fixture",
        action: "text_to_image",
        model: "hosted-only-model"
      }
    });

    expect(parseText(modelInfo)).toMatchObject({
      model: "hosted-only-model",
      service: "hosted-fixture",
      action: "text_to_image",
      price: {
        pricing: { unit_price_cents: 314 }
      }
    });
    expect(parseText(checkedPrice)).toMatchObject({
      supported: true,
      model: "hosted-only-model",
      price: {
        pricing: { unit_price_cents: 314 }
      }
    });
  });

  it("uses the client injected for this Business server", async () => {
    const balance = vi.fn(async () => ({ request_scope: "request-123" }));
    const server = createBusinessServer({
      name: "runapi-business-tools-test",
      version: "0.0.0",
      contract,
      pricing,
      client: { ...client, balance }
    });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    mcpClient = new Client({ name: "business-tools-test", version: "0.0.0" });

    await Promise.all([
      server.connect(serverTransport),
      mcpClient.connect(clientTransport)
    ]);

    const result = await mcpClient.callTool({ name: "check_balance", arguments: {} });

    expect(balance).toHaveBeenCalledOnce();
    expect(parseText(result)).toEqual({ request_scope: "request-123" });
  });

  it("does not direct Hosted authentication failures to Local Login or config", async () => {
    const server = createBusinessServer({
      name: "runapi-business-tools-test",
      version: "0.0.0",
      contract,
      pricing,
      client: {
        ...client,
        balance: async () => {
          throw new RunApiClientError("unauthorized", 401);
        }
      }
    });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    mcpClient = new Client({ name: "business-tools-test", version: "0.0.0" });

    await Promise.all([
      server.connect(serverTransport),
      mcpClient.connect(clientTransport)
    ]);

    const result = parseText(await mcpClient.callTool({
      name: "check_balance",
      arguments: {}
    }));

    expect(result.error).toContain("credentials attached to this MCP request");
    expect(result.error).not.toMatch(/login|~\/.config|RUNAPI_API_KEY/i);
  });
});

function parseText(result: Awaited<ReturnType<Client["callTool"]>>): Record<string, unknown> {
  const content = result.content?.[0];
  if (!content || content.type !== "text") {
    throw new Error("Expected text tool response");
  }

  return JSON.parse(content.text) as Record<string, unknown>;
}
