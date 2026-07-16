import type { InputRule, ModelInfo } from "../types.js";
import { validateInputRules as coreValidateInputRules } from "@runapi.ai/mcp-core";
import { findAction } from "./contract.js";

export type { InputRule } from "@runapi.ai/mcp-core";

export function inputRulesForModel(info: Pick<ModelInfo, "service" | "action">): InputRule[] {
  return findAction(info.service, info.action)?.rules ?? [];
}

export function validateInputRules(info: ModelInfo, params: Record<string, unknown>): string | undefined {
  return coreValidateInputRules(inputRulesForModel(info), params);
}
