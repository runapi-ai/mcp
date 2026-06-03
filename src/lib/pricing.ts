import type { ModelInfo, PricingConfig, PricingEndpoint } from "../types.js";
import { readPricing } from "./data.js";

export const pricing = readPricing();

export function priceForModel(info: ModelInfo, source: PricingConfig = pricing) {
  const key = pricingKey(info);
  const endpoint = source.endpoints?.[key];
  const markup = effectiveMarkup(key, info.provider, source);

  return {
    pricing: endpoint ? presentPrice(endpoint, markup) : undefined,
    pricing_source: endpoint ? "build-time pricing snapshot" : "pricing page",
    pricing_url: "https://runapi.ai/pricing"
  };
}

function pricingKey(info: ModelInfo): string {
  return `${info.provider}/${info.model_line}/${info.model}/${info.action}`;
}

function effectiveMarkup(key: string, provider: string, source: PricingConfig): number {
  return source.endpoint_markup?.[key] ?? source.provider_markup?.[provider] ?? source.markup_rate ?? 1;
}

function presentPrice(endpoint: PricingEndpoint, markup: number) {
  const result: Record<string, unknown> = {};

  for (const [name, value] of Object.entries(endpoint)) {
    if (name === "cost_billing_config") {
      result.billing_config = presentBillingConfig(endpoint.cost_billing_config, markup);
      continue;
    }

    if (typeof value === "number") {
      const publicName = name.replace(/^cost_/, "");
      result[publicName] = Number.isInteger(value * markup) ? value * markup : Math.ceil(value * markup);
    }
  }

  return result;
}

function presentBillingConfig(config: PricingEndpoint["cost_billing_config"], markup: number) {
  if (!config) {
    return undefined;
  }

  return {
    key: config.key,
    overrides: Object.fromEntries(Object.entries(config.overrides || {}).map(([key, value]) => [key, value * markup]))
  };
}
