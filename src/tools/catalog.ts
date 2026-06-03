import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { jsonText } from "../lib/tool-response.js";
import { RunApiClient } from "../lib/runapi-client.js";
import { checkPricingHandler, getModelInfoHandler, listActionsHandler, listModelsHandler } from "./catalog-handlers.js";

export function registerCatalogTools(server: McpServer, client = new RunApiClient()) {
  server.tool(
    "list_models",
    "List RunAPI models from the embedded catalog. Optional filters: modality, service, or action.",
    {
      modality: z.enum(["image", "video", "audio", "utility", "llm"]).optional(),
      service: z.string().optional(),
      action: z.string().optional()
    },
    async ({ modality, service, action }) => {
      return jsonText(await listModelsHandler({ modality, service, action }, client));
    }
  );

  server.tool(
    "get_model_info",
    "Get supported endpoint, pricing snapshot, and input constraints from the embedded catalog for a RunAPI model slug. Add service and action when the model supports multiple endpoints.",
    {
      model: z.string().describe("RunAPI model slug returned by list_models"),
      service: z.string().optional().describe("RunAPI service slug returned by list_models; use with action to disambiguate multi-endpoint models"),
      action: z.string().optional().describe("RunAPI endpoint name returned by list_models; use with service to disambiguate multi-endpoint models")
    },
    async ({ model, service, action }) => {
      return jsonText(getModelInfoHandler({ model, service, action }));
    }
  );

  server.tool(
    "list_actions",
    "List RunAPI endpoint names grouped by output modality.",
    {},
    async () => jsonText(listActionsHandler())
  );

  server.tool(
    "check_pricing",
    "Return embedded pricing snapshot data for a RunAPI model/action pair.",
    {
      service: z.string().describe("RunAPI service slug returned by list_models"),
      action: z.string().describe("RunAPI endpoint name, for example text_to_image or text_to_music"),
      model: z.string().optional().describe("RunAPI model slug")
    },
    async ({ service, action, model }) => {
      return jsonText(checkPricingHandler({ service, action, model }));
    }
  );
}
