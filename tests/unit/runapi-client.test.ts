import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { friendlyError, PollTimeoutError, RunApiClientError } from "../../src/lib/errors.js";
import { RunApiClient, taskIdFromResponse, taskStatus } from "../../src/lib/runapi-client.js";

const TASK_ID = "123e4567-e89b-42d3-a456-426614174000";

describe("RunApiClient", () => {
  it("injects bearer auth for authenticated requests", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ balance_cents: 100 }));
    const client = new RunApiClient({ apiKey: "test_key", baseUrl: "https://runapi.ai" }, fetchImpl as any);

    await client.balance();

    expect(fetchImpl).toHaveBeenCalledWith(new URL("https://runapi.ai/api/v1/me/balance"), expect.objectContaining({
      headers: expect.objectContaining({
        authorization: "Bearer test_key"
      })
    }));
  });

  it("reloads the default config for authenticated requests", async () => {
    const originalHome = process.env.HOME;
    const tempHome = fs.mkdtempSync(path.join(os.tmpdir(), "runapi-aggregate-client-home-"));
    const fetchImpl = vi.fn(async () => jsonResponse({ balance_cents: 100 }));

    try {
      process.env.HOME = tempHome;
      const client = new RunApiClient(undefined, fetchImpl as any);
      const configFile = path.join(tempHome, ".config", "runapi", "config.json");
      fs.mkdirSync(path.dirname(configFile), { recursive: true });
      fs.writeFileSync(configFile, JSON.stringify({ api_key: "new_token" }));

      await client.balance();

      expect(fetchImpl).toHaveBeenCalledWith(new URL("https://runapi.ai/api/v1/me/balance"), expect.objectContaining({
        headers: expect.objectContaining({ authorization: "Bearer new_token" })
      }));
    } finally {
      process.env.HOME = originalHome;
      fs.rmSync(tempHome, { recursive: true, force: true });
    }
  });

  it("does not require auth for list_models", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ data: [] }));
    const client = new RunApiClient({ baseUrl: "https://runapi.ai" }, fetchImpl as any);

    await client.listModels();

    expect(fetchImpl).toHaveBeenCalledWith(new URL("https://runapi.ai/v1/models"), expect.objectContaining({
      headers: expect.not.objectContaining({
        authorization: expect.any(String)
      })
    }));
  });

  it("does not require auth for search_prompts", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ prompts: [], pagination: { page: 1, per_page: 20, total: 0, pages: 0 } }));
    const client = new RunApiClient({ baseUrl: "https://runapi.ai" }, fetchImpl as any);

    await client.searchPrompts({
      modality: "image",
      q: "logo",
      tags: ["Logo", "Minimal"],
      model: "flux-kontext-pro",
      featured: true,
      page: 2,
      per_page: 10
    });

    expect(fetchImpl).toHaveBeenCalledWith(new URL("https://runapi.ai/api/v1/prompts?modality=image&tags=Logo%2CMinimal&q=logo&model=flux-kontext-pro&featured=true&page=2&per_page=10"), expect.objectContaining({
      headers: expect.not.objectContaining({
        authorization: expect.any(String)
      })
    }));
  });

  it("normalizes service slugs when creating tasks", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ id: TASK_ID, status: "queued" }));
    const client = new RunApiClient({ apiKey: "test_key", baseUrl: "https://runapi.ai" }, fetchImpl as any);

    await client.createTask("flux-kontext", "text_to_image", { prompt: "test" });

    expect(fetchImpl).toHaveBeenCalledWith(new URL("https://runapi.ai/api/v1/flux_kontext/text_to_image"), expect.objectContaining({
      method: "POST"
    }));
  });

  it("builds task routes using service/action/id for media polling", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ id: TASK_ID, status: "completed" }));
    const client = new RunApiClient({ apiKey: "test_key", baseUrl: "https://runapi.ai" }, fetchImpl as any);

    await client.getTask("flux-kontext", TASK_ID, "text_to_image");

    expect(fetchImpl).toHaveBeenCalledWith(new URL(`https://runapi.ai/api/v1/flux_kontext/text_to_image/${TASK_ID}`), expect.any(Object));
  });

  it("normalizes service slugs while polling tasks", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ id: TASK_ID, status: "completed" }));
    const client = new RunApiClient({ apiKey: "test_key", baseUrl: "https://runapi.ai" }, fetchImpl as any);

    await client.pollTask("flux-kontext", TASK_ID, "text_to_image", {
      intervalMs: 1,
      timeoutMs: 100
    });

    expect(fetchImpl).toHaveBeenCalledWith(new URL(`https://runapi.ai/api/v1/flux_kontext/text_to_image/${TASK_ID}`), expect.any(Object));
  });

  it("maps friendly errors", () => {
    expect(friendlyError(new RunApiClientError("bad", 402))).toContain("insufficient credits");
  });

  it("extracts task status and id", () => {
    expect(taskStatus({ data: { status: "COMPLETED" } })).toBe("completed");
    expect(taskIdFromResponse({ data: { task_id: "abc" } })).toBe("abc");
  });

  it("polls until a terminal status", async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ id: TASK_ID, status: "running" }))
      .mockResolvedValueOnce(jsonResponse({ id: TASK_ID, status: "completed" }));
    const client = new RunApiClient({ apiKey: "test_key", baseUrl: "https://runapi.ai" }, fetchImpl as any);
    const progress = vi.fn();

    const result = await client.pollTask("suno", TASK_ID, "text_to_music", {
      intervalMs: 1,
      timeoutMs: 100,
      onProgress: progress
    });

    expect(result.status).toBe("completed");
    expect(progress).toHaveBeenCalledTimes(2);
  });

  it("times out while polling non-terminal tasks", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ id: TASK_ID, status: "running" }));
    const client = new RunApiClient({ apiKey: "test_key", baseUrl: "https://runapi.ai" }, fetchImpl as any);

    await expect(client.pollTask("suno", TASK_ID, "text_to_music", {
      intervalMs: 1,
      timeoutMs: 5
    })).rejects.toThrow(PollTimeoutError);
  });

  it("transforms HTTP errors into client errors", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ message: "No credits" }, 402));
    const client = new RunApiClient({ apiKey: "test_key", baseUrl: "https://runapi.ai" }, fetchImpl as any);

    await expect(client.balance()).rejects.toMatchObject({
      name: "RunApiClientError",
      status: 402,
      message: "No credits"
    });
  });
});

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json"
    }
  });
}
