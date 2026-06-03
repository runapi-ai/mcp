import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { DEFAULT_BASE_URL, RUNAPI_API_KEY_ENV } from "./constants.js";

export type RunApiConfig = {
  apiKey?: string;
  baseUrl: string;
};

type ConfigFile = {
  apiKey?: string;
  api_key?: string;
  baseUrl?: string;
  base_url?: string;
};

export function configPath(): string {
  return path.join(os.homedir(), ".config", "runapi", "config.json");
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): RunApiConfig {
  const file = readConfigFile();
  const apiKey = env[RUNAPI_API_KEY_ENV]?.trim() || file.apiKey || file.api_key || undefined;
  const baseUrl = env.RUNAPI_BASE_URL?.trim() || file.baseUrl || file.base_url || DEFAULT_BASE_URL;

  return { apiKey, baseUrl };
}

export function requireApiKey(config = loadConfig()): string {
  if (!config.apiKey) {
    throw new Error("RunAPI API key is required. Sign up at https://runapi.ai, go to Dashboard > API Keys, then: mkdir -p ~/.config/runapi && echo '{\"api_key\":\"YOUR_KEY\"}' > ~/.config/runapi/config.json");
  }
  return config.apiKey;
}

function readConfigFile(): ConfigFile {
  const file = configPath();
  if (!fs.existsSync(file)) {
    return {};
  }

  try {
    return JSON.parse(fs.readFileSync(file, "utf8")) as ConfigFile;
  } catch {
    return {};
  }
}
