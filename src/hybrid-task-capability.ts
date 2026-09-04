const HYBRID_TASK_ACTIONS = new Set([
  "fish-audio/create-voice",
  "fish-audio/text-to-speech",
  "midjourney/get-seed",
  "midjourney/image-to-prompt",
  "midjourney/shorten-prompt",
  "openai-transcription/speech-to-text",
  "openai-tts/text-to-speech"
]);

export const HYBRID_TASK_COMPLETION_DEADLINE_MS = 20 * 60 * 1_000;

export function isHybridTaskAction(service: string, action: string): boolean {
  return HYBRID_TASK_ACTIONS.has(`${normalizeSegment(service)}/${normalizeSegment(action)}`);
}

function normalizeSegment(value: string): string {
  return value.replace(/_/g, "-").toLowerCase();
}
