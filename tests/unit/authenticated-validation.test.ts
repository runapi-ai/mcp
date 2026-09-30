import { describe, expect, it, vi } from "vitest";
import { readContract } from "../../src/lib/data.js";
import { RunApiClientError } from "../../src/lib/errors.js";
import { friendlyError } from "@runapi.ai/mcp-core/web";
import {
  createTaskHandler as createTaskWith,
  defaultTimeout,
  getTaskHandler as getTaskWith,
} from "../../src/tools/authenticated-handlers.js";

const contract = readContract();

function createTaskHandler(
  input: Parameters<typeof createTaskWith>[0],
  client: Parameters<typeof createTaskWith>[1],
  sendProgress?: Parameters<typeof createTaskWith>[4],
  progressToken?: Parameters<typeof createTaskWith>[5]
) {
  return createTaskWith(
    {idempotency_key: "unit-test-task-creation", ...input},
    client,
    contract,
    friendlyError,
    sendProgress,
    progressToken
  );
}

function getTaskHandler(
  input: Parameters<typeof getTaskWith>[0],
  client: Parameters<typeof getTaskWith>[1]
) {
  return getTaskWith(input, client, contract, friendlyError);
}

describe("authenticated tool handlers", () => {
  it("returns a helpful error for unsupported task combinations", async () => {
    const result = await createTaskHandler({
      service: "missing",
      action: "text_to_image",
      wait: false
    }, {
      createTask: vi.fn(),
      pollTask: vi.fn()
    });

    expect(result).toMatchObject({
      error: "Unsupported RunAPI service/action combination."
    });
  });

  it("gets task status and maps service errors", async () => {
    await expect(getTaskHandler({
      service: "suno",
      action: "text_to_music",
      task_id: "task_123"
    }, {
      getTask: vi.fn(async () => ({ id: "task_123", status: "completed" }))
    })).resolves.toMatchObject({
      status: "completed"
    });

    await expect(getTaskHandler({
      service: "suno",
      task_id: "task_123"
    }, {
      getTask: vi.fn(async () => {
        throw new RunApiClientError("busy", 503);
      })
    })).resolves.toMatchObject({
      error: expect.stringContaining("temporarily unavailable")
    });
  });

  it("passes API Task Billing Facts through without attaching a price schedule", async () => {
    const task = {id: "task_123", status: "completed", billing: {reservation: {amount_cents: 5}, settlement: {charged_amount_cents: 5, amount_micro_cents: 5_000_000}, refund: null}};
    const result = await getTaskHandler({service: "suno", action: "text_to_music", task_id: "task_123"}, {
      getTask: vi.fn(async () => task)
    });

    expect(result).toEqual({task_id: "task_123", status: "completed", task});
    expect(JSON.stringify(result)).not.toContain("price_schedule");
  });

  it("uses the 300 second Completion Wait deadline for every asynchronous action", () => {
    expect(defaultTimeout("text_to_video")).toBe(300_000);
    expect(defaultTimeout("text_to_image")).toBe(300_000);
    expect(defaultTimeout("text_to_music")).toBe(300_000);
    expect(defaultTimeout("text_to_speech")).toBe(300_000);
  });
});
