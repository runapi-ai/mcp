import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { jsonText } from "../lib/tool-response.js";
import type { DiscoveryToolDependencies } from "../business-tools.js";
import { checkPricingHandler, getModelInfoHandler, listActionsHandler, listModelsHandler, searchPromptsHandler } from "./catalog-handlers.js";

export function registerCatalogTools(server: McpServer, dependencies: DiscoveryToolDependencies) {
  server.tool(
    "list_models",
    "List RunAPI models from the embedded catalog. Optional filters: modality, service, or action.",
    {
      modality: z.enum(["image", "video", "audio", "utility", "llm"]).optional(),
      service: z.string().optional(),
      action: z.string().optional()
    },
    async ({ modality, service, action }) => {
      return jsonText(await listModelsHandler({ modality, service, action }, dependencies.client, dependencies.contract));
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
      return jsonText(getModelInfoHandler({ model, service, action }, dependencies.contract, dependencies.pricing));
    }
  );

  server.tool(
    "list_actions",
    "List RunAPI endpoint names grouped by output modality.",
    {},
    async () => jsonText(listActionsHandler(dependencies.contract))
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
      return jsonText(checkPricingHandler({ service, action, model }, dependencies.contract, dependencies.pricing));
    }
  );

  server.tool(
    "search_prompts",
    "Search RunAPI prompt examples by modality, category, tags, text query, model, or featured status. Free, no API key required.",
    {
      modality: z.enum(["image", "image_edit", "video", "audio", "music"]).optional(),
      category: z.string().optional(),
      tags: z.array(z.string()).optional().describe("Tags to match. All provided tags must be present."),
      q: z.string().optional().describe("Text query matched against prompt title and prompt text."),
      model: z.string().optional().describe("RunAPI model slug, for example flux-kontext-pro or suno-v5."),
      featured: z.boolean().optional(),
      page: z.number().int().positive().optional(),
      per_page: z.number().int().positive().max(100).optional()
    },
    async ({ modality, category, tags, q, model, featured, page, per_page }) => {
      return jsonText(await searchPromptsHandler({
        modality,
        category,
        tags,
        q,
        model,
        featured,
        page,
        per_page
      }, dependencies.client));
    }
  );
}
