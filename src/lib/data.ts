import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import type { Contract, PricingConfig } from "../types.js";

function repoRoot(): string {
  const current = path.dirname(fileURLToPath(import.meta.url));
  const candidates = [
    path.resolve(current, "..", "..", ".."),
    path.resolve(current, "..", "..")
  ];

  const root = candidates.find((candidate) => existsSync(path.join(candidate, "data", "contract.json")));
  if (!root) {
    throw new Error("Unable to locate RunAPI MCP data directory.");
  }

  return root;
}

export function readContract(): Contract {
  return JSON.parse(readFileSync(path.join(repoRoot(), "data", "contract.json"), "utf8")) as Contract;
}

export function readPricing(): PricingConfig {
  return JSON.parse(readFileSync(path.join(repoRoot(), "data", "pricing.json"), "utf8")) as PricingConfig;
}
