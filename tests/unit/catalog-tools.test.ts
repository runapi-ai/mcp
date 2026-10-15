import { describe, expect, it, vi } from "vitest";
import { readContract } from "../../src/lib/data.js";
import {
  checkPricingHandler as checkPricingWith,
  getModelInfoHandler as getModelInfoWith,
  listActionsHandler as listActionsWith,
  listModelsHandler as listModelsWith,
  searchPromptsHandler
} from "../../src/tools/catalog-handlers.js";

const contract = readContract();

function listModelsHandler(
  input: Parameters<typeof listModelsWith>[0]
) {
  return listModelsWith(input, contract);
}

function pricingClient(priceSchedules = [{service: "flux_kontext", action: "text_to_image", model: "flux-kontext-pro", unit_price_cents: 31}]) {
  return {listPriceSchedules: vi.fn(async () => ({as_of: "2026-07-23T00:00:00.000000Z", price_schedules: priceSchedules}))};
}

function getModelInfoHandler(input: Parameters<typeof getModelInfoWith>[0], client = pricingClient()) {
  return getModelInfoWith(input, contract, client);
}

function listActionsHandler() {
  return listActionsWith(contract);
}

function checkPricingHandler(input: Parameters<typeof checkPricingWith>[0], client = pricingClient()) {
  return checkPricingWith(input, contract, client);
}

describe("catalog tool handlers", () => {
  it("lists only executable models from embedded action rosters", () => {
    const result = listModelsHandler({
      service: "flux-kontext",
      action: "text_to_image"
    });

    expect(result.source).toBe("embedded catalog");
    expect(result).not.toHaveProperty("runtime_models");
    expect(result.models.length).toBeGreaterThan(0);
    expect(result.models.every((model) => model.service === "flux-kontext")).toBe(true);
  });

  it("filters the embedded catalog by modality", () => {
    const result = listModelsHandler({
      modality: "image"
    });

    expect(result.source).toBe("embedded catalog");
    expect(result.models.every((model) => model.modality === "image")).toBe(true);
  });

  it("filters the embedded catalog by service", () => {
    const result = listModelsHandler({
      service: "suno"
    });

    expect(result.source).toBe("embedded catalog");
    expect(result.models.length).toBeGreaterThan(0);
    expect(result.models.every((model) => model.service === "suno")).toBe(true);
  });

  it("gets model info with runtime pricing", async () => {
    const result = await getModelInfoHandler("flux-kontext-pro");

    expect(result).toMatchObject({
      model: "flux-kontext-pro",
      service: "flux-kontext",
      action: "text_to_image"
    });
    expect(result).toMatchObject({price: {price_schedule: {unit_price_cents: 31}}});
  });

  it.each([
    { model: "seedream-4.5-edit", supportsBackground: false },
    { model: "seedream-5-lite-edit", supportsBackground: false },
    { model: "seedream-5-pro-edit", supportsBackground: true },
    { model: "seedream-v4-edit", supportsBackground: false }
  ])("discovers Seedream edit background support for $model", async ({ model, supportsBackground }) => {
    for (const input of [model, { service: "seedream", action: "edit_image", model }]) {
      const result = await getModelInfoHandler(input);

      expect(result).toMatchObject({ model, service: "seedream", action: "edit_image" });
      const fields = "fields" in result ? result.fields : [];
      if (supportsBackground) {
        expect(fields).toEqual(expect.arrayContaining([
          expect.objectContaining({ name: "background", enum: ["transparent"] })
        ]));
      } else {
        expect(fields.map((field) => field.name)).not.toContain("background");
      }
    }
  });

  it.each(["s1", "s2-pro", "s2.1-pro"])("discovers Fish cloning requirements for %s", async (model) => {
    for (const input of [model, { service: "fish-audio", action: "text_to_speech", model }]) {
      const result = await getModelInfoHandler(input);

      expect(result).toMatchObject({
        fields: expect.arrayContaining([expect.objectContaining({
          name: "references",
          max_items: 1,
          description: "One temporary voice-cloning sample. Cannot be combined with voice_id. Omit, use null, or [] for no sample.",
          items: {
            type: "object",
            properties: {
              audio: {
                type: "string",
                required: true,
                pattern: "^https://",
                description: "Publicly accessible HTTPS audio URL. Must remain valid while queued and read by the provider."
              },
              text: {
                type: "string",
                required: true,
                description: "Exact transcript that matches the reference audio word for word."
              }
            }
          }
        })]),
        rules: expect.arrayContaining([{
          when: { references: { present: true } },
          forbidden: ["voice_id"]
        }])
      });
    }
  });

  it("marks multi-endpoint model info as ambiguous without service and action", async () => {
    const result = await getModelInfoHandler("suno-v4", pricingClient([
      {service: "suno", action: "text_to_music", model: "suno-v4", unit_price_cents: 12}
    ]));

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

  it("disambiguates model info with service and action", async () => {
    const result = await getModelInfoHandler({
      service: "suno",
      action: "text_to_music",
      model: "suno-v4"
    }, pricingClient([{service: "suno", action: "text_to_music", model: "suno-v4", unit_price_cents: 12}]));

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
  });

  it("returns a helpful response for unknown model info", async () => {
    const result = await getModelInfoHandler("missing-model");

    expect(result).toMatchObject({
      error: "Unknown RunAPI model: missing-model"
    });
  });

  it("returns a helpful response for unsupported model action combinations", async () => {
    const result = await getModelInfoHandler({
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

  it("checks current pricing and reports unavailable lookup without a stale fallback", async () => {
    await expect(checkPricingHandler({
      service: "flux-kontext",
      action: "text_to_image",
      model: "flux-kontext-pro"
    })).resolves.toMatchObject({
      supported: true,
      model: "flux-kontext-pro"
    });

    await expect(checkPricingHandler({
      service: "missing",
      action: "text_to_image"
    })).resolves.toMatchObject({
      supported: false
    });

    await expect(checkPricingHandler({service: "flux-kontext", action: "text_to_image", model: "flux-kontext-pro"}, {
      listPriceSchedules: vi.fn(async () => { throw new Error("offline"); })
    })).resolves.toMatchObject({
      supported: true,
      price: {error: expect.stringContaining("https://runapi.ai/pricing")}
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
            id: "prm_123",
            title: "Logo prompt",
            prompt: "Minimal logo prompt",
            modality: "image",
            category: "Branding",
            tags: ["Logo"],
            eligible_endpoints: [
              {service: "flux-kontext", action: "text_to_image", model: "flux-kontext-pro", path: "/api/v1/flux-kontext/text_to_image"}
            ]
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
          id: "prm_123",
          title: "Logo prompt",
          prompt: "Minimal logo prompt",
          category: "Branding",
          tags: ["Logo"],
          endpoints: [{service: "flux-kontext", action: "text_to_image", model: "flux-kontext-pro"}]
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
