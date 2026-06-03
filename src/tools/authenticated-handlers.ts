import { findModelForAction } from "../lib/contract.js";
import { friendlyError } from "../lib/errors.js";
import { validateInputRules } from "../lib/input-rules.js";
import { taskIdFromResponse, taskStatus, type RunApiClient } from "../lib/runapi-client.js";
import { validateParams } from "../lib/schema.js";
import type { RunApiTaskResponse } from "../types.js";

export type ProgressSender = (message: {
  progressToken: string | number;
  progress: number;
  total: number;
  message: string;
}) => Promise<void> | void;

export async function checkBalanceHandler(client: Pick<RunApiClient, "balance">) {
  try {
    return await client.balance();
  } catch (error) {
    return { error: friendlyError(error) };
  }
}

export async function createTaskHandler(
  input: {
    service: string;
    action: string;
    model?: string;
    params?: Record<string, unknown>;
    wait?: boolean;
    timeout_ms?: number;
    poll_interval_ms?: number;
  },
  client: Pick<RunApiClient, "createTask" | "pollTask">,
  sendProgress?: ProgressSender,
  progressToken?: string | number
) {
  try {
    const info = findModelForAction(input.service, input.action, input.model);
    if (!info) {
      return {
        error: "Unsupported RunAPI service/action/model combination.",
        hint: "Call list_models first to choose a supported model."
      };
    }

    const body = validateParams(info.fields, {
      ...(input.params || {}),
      ...(input.model ? { model: input.model } : {})
    });
    const ruleError = validateInputRules(info, body);
    if (ruleError) {
      return {
        error: `Invalid RunAPI parameters: ${ruleError}`,
        hint: "Call get_model_info with service and action to inspect input_rules before create_task."
      };
    }

    const created = await client.createTask(input.service, input.action, body);
    const taskId = taskIdFromResponse(created);

    if (!input.wait || !taskId) {
      return {
        created,
        task_id: taskId,
        status: taskStatus(created)
      };
    }

    const timeout = input.timeout_ms ?? defaultTimeout(input.action);
    const startedAt = Date.now();
    const completed = await client.pollTask(input.service, taskId, input.action, {
      timeoutMs: timeout,
      intervalMs: input.poll_interval_ms ?? 5_000,
      onProgress: async (task: RunApiTaskResponse) => {
        const elapsed = Date.now() - startedAt;
        await sendProgress?.({
          progressToken: progressToken || taskId,
          progress: Math.min(elapsed, timeout),
          total: timeout,
          message: `RunAPI task ${taskId}: ${taskStatus(task)}`
        });
      }
    });

    return {
      task_id: taskId,
      status: taskStatus(completed),
      result: completed
    };
  } catch (error) {
    return { error: friendlyError(error) };
  }
}

export async function getTaskHandler(
  input: { service: string; action?: string; task_id: string },
  client: Pick<RunApiClient, "getTask">
) {
  try {
    const task = await client.getTask(input.service, input.task_id, input.action);
    return {
      task_id: input.task_id,
      status: taskStatus(task),
      task
    };
  } catch (error) {
    return { error: friendlyError(error) };
  }
}

export function defaultTimeout(action: string): number {
  if (action.includes("video")) {
    return 300_000;
  }
  if (["music", "audio", "speech", "sound", "voice"].some((term) => action.includes(term))) {
    return 300_000;
  }
  if (action.includes("image")) {
    return 120_000;
  }
  return 30_000;
}
