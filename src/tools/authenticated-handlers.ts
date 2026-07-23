import {
  findAction,
  findModelForAction,
  taskIdFromResponse,
  taskStatus,
  validateInputRules,
  type Contract,
  type ContractAction
} from "@runapi.ai/mcp-core/web";
import type { BusinessToolClient } from "../business-tools.js";
import { validateParams } from "../lib/schema.js";
import type { RunApiTaskResponse } from "../types.js";

export type ProgressSender = (message: {
  progressToken: string | number;
  progress: number;
  total: number;
  message: string;
}) => Promise<void> | void;

export type ErrorFormatter = (error: unknown) => string;

export async function checkBalanceHandler(
  client: Pick<BusinessToolClient, "balance">,
  formatError: ErrorFormatter
) {
  try {
    return await client.balance();
  } catch (error) {
    return { error: formatError(error) };
  }
}

export async function createTaskHandler(
  input: {
    service: string;
    action: string;
    model?: string;
    params?: Record<string, unknown>;
    idempotency_key?: string;
    wait?: boolean;
    timeout_ms?: number;
    poll_interval_ms?: number;
  },
  client: Pick<BusinessToolClient, "createTask" | "pollTask">,
  contract: Contract,
  formatError: ErrorFormatter,
  sendProgress?: ProgressSender,
  progressToken?: string | number
) {
  try {
    if (!input.idempotency_key?.trim()) {
      return {
        error: "idempotency_key is required before RunAPI can create a task.",
        hint: "Generate one opaque key per logical task and reuse it only when retrying that same task input."
      };
    }

    const info = findModelForAction(input.service, input.action, input.model, contract);
    const action = findAction(input.service, input.action, contract) as ((ContractAction & { task_type?: string }) | undefined);
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
    const ruleError = validateInputRules(action?.rules ?? [], body);
    if (ruleError) {
      return {
        error: `Invalid RunAPI parameters: ${ruleError}`,
        hint: "Call get_model_info with service and action to inspect input_rules before create_task."
      };
    }

    const created = await client.createTask(input.service, input.action, body, input.idempotency_key);
    if (action?.task_type === "synchronous") {
      return { result: created };
    }

    const taskId = taskIdFromResponse(created);

    if (!input.wait || !taskId) {
      return {
        created,
        task_id: taskId,
        status: taskStatus(created)
      };
    }

    try {
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
      return {
        created,
        task_id: taskId,
        status: taskStatus(created),
        warning: formatError(error),
        hint: "The task was created and may still be processing. Call get_task with this task_id to continue."
      };
    }
  } catch (error) {
    return { error: formatError(error) };
  }
}

export async function getTaskHandler(
  input: { service: string; action?: string; task_id: string },
  client: Pick<BusinessToolClient, "getTask">,
  formatError: ErrorFormatter
) {
  try {
    const task = await client.getTask(input.service, input.task_id, input.action);
    return {
      task_id: input.task_id,
      status: taskStatus(task),
      task
    };
  } catch (error) {
    return { error: formatError(error) };
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
