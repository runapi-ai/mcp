import { RunApiClient as CoreRunApiClient, loadConfig, type RunApiConfig } from "@runapi.ai/mcp-core";
import { taskStatus, type RunApiTaskResponse } from "@runapi.ai/mcp-core/web";
import { USER_AGENT } from "../constants.js";
import { HybridTaskResolutionError } from "../tools/authenticated-handlers.js";
import type { HybridTaskOptions, HybridTaskResult } from "../business-tools.js";
import { HYBRID_TASK_COMPLETION_DEADLINE_MS } from "../hybrid-task-capability.js";

// Thin shim over the core client that pins the aggregate's own User-Agent
// (`@runapi.ai/mcp/<version>`) so `new RunApiClient()` call sites stay unchanged.
export class RunApiClient extends CoreRunApiClient {
  constructor(config?: RunApiConfig, fetchImpl: typeof fetch = fetch) {
    super(config ?? loadConfig, fetchImpl, USER_AGENT);
  }

  async resolveHybridTask(
    service: string,
    action: string,
    params: Record<string, unknown>,
    idempotencyKey: string,
    options: HybridTaskOptions = {}
  ): Promise<HybridTaskResult> {
    const response = await this.createTaskResponse(service, action, params, idempotencyKey);
    if (response.status !== 202) return {result: await responseBody(response)};

    const created = await response.json() as RunApiTaskResponse;
    const taskId = taskIdFrom(created);
    const location = response.headers.get("location");
    if (!taskId || !location) throw new Error("RunAPI Task Result was invalid");
    if (options.wait === false) return {created, task_id: taskId, status: taskStatus(created)};

    try {
      const task = await this.pollTaskResult(location, options);
      const status = taskStatus(task);
      if (status === "failed") throw new Error("RunAPI task did not complete successfully.");
      return {task_id: taskId, status, completed: true, result: resultFromTaskResult(task)};
    } catch (error) {
      throw new HybridTaskResolutionError(taskId, created, error);
    }
  }

  private async pollTaskResult(location: string, options: HybridTaskOptions): Promise<RunApiTaskResponse> {
    const timeoutMs = options.timeoutMs ?? HYBRID_TASK_COMPLETION_DEADLINE_MS;
    const intervalMs = options.intervalMs ?? 5_000;
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const response = await this.getTaskResultResponse(location);
      const task = await response.json() as RunApiTaskResponse;
      await options.onProgress?.(task);
      const status = taskStatus(task);
      if (status === "completed" || status === "failed") return task;
      await new Promise((resolve) => setTimeout(resolve, Math.min(intervalMs, deadline - Date.now())));
    }
    throw new Error("Timed out waiting for RunAPI task result.");
  }
}

async function responseBody(response: Response): Promise<unknown> {
  const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
  return contentType.includes("json") ? response.json() : response.text();
}

function taskIdFrom(task: RunApiTaskResponse): string | undefined {
  const id = task.id ?? task.task_id;
  return typeof id === "string" && id.length > 0 ? id : undefined;
}

function resultFromTaskResult(task: RunApiTaskResponse): unknown {
  const response = task.response;
  if (!response || typeof response !== "object" || !("body" in response)) {
    throw new Error("RunAPI Task Result was invalid");
  }
  return (response as {body: unknown}).body;
}

export { taskIdFromResponse, taskStatus } from "@runapi.ai/mcp-core";
