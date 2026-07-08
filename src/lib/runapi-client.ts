import { RunApiClient as CoreRunApiClient, loadConfig, type RunApiConfig } from "@runapi.ai/mcp-core";
import { USER_AGENT } from "../constants.js";

// Thin shim over the core client that pins the aggregate's own User-Agent
// (`@runapi.ai/mcp/<version>`) so `new RunApiClient()` call sites stay unchanged.
export class RunApiClient extends CoreRunApiClient {
  constructor(config?: RunApiConfig, fetchImpl: typeof fetch = fetch) {
    super(config ?? loadConfig, fetchImpl, USER_AGENT);
  }
}

export { taskIdFromResponse, taskStatus } from "@runapi.ai/mcp-core";
