#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const railsRoot = path.resolve(process.argv[2] || "..");
const destination = path.resolve("data");
const ifRailsRoot = process.argv.includes("--if-rails-root");
const railsRootFiles = [
  path.join(railsRoot, "sdk", "contract.json"),
  path.join(railsRoot, "lib", "mcp", "final_pricing.rb")
];

if (ifRailsRoot && !railsRootFiles.every((file) => fs.existsSync(file))) {
  console.log(`Skipping data sync; ${railsRoot} is not a Rails root with MCP source data.`);
  process.exit(0);
}

for (const file of railsRootFiles) {
  if (!fs.existsSync(file)) {
    console.error(`Missing required data source: ${file}`);
    process.exit(1);
  }
}

// Ship only the generated contract required for model discovery and input
// validation. Runtime pricing is always fetched through the public API.
const script = `
require "fileutils"
require "json"
require ARGV[0]
rails_root = ARGV[1]
dest = ARGV[2]
FileUtils.mkdir_p(dest)
contract = JSON.parse(File.read(File.join(rails_root, "sdk", "contract.json")))
File.write(File.join(dest, "contract.json"), JSON.pretty_generate(Mcp::FinalPricing.strip_contract(contract)) + "\\n")
`;

const ruby = spawnSync(
  "ruby",
  ["-e", script, path.join(railsRoot, "lib", "mcp", "final_pricing.rb"), railsRoot, destination],
  { encoding: "utf8" }
);

if (ruby.status !== 0) {
  process.stderr.write(ruby.stderr);
  process.exit(ruby.status || 1);
}

console.log(`Synced contract.json from ${railsRoot}`);
