import fs from "node:fs";
import path from "node:path";

const PLATFORM_CONFIGS = {
  claude: ".mcp.json",
  cursor: ".cursor/mcp.json",
  windsurf: ".windsurf/mcp.json",
  vscode: ".vscode/mcp.json",
  roo: ".roo/mcp.json"
} as const;

type Platform = keyof typeof PLATFORM_CONFIGS;

export async function runInit(args: string[]) {
  const platform = args[0] as Platform | undefined;
  if (!platform || !(platform in PLATFORM_CONFIGS)) {
    console.error("Usage: runapi-mcp init <claude|cursor|windsurf|vscode|roo>");
    process.exitCode = 1;
    return;
  }

  const file = path.resolve(process.cwd(), PLATFORM_CONFIGS[platform]);
  fs.mkdirSync(path.dirname(file), { recursive: true });

  const existing = readJson(file);
  const serverConfig = {
    command: "npx",
    args: ["-y", "@runapi.ai/mcp"]
  };

  const next = platform === "vscode" ? {
    ...existing,
    servers: {
      ...(existing.servers || {}),
      runapi: {
        type: "stdio",
        ...serverConfig
      }
    }
  } : {
    ...existing,
    mcpServers: {
      ...(existing.mcpServers || {}),
      runapi: serverConfig
    }
  };

  fs.writeFileSync(file, `${JSON.stringify(next, null, 2)}\n`);
  console.log(`Wrote ${file}`);
  console.log();
  console.log("Next steps:");
  console.log("  1. Sign up at https://runapi.ai and go to Dashboard > API Keys");
  console.log("  2. Save your key:");
  console.log('     mkdir -p ~/.config/runapi && echo \'{"api_key":"YOUR_KEY"}\' > ~/.config/runapi/config.json');
  console.log(`  3. Restart ${platformName(platform)}`);
  console.log();
  console.log("Free tools (model browsing, pricing) work without a key.");
  console.log('Try asking: "What image models does RunAPI have?"');
}

function platformName(platform: Platform): string {
  const names: Record<Platform, string> = {
    claude: "Claude Code",
    cursor: "Cursor",
    windsurf: "Windsurf",
    vscode: "VS Code",
    roo: "Roo Code"
  };
  return names[platform];
}

function readJson(file: string): Record<string, any> {
  if (!fs.existsSync(file)) {
    return {};
  }

  return JSON.parse(fs.readFileSync(file, "utf8")) as Record<string, any>;
}
