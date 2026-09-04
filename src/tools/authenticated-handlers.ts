import {
  findAction,
  findModelForAction,
  PollTimeoutError,
  taskIdFromResponse,
  taskStatus,
  validateInputRules,
  type Contract,
  type ContractAction
} from "@runapi.ai/mcp-core/web";
import type { BusinessToolClient } from "../business-tools.js";
import {
  HYBRID_TASK_COMPLETION_DEADLINE_MS,
  isHybridTaskAction
} from "../hybrid-task-capability.js";
import { validateModelSpecificParams } from "../lib/model-specific-validation.js";
import { validateParams } from "../lib/schema.js";
import type { RunApiTaskResponse } from "../types.js";

export const COMPLETION_WAIT_DEADLINE_MS = 300_000;
export const COMPLETION_WAIT_POLL_INTERVAL_MS = 5_000;

export class CompletionWaitUnavailableError extends Error {
  constructor() {
    super("Completion Wait capacity is unavailable");
    this.name = "CompletionWaitUnavailableError";
  }
}

export class HybridTaskResolutionError extends Error {
  constructor(
    readonly taskId: string,
    readonly created: RunApiTaskResponse,
    readonly resolutionError: unknown
  ) {
    super(resolutionError instanceof Error ? resolutionError.message : "RunAPI task resolution failed");
    this.name = "HybridTaskResolutionError";
  }
}

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
  client: Pick<BusinessToolClient, "createTask" | "pollTask" | "resolveHybridTask">,
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
    const action = findAction(input.service, input.action, contract) as ContractAction | undefined;
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
    const modelError = validateModelSpecificParams(input.service, input.action, body);
    if (modelError) {
      return {
        error: `Invalid RunAPI parameters: ${modelError}`,
        hint: "Adjust the model-specific parameters before creating the task."
      };
    }

    const hybridTask = isHybridTaskAction(input.service, input.action);
    const completionDeadline = hybridTask
      ? HYBRID_TASK_COMPLETION_DEADLINE_MS
      : COMPLETION_WAIT_DEADLINE_MS;
    const timeout = Math.min(input.timeout_ms ?? completionDeadline, completionDeadline);
    const startedAt = Date.now();
    const onProgress = async (task: RunApiTaskResponse) => {
      if (progressToken === undefined) return;

      const elapsed = Date.now() - startedAt;
      await sendProgress?.({
        progressToken,
        progress: Math.min(elapsed, timeout),
        total: timeout,
        message: `RunAPI task ${taskIdFromResponse(task) ?? "unknown"}: ${taskStatus(task)}`
      });
    };

    if (hybridTask && client.resolveHybridTask) {
      try {
        return await client.resolveHybridTask(input.service, input.action, body, input.idempotency_key, {
          wait: input.wait,
          timeoutMs: timeout,
          intervalMs: input.poll_interval_ms ?? COMPLETION_WAIT_POLL_INTERVAL_MS,
          onProgress
        });
      } catch (error) {
        if (!(error instanceof HybridTaskResolutionError)) throw error;

        return {
          created: error.created,
          task_id: error.taskId,
          status: taskStatus(error.created),
          completed: false,
          warning: formatError(error.resolutionError),
          next_action: "get_task"
        };
      }
    }

    if (action?.task_type === "synchronous") {
      const created = await client.createTask(input.service, input.action, body, input.idempotency_key);
      return { result: created };
    }

    const created = await client.createTask(input.service, input.action, body, input.idempotency_key);
    const taskId = taskIdFromResponse(created);

    if (!input.wait || !taskId) {
      return {
        created,
        task_id: taskId,
        status: taskStatus(created)
      };
    }

    let latestTask: RunApiTaskResponse = created;
    try {
      const completed = await client.pollTask(input.service, taskId, input.action, {
        timeoutMs: timeout,
        intervalMs: input.poll_interval_ms ?? COMPLETION_WAIT_POLL_INTERVAL_MS,
        onProgress: async (task: RunApiTaskResponse) => {
          latestTask = task;
          await onProgress(task);
        }
      });

      return {
        task_id: taskId,
        status: taskStatus(completed),
        completed: true,
        result: completed
      };
    } catch (error) {
      if (error instanceof CompletionWaitUnavailableError) {
        return {
          task_id: taskId,
          status: taskStatus(created),
          task: created,
          completed: false,
          wait_degraded: "concurrency_limit",
          next_action: "get_task"
        };
      }

      if (error instanceof PollTimeoutError) {
        return {
          task_id: taskId,
          status: taskStatus(latestTask),
          task: latestTask,
          completed: false,
          wait_deadline_reached: true,
          next_action: "get_task"
        };
      }

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

export function defaultTimeout(_action: string): number {
  return COMPLETION_WAIT_DEADLINE_MS;
}
