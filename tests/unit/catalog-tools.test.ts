import { describe, expect, it, vi } from "vitest";
import { readContract, readPricing } from "../../src/lib/data.js";
import {
  checkPricingHandler as checkPricingWith,
  getModelInfoHandler as getModelInfoWith,
  listActionsHandler as listActionsWith,
  listModelsHandler as listModelsWith,
  searchPromptsHandler
} from "../../src/tools/catalog-handlers.js";

const contract = readContract();
const pricing = readPricing();

function listModelsHandler(
  input: Parameters<typeof listModelsWith>[0],
  client: Parameters<typeof listModelsWith>[1]
) {
  return listModelsWith(input, client, contract);
}

function getModelInfoHandler(input: Parameters<typeof getModelInfoWith>[0]) {
  return getModelInfoWith(input, contract, pricing);
}

function listActionsHandler() {
  return listActionsWith(contract);
}

function checkPricingHandler(input: Parameters<typeof checkPricingWith>[0]) {
  return checkPricingWith(input, contract, pricing);
}

describe("catalog tool handlers", () => {
  it("lists models with contract data and runtime models when available", async () => {
    const result = await listModelsHandler({
      service: "flux-kontext",
      action: "text_to_image"
    }, {
      listModels: vi.fn(async () => ({ data: [{ id: "runtime-model" }] }))
    });

    expect(result.source).toBe("embedded catalog + /v1/models");
    expect(result.models.length).toBeGreaterThan(0);
    expect(result.models.every((model) => model.service === "flux-kontext")).toBe(true);
  });

  it("falls back to contract data when /v1/models is unavailable", async () => {
    const result = await listModelsHandler({
      modality: "image"
    }, {
      listModels: vi.fn(async () => {
        throw new Error("network");
      })
    });

    expect(result.source).toBe("embedded catalog");
    expect(result.runtime_models).toBeUndefined();
    expect(result.models.every((model) => model.modality === "image")).toBe(true);
  });

  it("keeps catalog tools free when /v1/models requires auth", async () => {
    const result = await listModelsHandler({
      service: "suno"
    }, {
      listModels: vi.fn(async () => {
        throw new Error("401");
      })
    });

    expect(result.source).toBe("embedded catalog");
    expect(result.models.length).toBeGreaterThan(0);
    expect(result.models.every((model) => model.service === "suno")).toBe(true);
  });

  it("gets model info with pricing", () => {
    const result = getModelInfoHandler("flux-kontext-pro");

    expect(result).toMatchObject({
      model: "flux-kontext-pro",
      service: "flux-kontext",
      action: "text_to_image"
    });
    expect("price" in result).toBe(true);
  });

  it("marks multi-endpoint model info as ambiguous without service and action", () => {
    const result = getModelInfoHandler("suno-v4");

    expect(result).toMatchObject({
      model: "suno-v4",
      ambiguous: true
    });
    expect("matches" in result ? result.matches : []).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          service: "suno",
          action: "text_to_music"
        }),
        expect.objectContaining({
          service: "suno",
          action: "cover_audio"
        })
      ])
    );
  });

  it("disambiguates model info with service and action", () => {
    const result = getModelInfoHandler({
      service: "suno",
      action: "text_to_music",
      model: "suno-v4"
    });

    expect(result).toMatchObject({
      model: "suno-v4",
      service: "suno",
      action: "text_to_music"
    });
    expect("ambiguous" in result).toBe(false);
    expect("fields" in result ? result.fields : []).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "vocal_mode",
          enum: expect.arrayContaining(["auto_lyrics", "exact_lyrics", "instrumental"])
        })
      ])
    );
    expect("input_rules" in result ? result.input_rules : []).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          when: { vocal_mode: "instrumental" },
          required: ["style", "title"],
          forbidden: ["prompt", "lyrics"]
        })
      ])
    );
  });

  it("exposes generated contract input rules for Kling V3 Turbo", () => {
    const result = getModelInfoHandler({
      service: "kling",
      action: "image_to_video",
      model: "kling-v3-turbo-image-to-video"
    });

    expect(result).toMatchObject({
      model: "kling-v3-turbo-image-to-video",
      service: "kling",
      action: "image_to_video"
    });
    expect("input_rules" in result ? result.input_rules : []).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          when: { model: "kling-v3-turbo-image-to-video" },
          forbidden: expect.arrayContaining(["negative_prompt", "cfg_scale", "last_frame_image_url"])
        })
      ])
    );
  });

  it("returns a helpful response for unknown model info", () => {
    const result = getModelInfoHandler("missing-model");

    expect(result).toMatchObject({
      error: "Unknown RunAPI model: missing-model"
    });
  });

  it("returns a helpful response for unsupported model action combinations", () => {
    const result = getModelInfoHandler({
      service: "suno",
      action: "text_to_video",
      model: "suno-v4"
    });

    expect(result).toMatchObject({
      error: "Unsupported RunAPI model/action combination: suno/text_to_video with model suno-v4"
    });
  });

  it("lists action groups", () => {
    const result = listActionsHandler();

    expect(result.groups.find((group) => group.modality === "image")?.actions).toContain("text_to_image");
    expect(result.groups.find((group) => group.modality === "video")?.actions).toContain("text_to_video");
  });

  it("checks pricing for supported and unsupported combinations", () => {
    expect(checkPricingHandler({
      service: "flux-kontext",
      action: "text_to_image",
      model: "flux-kontext-pro"
    })).toMatchObject({
      supported: true,
      model: "flux-kontext-pro"
    });

    expect(checkPricingHandler({
      service: "missing",
      action: "text_to_image"
    })).toMatchObject({
      supported: false
    });
  });

  it("searches prompts through the RunAPI Prompt API", async () => {
    const result = await searchPromptsHandler({
      modality: "image",
      q: "logo"
    }, {
      searchPrompts: vi.fn(async () => ({
        prompts: [
          {
            id: 123,
            title: "Logo prompt",
            prompt: "Minimal logo prompt",
            modality: "image",
            service: "flux-kontext",
            action: "text_to_image",
            runapi_model: "flux-kontext-pro",
            category: "Branding",
            tags: ["Logo"],
            featured: true
          }
        ],
        pagination: {
          page: 1,
          per_page: 20,
          total: 1,
          pages: 1
        }
      }))
    });

    expect(result).toMatchObject({
      source: "RunAPI Prompt API",
      count: 1,
      prompts: [
        {
          id: 123,
          title: "Logo prompt",
          prompt: "Minimal logo prompt",
          model: "flux-kontext-pro",
          category: "Branding",
          tags: ["Logo"]
        }
      ]
    });
  });

  it("returns a useful prompt API error", async () => {
    const result = await searchPromptsHandler({}, {
      searchPrompts: vi.fn(async () => {
        throw new Error("network");
      })
    });

    expect(result).toMatchObject({
      error: "Prompt API unavailable: network"
    });
  });
});
