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

    expect(createTask).toHaveBeenCalledWith(
      "suno",
      "text_to_music",
      expect.objectContaining({
        vocal_mode: "instrumental",
        style: "calm software demo background music",
        title: "RunAPI MCP UX Check"
      }),
      "unit-test-task-creation"
    );
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

  it.each([
    "file:///etc/passwd.jpg",
    "http://localhost/reference.jpg",
    "http://127.0.0.1/reference.jpg",
    "http://169.254.169.254/reference.jpg",
    "http://[::ffff:127.0.0.1]/reference.jpg",
    "http://2130706433/reference.jpg",
    "http://127.1/reference.jpg",
    "http://0177.0.0.1/reference.jpg",
    "http://0x7f000001/reference.jpg"
  ])("rejects non-public Kling O1 reference %s before creating tasks", async (referenceUrl) => {
    const createTask = vi.fn();
    const result = await createTaskHandler({
      service: "kling",
      action: "text_to_video",
      model: "kling-o1",
      params: {
        prompt: "Use <<<image_1>>>",
        reference_image_urls: [referenceUrl]
      },
      wait: false
    }, {
      createTask,
      pollTask: vi.fn()
    });

    expect(createTask).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      error: "Invalid RunAPI parameters: reference_image_urls[0] must be a public HTTP or HTTPS URL"
    });
  });

  it("rejects Kling O1 tail frames combined with reference media before creating tasks", async () => {
    const createTask = vi.fn();
    const result = await createTaskHandler({
      service: "kling",
      action: "image_to_video",
      model: "kling-o1",
      params: {
        prompt: "Move toward <<<image_1>>>",
        first_frame_image_url: "https://cdn.runapi.ai/public/samples/image.jpg",
        last_frame_image_url: "https://cdn.runapi.ai/public/samples/last-frame.jpg",
        reference_image_urls: ["https://cdn.runapi.ai/public/samples/portrait.jpg"]
      },
      wait: false
    }, {
      createTask,
      pollTask: vi.fn()
    });

    expect(createTask).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      error: "Invalid RunAPI parameters: last_frame_image_url cannot be combined with reference_image_urls or reference_video_url"
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
