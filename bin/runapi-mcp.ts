#!/usr/bin/env node
import { runInit } from "../src/init.js";

const [, , command, ...args] = process.argv;

if (command === "init") {
  await runInit(args);
} else {
  await import("../src/index.js");
}
