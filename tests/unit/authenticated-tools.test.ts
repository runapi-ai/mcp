import { describe, expect, it, vi } from "vitest";
import { RunApiClientError } from "../../src/lib/errors.js";
import { checkBalanceHandler, createTaskHandler, defaultTimeout, getTaskHandler } from "../../src/tools/authenticated-handlers.js";

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
    const createTask = vi.fn(async () => ({ id: "task_123", status: "queued" }));
    const result = await createTaskHandler({
      service: "flux-kontext",
      action: "text_to_image",
      model: "flux-kontext-pro",
      params: { prompt: "test" },
      wait: false
    }, {
      createTask,
      pollTask: vi.fn()
    });

    expect(createTask).toHaveBeenCalledWith("flux-kontext", "text_to_image", expect.objectContaining({
      model: "flux-kontext-pro",
      prompt: "test"
    }));
    expect(result).toMatchObject({
      task_id: "task_123",
      status: "queued"
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
      status: "completed"
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

    expect(createTask).toHaveBeenCalledWith("midjourney", "get_seed", { image_id: "image_123" });
    expect(pollTask).not.toHaveBeenCalled();
    expect(result).toEqual({ result: { seed: 8_675_309 } });
  });

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
      error: "Unsupported RunAPI service/action/model combination."
    });
  });

  it("rejects invalid conditional input shapes before creating music tasks", async () => {
    const createTask = vi.fn();
    const result = await createTaskHandler({
      service: "suno",
      action: "text_to_music",
      model: "suno-v4",
      params: {
        vocal_mode: "instrumental",
        prompt: "A calm music test"
      },
      wait: false
    }, {
      createTask,
      pollTask: vi.fn()
    });

    expect(createTask).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      error: "Invalid RunAPI parameters: vocal_mode=instrumental requires style, title and must not include prompt."
    });
  });

  it("allows valid conditional input shapes for music tasks", async () => {
    const createTask = vi.fn(async () => ({ id: "music_task", status: "queued" }));
    const result = await createTaskHandler({
      service: "suno",
      action: "text_to_music",
      model: "suno-v4",
      params: {
        vocal_mode: "instrumental",
        style: "calm software demo background music",
        title: "RunAPI MCP UX Check"
      },
      wait: false
    }, {
      createTask,
      pollTask: vi.fn()
    });

    expect(createTask).toHaveBeenCalledWith("suno", "text_to_music", expect.objectContaining({
      vocal_mode: "instrumental",
      style: "calm software demo background music",
      title: "RunAPI MCP UX Check"
    }));
    expect(result).toMatchObject({
      task_id: "music_task",
      status: "queued"
    });
  });

  it("rejects generated contract input rule violations before creating Kling V3 tasks", async () => {
    const createTask = vi.fn();
    const result = await createTaskHandler({
      service: "kling",
      action: "image_to_video",
      model: "kling-v3-turbo-image-to-video",
      params: {
        prompt: "Animate this frame",
        first_frame_image_url: "https://example.test/start.png",
        negative_prompt: "blur"
      },
      wait: false
    }, {
      createTask,
      pollTask: vi.fn()
    });

    expect(createTask).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      error: "Invalid RunAPI parameters: model=kling-v3-turbo-image-to-video must not include negative_prompt."
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

  it("uses modality-sensitive default timeouts", () => {
    expect(defaultTimeout("text_to_video")).toBe(300_000);
    expect(defaultTimeout("text_to_image")).toBe(120_000);
    expect(defaultTimeout("text_to_music")).toBe(300_000);
    expect(defaultTimeout("text_to_speech")).toBe(300_000);
  });
});
