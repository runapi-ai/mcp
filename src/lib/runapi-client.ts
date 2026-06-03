import { USER_AGENT } from "../constants.js";
import { loadConfig, requireApiKey, type RunApiConfig } from "../config.js";
import type { ChatMessage, PollingOptions, RunApiTaskResponse } from "../types.js";
import { errorFromResponse, PollTimeoutError } from "./errors.js";

type RequestOptions = {
  auth?: boolean;
  body?: unknown;
  headers?: Record<string, string>;
};

const COMPLETED_STATUSES = new Set(["completed", "complete", "succeeded", "success", "finished"]);
const FAILED_STATUSES = new Set(["failed", "error", "canceled", "cancelled", "timeout"]);

export class RunApiClient {
  constructor(
    private readonly config: RunApiConfig = loadConfig(),
    private readonly fetchImpl: typeof fetch = fetch
  ) {}

  async listModels() {
    return this.request("GET", "/v1/models", { auth: false });
  }

  async balance() {
    return this.request("GET", "/api/v1/me/balance", { auth: true });
  }

  async createTask(service: string, action: string, params: Record<string, unknown>) {
    return this.request<RunApiTaskResponse>("POST", `/api/v1/${routeServiceSlug(service)}/${action}`, {
      auth: true,
      body: params
    });
  }

  async getTask(service: string, taskId: string, action?: string) {
    const routeService = routeServiceSlug(service);
    const path = action ? `/api/v1/${routeService}/${action}/${taskId}` : `/api/v1/${routeService}/${taskId}`;
    return this.request<RunApiTaskResponse>("GET", path, {
      auth: true
    });
  }

  async pollTask(service: string, taskId: string, action?: string, options: PollingOptions = {}) {
    const timeoutMs = options.timeoutMs ?? 120_000;
    const intervalMs = options.intervalMs ?? 5_000;
    const startedAt = Date.now();
    let lastTask: RunApiTaskResponse | undefined;

    while (Date.now() - startedAt < timeoutMs) {
      const task = await this.getTask(service, taskId, action);
      lastTask = task;
      await options.onProgress?.(task);

      const status = taskStatus(task);
      if (COMPLETED_STATUSES.has(status) || FAILED_STATUSES.has(status)) {
        return task;
      }

      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }

    throw new PollTimeoutError(`Timed out waiting for RunAPI task ${taskId}. Last status: ${taskStatus(lastTask)}.`);
  }

  async chat(params: {
    model: string;
    messages: ChatMessage[];
    max_tokens?: number;
    temperature?: number;
    api?: "messages" | "chat_completions";
  }) {
    if (params.api === "chat_completions") {
      return this.request("POST", "/v1/chat/completions", {
        auth: true,
        body: {
          model: params.model,
          messages: params.messages,
          max_tokens: params.max_tokens,
          temperature: params.temperature
        }
      });
    }

    const system = params.messages.find((message) => message.role === "system")?.content;
    const messages = params.messages.filter((message) => message.role !== "system");

    return this.request("POST", "/v1/messages", {
      auth: true,
      body: {
        model: params.model,
        system,
        messages,
        max_tokens: params.max_tokens ?? 1024,
        temperature: params.temperature
      }
    });
  }

  private async request<T = unknown>(method: string, requestPath: string, options: RequestOptions = {}): Promise<T> {
    const url = new URL(requestPath, this.config.baseUrl.replace(/\/+$/, ""));
    const headers: Record<string, string> = {
      accept: "application/json",
      "user-agent": USER_AGENT,
      ...options.headers
    };

    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
    }

    if (options.auth !== false) {
      headers.authorization = `Bearer ${requireApiKey(this.config)}`;
    }

    const response = await this.fetchImpl(url, {
      method,
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body)
    });

    if (!response.ok) {
      throw await errorFromResponse(response);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return await response.json() as T;
  }
}

export function taskStatus(task?: RunApiTaskResponse): string {
  const status = task?.status || task?.state || nestedString(task?.data, "status");
  return typeof status === "string" ? status.toLowerCase() : "unknown";
}

export function taskIdFromResponse(task: RunApiTaskResponse): string | undefined {
  const id = task.id || task.task_id || nestedString(task.data, "id") || nestedString(task.data, "task_id");
  return typeof id === "string" && id.length > 0 ? id : undefined;
}

function nestedString(value: unknown, key: string): string | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  const nested = (value as Record<string, unknown>)[key];
  return typeof nested === "string" ? nested : undefined;
}

function routeServiceSlug(service: string): string {
  return service.replace(/-/g, "_");
}
