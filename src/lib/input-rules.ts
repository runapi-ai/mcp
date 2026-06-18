import type { InputRule, ModelInfo } from "../types.js";
import { validateInputRules as coreValidateInputRules } from "@runapi.ai/mcp-core";

export type { InputRule } from "@runapi.ai/mcp-core";

// The conditional-rule engine lives in core; the aggregate owns the rule data
// for its embedded catalog and injects it into the engine.
const INPUT_RULES: Record<string, InputRule[]> = {
  "suno/text_to_music": [
    {
      when: { vocal_mode: "auto_lyrics" },
      required: ["prompt"],
      forbidden: ["lyrics", "style", "title"],
      description: "auto_lyrics requires prompt and must not include lyrics, style, or title."
    },
    {
      when: { vocal_mode: "exact_lyrics" },
      required: ["lyrics", "style", "title"],
      forbidden: ["prompt"],
      description: "exact_lyrics requires lyrics, style, and title, and must not include prompt."
    },
    {
      when: { vocal_mode: "instrumental" },
      required: ["style", "title"],
      forbidden: ["prompt", "lyrics"],
      description: "instrumental requires style and title, and must not include prompt or lyrics."
    }
  ]
};

export function inputRulesForModel(info: Pick<ModelInfo, "service" | "action">): InputRule[] {
  return INPUT_RULES[`${info.service}/${info.action}`] ?? [];
}

export function validateInputRules(info: ModelInfo, params: Record<string, unknown>): string | undefined {
  return coreValidateInputRules(inputRulesForModel(info), params);
}
