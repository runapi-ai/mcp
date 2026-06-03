import { fieldSummary, findModel, findModelForAction, findModels, listActionGroups, listContractModels } from "../lib/contract.js";
import { inputRulesForModel } from "../lib/input-rules.js";
import { priceForModel } from "../lib/pricing.js";
import { modalityForAction } from "../lib/text.js";
import type { RunApiClient } from "../lib/runapi-client.js";
import type { ModelInfo } from "../types.js";

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

export async function listModelsHandler(input: ListModelsInput, client: Pick<RunApiClient, "listModels">) {
  let models = listContractModels();
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

export function getModelInfoHandler(input: string | GetModelInfoInput) {
  const request = typeof input === "string" ? { model: input } : input;
  const info = request.service && request.action
    ? findModelForAction(request.service, request.action, request.model)
    : findModel(request.model);

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

  const matches = findModels(request.model);
  const ambiguous = !request.service && !request.action && matches.length > 1;

  return {
    ...modelInfoResponse(info),
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

export function listActionsHandler() {
  return {
    groups: listActionGroups()
  };
}

function modelInfoResponse(info: ModelInfo) {
  const inputRules = inputRulesForModel(info);

  return {
    model: info.model,
    service: info.service,
    action: info.action,
    modality: modalityForAction(info.action),
    model_line: info.model_line,
    fields: fieldSummary(info.fields),
    ...(inputRules.length > 0 ? { input_rules: inputRules } : {}),
    price: priceForModel(info)
  };
}

export function checkPricingHandler(input: { service: string; action: string; model?: string }) {
  const info = findModelForAction(input.service, input.action, input.model);
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
    price: priceForModel(info)
  };
}
