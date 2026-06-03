export function humanize(value: string): string {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function modalityForAction(action: string): "image" | "video" | "audio" | "utility" {
  if (action.includes("video") || action === "ai_avatar" || action === "motion_control" || action === "animate") {
    return "video";
  }

  if (action.includes("image") || action.includes("background") || action === "create_character") {
    return "image";
  }

  if (action.includes("audio") || action.includes("music") || action.includes("speech") || action.includes("sound") || action.includes("voice") || action.includes("dialogue")) {
    return "audio";
  }

  return "utility";
}

export function contractKey(service: string, action: string): string {
  return `${service}/${action.replaceAll("_", "-")}`;
}

export function routeAction(action: string): string {
  return action.replaceAll("-", "_");
}

export function publicModelUrl(model: string): string {
  return `https://runapi.ai/pricing?model=${encodeURIComponent(model)}`;
}
