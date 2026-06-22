import { describe, expect, it } from "vitest";
import { contract, findModel, findModelForAction, listActionGroups, listContractModels } from "../../src/lib/contract.js";

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
});
