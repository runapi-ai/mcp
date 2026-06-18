import type { Contract, ContractAction, ContractField, ModelInfo } from "../types.js";
import * as core from "@runapi.ai/mcp-core";
import { readContract } from "./data.js";

// The aggregate owns its embedded contract and injects it into the core
// queries. Keeping the bound defaults lets handlers and tests call these with
// no source argument exactly as before.
export const contract: Contract = readContract();

export function listContractModels(source: Contract = contract): ModelInfo[] {
  return core.listContractModels(source);
}

export function listActionGroups(source: Contract = contract) {
  return core.listActionGroups(source);
}

export function findAction(service: string, action: string, source: Contract = contract): ContractAction | undefined {
  return core.findAction(service, action, source);
}

export function findModel(model: string, source: Contract = contract): ModelInfo | undefined {
  return core.findModel(model, source);
}

export function findModels(model: string, source: Contract = contract): ModelInfo[] {
  return core.findModels(model, source);
}

export function findModelForAction(service: string, action: string, model?: string, source: Contract = contract): ModelInfo | undefined {
  return core.findModelForAction(service, action, model, source);
}

export function fieldsForModel(action: ContractAction, model: string): Record<string, ContractField> {
  return core.fieldsForModel(action, model);
}

export function fieldSummary(fields: Record<string, ContractField>) {
  return core.fieldSummary(fields);
}
