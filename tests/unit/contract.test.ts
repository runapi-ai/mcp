import { describe, expect, it } from "vitest";
import { contract, findModel, findModelForAction, listActionGroups } from "../../src/lib/contract.js";

describe("contract helpers", () => {
  it("loads the embedded contract with no internal fields", () => {
    expect(Object.keys(contract.actions).length).toBeGreaterThan(40);
    // The embedded contract must not ship provider names.
    expect(Object.values(contract.actions).every((action) => !("provider" in action))).toBe(true);
  });

  it("publishes the Fish temporary cloning contract for every version", () => {
    const action = contract.actions["fish-audio/text-to-speech"];
    for (const model of ["s1", "s2-pro", "s2.1-pro"]) {
      const references = action.fields_by_model[model].references;
      expect(references.max_items).toBe(1);
      expect(references.items?.properties?.audio).toMatchObject({ pattern: "^https://", required: true });
      expect(references.items?.properties?.text).toMatchObject({ required: true });
    }
    expect((action as unknown as { rules: unknown[] }).rules).toContainEqual({
      when: { references: { present: true } }, forbidden: ["voice_id"]
    });
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

  it("provides a field roster for every advertised action model", () => {
    for (const action of Object.values(contract.actions)) {
      const rosters = action.models.length > 0 ? action.models : ["_"];
      expect(Object.keys(action.fields_by_model)).toEqual(expect.arrayContaining(rosters));
    }
  });
});
