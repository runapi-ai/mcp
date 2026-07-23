import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { BusinessToolDependencies } from "../business-tools.js";
import { jsonText } from "../lib/tool-response.js";
import { checkBalanceHandler, createTaskHandler, getTaskHandler } from "./authenticated-handlers.js";

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
    "Run a RunAPI operation. Asynchronous operations can optionally poll until completion.",
    {
      service: z.string().describe("RunAPI service slug returned by list_models"),
      action: z.string().describe("RunAPI endpoint name, for example text_to_image"),
      model: z.string().optional().describe("RunAPI model slug"),
      params: z.record(z.unknown()).default({}).describe("Endpoint parameters validated against data/contract.json where constrained."),
      wait: z.boolean().default(true).describe("For asynchronous endpoints, poll until the task reaches a terminal status."),
      timeout_ms: z.number().int().positive().optional().describe("Polling timeout for asynchronous endpoints."),
      poll_interval_ms: z.number().int().positive().optional().describe("Polling interval for asynchronous endpoints.")
    },
    async ({ service, action, model, params, wait, timeout_ms, poll_interval_ms }, extra) => {
      const progressToken = extra._meta?.progressToken;
      const result = await createTaskHandler(
        { service, action, model, params, wait, timeout_ms, poll_interval_ms },
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
      return jsonText(result);
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
        dependencies.errorFormatter
      ));
    }
  );
}
