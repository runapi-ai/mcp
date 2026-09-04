import { describe, expect, it, vi } from "vitest";
import { readContract } from "../../src/lib/data.js";
import { PollTimeoutError, RunApiClientError } from "../../src/lib/errors.js";
import { friendlyError } from "@runapi.ai/mcp-core/web";
import {
  checkBalanceHandler as checkBalanceWith,
  createTaskHandler as createTaskWith,
  defaultTimeout,
  getTaskHandler as getTaskWith,
  HybridTaskResolutionError
} from "../../src/tools/authenticated-handlers.js";
import { HYBRID_TASK_COMPLETION_DEADLINE_MS } from "../../src/hybrid-task-capability.js";

const contract = readContract();

function checkBalanceHandler(client: Parameters<typeof checkBalanceWith>[0]) {
  return checkBalanceWith(client, friendlyError);
}

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
  return getTaskWith(input, client, friendlyError);
}

describe("authenticated tool handlers", () => {
  it("checks balance and maps auth errors", async () => {
    await expect(checkBalanceHandler({
      balance: vi.fn(async () => ({ balance_cents: 100 }))
    })).resolves.toEqual({ balance_cents: 100 });

    await expect(checkBalanceHandler({
      balance: vi.fn(async () => {
        throw new RunApiClientError("bad key", 401);
      })
    })).resolves.toMatchObject({
      error: expect.stringContaining("API key")
    });
  });

  it("creates a task without polling", async () => {
    const created = { id: "task_123", status: "queued", billing: {reservation: {amount_cents: 5}, settlement: null, refund: null} };
    const createTask = vi.fn(async () => created);
    const result = await createTaskHandler({
      service: "flux-kontext",
      action: "text_to_image",
      model: "flux-kontext-pro",
      params: { prompt: "test" },
      idempotency_key: "local-create-task-1",
      wait: false
    }, {
      createTask,
      pollTask: vi.fn()
    });

    expect(createTask).toHaveBeenCalledWith(
      "flux-kontext",
      "text_to_image",
      expect.objectContaining({
        model: "flux-kontext-pro",
        prompt: "test"
      }),
      "local-create-task-1"
    );
    expect(result).toMatchObject({
      task_id: "task_123",
      status: "queued",
      created
    });
  });

  it("rejects a missing idempotency key before creating a paid task", async () => {
    const createTask = vi.fn();

    const result = await createTaskHandler({
      service: "flux-kontext",
      action: "text_to_image",
      model: "flux-kontext-pro",
      params: { prompt: "test" },
      idempotency_key: "",
      wait: false
    }, {
      createTask,
      pollTask: vi.fn()
    });

    expect(createTask).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      error: expect.stringContaining("idempotency_key")
    });
  });

  it("polls a task and emits progress", async () => {
    const progress = vi.fn();
    let progressOptions: Parameters<typeof progress>[0] | undefined;
    const result = await createTaskHandler({
      service: "flux-kontext",
      action: "text_to_image",
      model: "flux-kontext-pro",
      params: { prompt: "test" },
      wait: true,
      poll_interval_ms: 1
    }, {
      createTask: vi.fn(async () => ({ id: "task_123", status: "queued" })),
      pollTask: vi.fn(async (_service, _taskId, _action, options) => {
        await options.onProgress?.({ id: "task_123", status: "running" });
        return { id: "task_123", status: "completed", url: "https://example.test/out.png" };
      })
    }, (message) => {
      progressOptions = message;
      progress(message);
    }, "progress_1");

    expect(progress).toHaveBeenCalledWith(expect.objectContaining({
      progressToken: "progress_1",
      message: "RunAPI task task_123: running"
    }));
    expect(progressOptions?.progress).toBeLessThanOrEqual(progressOptions?.total ?? 0);
    expect(result).toMatchObject({
      task_id: "task_123",
      status: "completed",
      completed: true
    });
  });

  it("caps compatible timeout inputs at the 300 second Completion Wait deadline", async () => {
    let timeoutMs: number | undefined;
    await createTaskHandler({
      service: "flux-kontext",
      action: "text_to_image",
      model: "flux-kontext-pro",
      params: {prompt: "test"},
      idempotency_key: "compatible-long-timeout",
      wait: true,
      timeout_ms: 600_000
    }, {
      createTask: vi.fn(async () => ({id: "task_123", status: "queued"})),
      pollTask: vi.fn(async (_service, _taskId, _action, options) => {
        timeoutMs = options.timeoutMs;
        return {id: "task_123", status: "completed"};
      })
    });

    expect(timeoutMs).toBe(300_000);
  });

  it("preserves the task reference when polling fails after creation", async () => {
    const created = { id: "task_123", status: "queued" };
    const result = await createTaskHandler({
      service: "flux-kontext",
      action: "text_to_image",
      model: "flux-kontext-pro",
      params: { prompt: "test" },
      wait: true
    }, {
      createTask: vi.fn(async () => created),
      pollTask: vi.fn(async () => {
        throw new RunApiClientError("poll unavailable", 503);
      })
    });

    expect(result).toMatchObject({
      created,
      task_id: "task_123",
      status: "queued",
      warning: expect.stringContaining("temporarily unavailable"),
      hint: expect.stringContaining("get_task")
    });
    expect(result).not.toHaveProperty("error");
  });

  it("returns a successful Task Reference Fallback at the Completion Wait deadline", async () => {
    const latest = {id: "task_123", status: "processing", progress: 80};
    const result = await createTaskHandler({
      service: "flux-kontext",
      action: "text_to_image",
      model: "flux-kontext-pro",
      params: {prompt: "test"},
      wait: true
    }, {
      createTask: vi.fn(async () => ({id: "task_123", status: "queued"})),
      pollTask: vi.fn(async (_service, _taskId, _action, options) => {
        await options.onProgress?.(latest);
        throw new PollTimeoutError("deadline reached");
      })
    });

    expect(result).toEqual({
      task_id: "task_123",
      status: "processing",
      task: latest,
      completed: false,
      wait_deadline_reached: true,
      next_action: "get_task"
    });
  });

  it("returns synchronous operation results without task or polling wrappers", async () => {
    const createTask = vi.fn(async () => ({ seed: 8_675_309 }));
    const pollTask = vi.fn();

    const result = await createTaskHandler({
      service: "midjourney",
      action: "get_seed",
      params: { image_id: "image_123" },
      wait: true
    }, { createTask, pollTask });

    expect(createTask).toHaveBeenCalledWith(
      "midjourney",
      "get_seed",
      {image_id: "image_123"},
      "unit-test-task-creation"
    );
    expect(pollTask).not.toHaveBeenCalled();
    expect(result).toEqual({ result: { seed: 8_675_309 } });
  });

  it("uses the internal hybrid resolver without relying on generated contract metadata", async () => {
    const resolveHybridTask = vi.fn(async () => ({result: {shortened: "concise prompt"}}));
    const result = await createTaskHandler({
      service: "midjourney",
      action: "shorten_prompt",
      params: {prompt: "A detailed prompt"},
      wait: true
    }, {
      createTask: vi.fn(),
      pollTask: vi.fn(),
      resolveHybridTask
    });

    expect(resolveHybridTask).toHaveBeenCalledWith(
      "midjourney",
      "shorten_prompt",
      {prompt: "A detailed prompt"},
      "unit-test-task-creation",
      expect.objectContaining({timeoutMs: HYBRID_TASK_COMPLETION_DEADLINE_MS, intervalMs: 5_000})
    );
    expect(result).toEqual({result: {shortened: "concise prompt"}});
  });

  it("honors an explicit shorter timeout for an internally recovered hybrid task", async () => {
    const resolveHybridTask = vi.fn(async () => ({result: {seed: 8_675_309}}));

    await createTaskHandler({
      service: "midjourney",
      action: "get_seed",
      params: {image_id: "image_123"},
      timeout_ms: 45_000
    }, {
      createTask: vi.fn(),
      pollTask: vi.fn(),
      resolveHybridTask
    });

    expect(resolveHybridTask).toHaveBeenCalledWith(
      "midjourney",
      "get_seed",
      {image_id: "image_123"},
      "unit-test-task-creation",
      expect.objectContaining({timeoutMs: 45_000})
    );
  });

  it("preserves a hybrid task reference when its dedicated resolver fails after creation", async () => {
    const created = {id: "task_123", status: "processing"};
    const result = await createTaskHandler({
      service: "midjourney",
      action: "shorten_prompt",
      params: {prompt: "A detailed prompt"},
      wait: true
    }, {
      createTask: vi.fn(),
      pollTask: vi.fn(),
      resolveHybridTask: vi.fn(async () => {
        throw new HybridTaskResolutionError(
          "task_123",
          created,
          new RunApiClientError("poll unavailable", 503)
        );
      })
    });

    expect(result).toMatchObject({
      created,
      task_id: "task_123",
      status: "processing",
      completed: false,
      warning: expect.stringContaining("temporarily unavailable"),
      next_action: "get_task"
    });
    expect(result).not.toHaveProperty("error");
  });

});
