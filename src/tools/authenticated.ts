import { z } from "zod/v4";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { BusinessToolDependencies } from "../business-tools.js";
import { jsonText } from "../lib/tool-response.js";
import {
  checkBalanceHandler,
  createTaskHandler,
  getTaskHandler
} from "./authenticated-handlers.js";

export function registerAuthenticatedTools(server: McpServer, dependencies: BusinessToolDependencies) {
  server.tool(
    "check_balance",
    "Return the authenticated RunAPI account balance and spending metrics.",
    {},
    async () => {
      return jsonText(await checkBalanceHandler(dependencies.client, dependencies.errorFormatter));
    }
  );

  server.tool(
    "create_task",
    "Run a RunAPI operation with a caller-generated idempotency key. Asynchronous operations can optionally poll until completion.",
    {
      service: z.string().describe("RunAPI service slug returned by list_models"),
      action: z.string().describe("RunAPI endpoint name, for example text_to_image"),
      model: z.unknown().optional().meta({ type: "string" }).describe("RunAPI model value sent to the server without local validation."),
      params: z.record(z.string(), z.unknown()).default({}).describe("Endpoint parameters sent to RunAPI for server-side validation."),
      idempotency_key: z.string().describe("Opaque caller-generated key for safely replaying one logical task creation."),
      wait: z.boolean().default(true).describe("Wait for the completed result when the endpoint requires durable processing."),
      timeout_ms: z.number().int().positive().optional()
        .describe("Requested completion deadline in milliseconds; values above the endpoint limit are capped."),
      poll_interval_ms: z.number().int().positive().optional().describe("Status check interval while waiting for completion.")
    },
    async ({ service, action, model, params, idempotency_key, wait, timeout_ms, poll_interval_ms }, extra) => {
      const progressToken = extra._meta?.progressToken;
      const result = await createTaskHandler(
        { service, action, model, params, idempotency_key, wait, timeout_ms, poll_interval_ms },
        dependencies.client,
        dependencies.contract,
        dependencies.errorFormatter,
        async (progress) => {
          await extra.sendNotification?.({
            method: "notifications/progress",
            params: progress
          });
        },
        progressToken
      );
      const response = {
        ...jsonText(result),
        structuredContent: result
      };
      return "error" in result ? { ...response, isError: true } : response;
    }
  );

  server.tool(
    "get_task",
    "Fetch the current status and latest payload for an existing RunAPI task.",
    {
      service: z.string(),
      action: z.string().optional().describe("RunAPI endpoint name. Provide this when using media task routes."),
      task_id: z.string()
    },
    async ({ service, action, task_id }) => {
      return jsonText(await getTaskHandler(
        { service, action, task_id },
        dependencies.client,
        dependencies.contract,
        dependencies.errorFormatter
      ));
    }
  );
}
