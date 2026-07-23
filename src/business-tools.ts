import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type {
  Contract,
  PollingOptions,
  PricingConfig,
  RunApiPromptsResponse,
  RunApiTaskResponse,
  SearchPromptsParams
} from "@runapi.ai/mcp-core/web";
import { friendlyError } from "@runapi.ai/mcp-core/web";
import { registerAuthenticatedTools } from "./tools/authenticated.js";
import { registerCatalogTools } from "./tools/catalog.js";

export type BusinessToolClient = {
  listModels(): Promise<unknown>;
  searchPrompts(params?: SearchPromptsParams): Promise<RunApiPromptsResponse>;
  balance(): Promise<unknown>;
  createTask(service: string, action: string, params: Record<string, unknown>): Promise<RunApiTaskResponse>;
  getTask(service: string, taskId: string, action?: string): Promise<RunApiTaskResponse>;
  pollTask(service: string, taskId: string, action?: string, options?: PollingOptions): Promise<RunApiTaskResponse>;
};

export type DiscoveryToolClient = Pick<BusinessToolClient, "listModels" | "searchPrompts">;

export type DiscoveryServerOptions = {
  name: string;
  version: string;
  instructions?: string;
  contract: Contract;
  pricing: PricingConfig;
  client: DiscoveryToolClient;
  errorFormatter?: (error: unknown) => string;
};

export type BusinessServerOptions = Omit<DiscoveryServerOptions, "client"> & {
  client: BusinessToolClient;
};

export type DiscoveryToolDependencies = {
  contract: Contract;
  pricing: PricingConfig;
  client: DiscoveryToolClient;
  errorFormatter: (error: unknown) => string;
};

export type BusinessToolDependencies = Omit<DiscoveryToolDependencies, "client"> & {
  client: BusinessToolClient;
};

export function createDiscoveryServer(options: DiscoveryServerOptions): McpServer {
  const server = new McpServer(
    {
      name: options.name,
      version: options.version
    },
    {
      instructions: options.instructions,
      capabilities: {
        tools: {},
        logging: {}
      }
    }
  );

  const dependencies: DiscoveryToolDependencies = {
    contract: options.contract,
    pricing: options.pricing,
    client: options.client,
    errorFormatter: options.errorFormatter ?? hostedError
  };

  registerCatalogTools(server, dependencies);

  return server;
}

export function createBusinessServer(options: BusinessServerOptions): McpServer {
  const server = createDiscoveryServer(options);
  const dependencies: BusinessToolDependencies = {
    contract: options.contract,
    pricing: options.pricing,
    client: options.client,
    errorFormatter: options.errorFormatter ?? hostedError
  };

  registerAuthenticatedTools(server, dependencies);

  return server;
}

function hostedError(error: unknown): string {
  return friendlyError(error, {
    authentication: "RunAPI could not authenticate the credentials attached to this MCP request. Verify them, then retry."
  });
}
