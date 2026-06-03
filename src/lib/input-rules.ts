import type { ModelInfo } from "../types.js";

export type InputRule = {
  when: Record<string, unknown>;
  required: string[];
  forbidden: string[];
  description: string;
};

export function inputRulesForModel(info: Pick<ModelInfo, "service" | "action">): InputRule[] {
  if (info.service === "suno" && info.action === "text_to_music") {
    return [
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
    ];
  }

  return [];
}

export function validateInputRules(info: ModelInfo, params: Record<string, unknown>): string | undefined {
  const rules = inputRulesForModel(info);
  if (rules.length === 0) {
    return undefined;
  }

  const controllingFields = new Set(rules.flatMap((rule) => Object.keys(rule.when)));
  for (const field of controllingFields) {
    if (!hasValue(params[field])) {
      return `${field} is required to choose a valid parameter shape.`;
    }
  }

  const rule = rules.find((candidate) => Object.entries(candidate.when).every(([field, value]) => params[field] === value));
  if (!rule) {
    return undefined;
  }

  const missing = rule.required.filter((field) => !hasValue(params[field]));
  const presentForbidden = rule.forbidden.filter((field) => hasValue(params[field]));
  if (missing.length === 0 && presentForbidden.length === 0) {
    return undefined;
  }

  const parts = [];
  if (missing.length > 0) {
    parts.push(`requires ${missing.join(", ")}`);
  }
  if (presentForbidden.length > 0) {
    parts.push(`must not include ${presentForbidden.join(", ")}`);
  }

  return `${formatWhen(rule.when)} ${parts.join(" and ")}.`;
}

function hasValue(value: unknown): boolean {
  return value !== undefined && value !== null && !(typeof value === "string" && value.trim() === "");
}

function formatWhen(when: Record<string, unknown>): string {
  return Object.entries(when).map(([field, value]) => `${field}=${String(value)}`).join(", ");
}
