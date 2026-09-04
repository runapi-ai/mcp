import { describe, expect, it } from "vitest";
import { isHybridTaskAction } from "../../src/hybrid-task-capability.js";

describe("hybrid task capability", () => {
  it.each([
    ["fish-audio", "create_voice"],
    ["fish-audio", "text_to_speech"],
    ["midjourney", "get_seed"],
    ["midjourney", "image_to_prompt"],
    ["midjourney", "shorten_prompt"],
    ["openai-transcription", "speech_to_text"],
    ["openai-tts", "text_to_speech"]
  ])("recognizes %s/%s independently of generated contract metadata", (service, action) => {
    expect(isHybridTaskAction(service, action)).toBe(true);
  });

  it("does not classify ordinary synchronous actions as hybrid", () => {
    expect(isHybridTaskAction("fish-audio", "list_voices")).toBe(false);
  });
});
