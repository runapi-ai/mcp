import { registerLoginTool } from "@runapi.ai/mcp-core";
import { friendlyError } from "@runapi.ai/mcp-core/web";
import { createBusinessServer } from "./business-tools.js";
import { PACKAGE_NAME, PACKAGE_VERSION, USER_AGENT } from "./constants.js";
import { readContract } from "./lib/data.js";
import { RunApiClient } from "./lib/runapi-client.js";
import { SERVER_INSTRUCTIONS } from "./server-instructions.js";

export function createServer() {
  const server = createBusinessServer({
    name: PACKAGE_NAME,
    version: PACKAGE_VERSION,
    instructions: SERVER_INSTRUCTIONS,
    contract: readContract(),
    client: new RunApiClient(),
    errorFormatter: friendlyError
  });
  registerLoginTool(server, { userAgent: USER_AGENT });

  return server;
}
