import type { InputRule, ModelInfo } from "../types.js";
import {
  inputRulesForModel as coreInputRulesForModel,
  validateInputRules as coreValidateInputRules
} from "@runapi.ai/mcp-core/web";
import type { Contract } from "../types.js";
import { contract } from "./contract.js";

export type { InputRule } from "@runapi.ai/mcp-core";

export function inputRulesForModel(
  info: Pick<ModelInfo, "service" | "action">,
  source: Contract = contract
): InputRule[] {
  return coreInputRulesForModel(info, source);
}

export function validateInputRules(info: ModelInfo, params: Record<string, unknown>): string | undefined {
  return coreValidateInputRules(inputRulesForModel(info), params);
}
