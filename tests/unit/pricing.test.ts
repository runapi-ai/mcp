import { describe, expect, it } from "vitest";
import { findModelForAction } from "../../src/lib/contract.js";
import { priceForModel } from "../../src/lib/pricing.js";

describe("pricing", () => {
  it("returns build-time pricing for a known endpoint", () => {
    const info = findModelForAction("flux-kontext", "text_to_image", "flux-kontext-pro");

    expect(info).toBeDefined();
    expect(priceForModel(info!).pricing).toMatchObject({
      unit_price_cents: expect.any(Number)
    });
  });

  it("falls back to pricing page when endpoint is absent from the snapshot", () => {
    const info = findModelForAction("gemini-omni", "create_audio", "gemini-omni-audio");

    expect(info).toBeDefined();
    expect(priceForModel(info!).pricing_url).toBe("https://runapi.ai/pricing");
  });

  it("falls back to pricing page for catalog-only pricing entries", () => {
    const info = findModelForAction("flux-kontext", "text_to_image", "flux-kontext-pro");

    expect(info).toBeDefined();
    expect(priceForModel(info!, {
      endpoints: {
        "Black Forest Labs/Flux Kontext/flux-kontext-pro/text_to_image": {}
      }
    })).toMatchObject({
      pricing: undefined,
      pricing_source: "pricing page",
      pricing_url: "https://runapi.ai/pricing"
    });
  });
});
