import {
  fieldSummary,
  findModel,
  findModelForAction,
  findModels,
  inputRulesForModel,
  listActionGroups,
  listContractModels,
  priceForModel,
  type Contract,
  type PricingConfig
} from "@runapi.ai/mcp-core/web";
import { modalityForAction } from "../lib/text.js";
import type { BusinessToolClient } from "../business-tools.js";
import type { ModelInfo, RunApiPrompt, SearchPromptsParams } from "../types.js";

export type ListModelsInput = {
  modality?: "image" | "video" | "audio" | "utility" | "llm";
  service?: string;
  action?: string;
};

export type GetModelInfoInput = {
  model: string;
  service?: string;
  action?: string;
};

export async function listModelsHandler(
  input: ListModelsInput,
  client: Pick<BusinessToolClient, "listModels">,
  contract: Contract
) {
  let models = listContractModels(contract);
  if (input.modality && input.modality !== "llm") {
    models = models.filter((model) => modalityForAction(model.action) === input.modality);
  }
  if (input.service) {
    models = models.filter((model) => model.service === input.service);
  }
  if (input.action) {
    models = models.filter((model) => model.action === input.action);
  }

  let runtimeModels: unknown;
  try {
    runtimeModels = await client.listModels();
  } catch {
    runtimeModels = undefined;
  }

  return {
    count: models.length,
    source: runtimeModels ? "embedded catalog + /v1/models" : "embedded catalog",
    runtime_models: runtimeModels,
    models: models.map((model) => ({
      model: model.model,
      service: model.service,
      action: model.action,
      modality: modalityForAction(model.action),
      model_line: model.model_line,
      required_fields: fieldSummary(model.fields).filter((field) => field.required).map((field) => field.name)
    }))
  };
}

export function getModelInfoHandler(
  input: string | GetModelInfoInput,
  contract: Contract,
  pricing: PricingConfig
) {
  const request = typeof input === "string" ? { model: input } : input;
  const info = request.service && request.action
    ? findModelForAction(request.service, request.action, request.model, contract)
    : findModel(request.model, contract);

  if (!info) {
    if (request.service || request.action) {
      return {
        error: `Unsupported RunAPI model/action combination: ${request.service || "(missing service)"}/${request.action || "(missing action)"} with model ${request.model}`,
        hint: "Call list_models with service/action filters to find supported combinations."
      };
    }

    return {
      error: `Unknown RunAPI model: ${request.model}`,
      hint: "Call list_models first to find valid model slugs."
    };
  }

  const matches = findModels(request.model, contract);
  const ambiguous = !request.service && !request.action && matches.length > 1;

  return {
    ...modelInfoResponse(info, contract, pricing),
    ...(ambiguous ? {
      ambiguous: true,
      hint: "This model supports multiple service/action pairs. Call get_model_info with service and action to inspect the exact input constraints before create_task.",
      matches: matches.map((match) => ({
        service: match.service,
        action: match.action,
        modality: modalityForAction(match.action)
      }))
    } : {})
  };
}

export function listActionsHandler(contract: Contract) {
  return {
    groups: listActionGroups(contract)
  };
}

function modelInfoResponse(info: ModelInfo, contract: Contract, pricing: PricingConfig) {
  const inputRules = inputRulesForModel(info, contract);

  return {
    model: info.model,
    service: info.service,
    action: info.action,
    modality: modalityForAction(info.action),
    model_line: info.model_line,
    fields: fieldSummary(info.fields),
    ...(inputRules.length > 0 ? { input_rules: inputRules } : {}),
    price: priceForModel(info, pricing)
  };
}

export function checkPricingHandler(
  input: { service: string; action: string; model?: string },
  contract: Contract,
  pricing: PricingConfig
) {
  const info = findModelForAction(input.service, input.action, input.model, contract);
  if (!info) {
    return {
      supported: false,
      message: "No matching RunAPI model/action pair in the local contract.",
      hint: "Use list_models with service/action filters to find supported combinations."
    };
  }

  return {
    supported: true,
    model: info.model,
    service: info.service,
    action: info.action,
    price: priceForModel(info, pricing)
  };
}

export async function searchPromptsHandler(
  input: SearchPromptsParams,
  client: Pick<BusinessToolClient, "searchPrompts">
) {
  try {
    const response = await client.searchPrompts(input);
    return {
      source: "RunAPI Prompt API",
      count: response.prompts.length,
      pagination: response.pagination,
      prompts: response.prompts.map(promptSummary)
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      error: `Prompt API unavailable: ${message}`,
      hint: "Try again later or continue with list_models and get_model_info for model discovery."
    };
  }
}

function promptSummary(prompt: RunApiPrompt) {
  return {
    id: prompt.id,
    title: prompt.title,
    prompt: prompt.prompt,
    model: prompt.runapi_model,
    service: prompt.service,
    action: prompt.action,
    modality: prompt.modality,
    category: prompt.category,
    tags: prompt.tags || [],
    featured: prompt.featured
  };
}
