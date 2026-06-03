import type { Contract, ContractAction, ContractField, ModelInfo } from "../types.js";
import { contractKey, modalityForAction, routeAction } from "./text.js";
import { readContract } from "./data.js";

export const contract = readContract();

export function listContractModels(source: Contract = contract): ModelInfo[] {
  return Object.entries(source.actions).flatMap(([key, action]) => {
    const [service, actionSlug] = key.split("/");
    return action.models.map((model) => ({
      service,
      action: action.endpoint,
      route_action: routeAction(actionSlug),
      provider: action.provider,
      model_line: action.model,
      model,
      fields: fieldsForModel(action, model)
    }));
  });
}

export function listActionGroups(source: Contract = contract) {
  const groups = new Map<string, Set<string>>();

  for (const action of Object.values(source.actions)) {
    const modality = modalityForAction(action.endpoint);
    if (!groups.has(modality)) {
      groups.set(modality, new Set());
    }
    groups.get(modality)?.add(action.endpoint);
  }

  return [...groups.entries()].map(([modality, actions]) => ({
    modality,
    actions: [...actions].sort()
  }));
}

export function findAction(service: string, action: string, source: Contract = contract): ContractAction | undefined {
  const direct = source.actions[contractKey(service, action)];
  if (direct) {
    return direct;
  }

  return Object.entries(source.actions).find(([key, value]) => {
    const [candidateService] = key.split("/");
    return candidateService === service && value.endpoint === action;
  })?.[1];
}

export function findModel(model: string, source: Contract = contract): ModelInfo | undefined {
  return listContractModels(source).find((entry) => entry.model === model);
}

export function findModels(model: string, source: Contract = contract): ModelInfo[] {
  return listContractModels(source).filter((entry) => entry.model === model);
}

export function findModelForAction(service: string, action: string, model?: string, source: Contract = contract): ModelInfo | undefined {
  const entry = findAction(service, action, source);
  if (!entry) {
    return undefined;
  }

  const selectedModel = model || entry.models[0];
  if (!entry.models.includes(selectedModel)) {
    return undefined;
  }

  return {
    service,
    action: entry.endpoint,
    route_action: entry.endpoint,
    provider: entry.provider,
    model_line: entry.model,
    model: selectedModel,
    fields: fieldsForModel(entry, selectedModel)
  };
}

export function fieldsForModel(action: ContractAction, model: string): Record<string, ContractField> {
  return action.fields_by_model[model] || action.fields_by_model.__nil_model__ || {};
}

export function fieldSummary(fields: Record<string, ContractField>) {
  return Object.entries(fields).map(([name, field]) => ({
    name,
    required: Boolean(field.required),
    enum: field.enum,
    default: field.default,
    min: field.min ?? field.minimum,
    max: field.max ?? field.maximum,
    type: field.type
  }));
}
