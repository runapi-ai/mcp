import type { ModelInfo, PricingConfig } from "../types.js";
import * as core from "@runapi.ai/mcp-core";
import { readPricing } from "./data.js";

// The aggregate owns its embedded pricing snapshot and injects it into core.
export const pricing: PricingConfig = readPricing();

export function priceForModel(info: ModelInfo, source: PricingConfig = pricing) {
  return core.priceForModel(info, source);
}
