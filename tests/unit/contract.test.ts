import { describe, expect, it } from "vitest";
import { contract, findModel, findModelForAction, listActionGroups, listContractModels } from "../../src/lib/contract.js";
import { validateInputRules } from "../../src/lib/input-rules.js";
import { validateParams } from "../../src/lib/schema.js";

describe("contract helpers", () => {
  it("loads the embedded contract with no internal fields", () => {
    expect(contract.catalog_models.length).toBeGreaterThan(100);
    expect(Object.keys(contract.actions).length).toBeGreaterThan(40);
    // The embedded contract must not ship provider names.
    expect(Object.values(contract.actions).every((action) => !("provider" in action))).toBe(true);
  });

  it("finds model metadata", () => {
    const model = findModel("flux-kontext-pro");

    expect(model).toMatchObject({
      service: "flux-kontext",
      action: "text_to_image",
      model: "flux-kontext-pro"
    });
  });

  it("finds service/action/model combinations", () => {
    const model = findModelForAction("suno", "text_to_music", "suno-v5");

    expect(model?.model).toBe("suno-v5");
    expect(model?.fields).toBeTypeOf("object");
  });

  it("groups actions by modality", () => {
    const groups = listActionGroups();

    expect(groups.find((group) => group.modality === "image")?.actions).toContain("text_to_image");
    expect(groups.find((group) => group.modality === "video")?.actions).toContain("text_to_video");
  });

  it("does not expose models outside catalog_models", () => {
    const embeddedModels = new Set(contract.catalog_models);
    const missing = listContractModels().filter((model) => !embeddedModels.has(model.model));

    expect(missing).toEqual([]);
  });

  it("rejects Nano Banana Lite forbidden fields after model schema validation", () => {
    const info = findModelForAction("nano-banana", "edit_image", "nano-banana-2-lite");

    expect(info).toBeDefined();
    expect(info!.fields).not.toHaveProperty("output_format");

    // MCP validation intentionally passes undeclared API-specific params through,
    // so the model-scoped rule remains the enforcement layer for forbidden fields.
    const params = validateParams(info!.fields, {
      model: "nano-banana-2-lite",
      prompt: "Edit this image",
      source_image_urls: ["https://cdn.runapi.ai/example.png"],
      aspect_ratio: "auto",
      output_format: "png"
    });
    expect(params).toHaveProperty("output_format", "png");
    expect(validateInputRules(info!, params)).toBe("model=nano-banana-2-lite must not include output_format.");
  });
});
