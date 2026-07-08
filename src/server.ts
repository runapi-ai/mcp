import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerLoginTool } from "@runapi.ai/mcp-core";
import { PACKAGE_NAME, PACKAGE_VERSION, USER_AGENT } from "./constants.js";
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
        tools: {},
        logging: {}
      }
    }
  );

  registerCatalogTools(server);
  registerLoginTool(server, { userAgent: USER_AGENT });
  registerAuthenticatedTools(server);

  return server;
}
