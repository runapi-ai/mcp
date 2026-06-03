import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { PACKAGE_NAME, PACKAGE_VERSION } from "./constants.js";
import { SERVER_INSTRUCTIONS } from "./server-instructions.js";
import { registerAuthenticatedTools } from "./tools/authenticated.js";
import { registerCatalogTools } from "./tools/catalog.js";

export function createServer() {
  const server = new McpServer(
    {
      name: PACKAGE_NAME,
      version: PACKAGE_VERSION
    },
    {
      instructions: SERVER_INSTRUCTIONS,
      capabilities: {
        tools: {}
      }
    }
  );

  registerCatalogTools(server);
  registerAuthenticatedTools(server);

  return server;
}
