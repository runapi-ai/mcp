#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const railsRoot = path.resolve(process.argv[2] || "..");
const destination = path.resolve("data");

fs.mkdirSync(destination, { recursive: true });
fs.copyFileSync(path.join(railsRoot, "sdk", "contract.json"), path.join(destination, "contract.json"));

const ruby = spawnSync("ruby", [
  "-r", "yaml",
  "-r", "json",
  "-e",
  "data=YAML.load_file(ARGV[0]); puts JSON.pretty_generate(data)",
  path.join(railsRoot, "db", "pricing.yml")
], { encoding: "utf8" });

if (ruby.status !== 0) {
  process.stderr.write(ruby.stderr);
  process.exit(ruby.status || 1);
}

fs.writeFileSync(path.join(destination, "pricing.json"), ruby.stdout);
console.log(`Synced contract.json and pricing.json from ${railsRoot}`);
