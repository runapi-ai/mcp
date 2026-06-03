export class RunApiClientError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly details?: unknown
  ) {
    super(message);
    this.name = "RunApiClientError";
  }
}

export class PollTimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PollTimeoutError";
  }
}

export function friendlyError(error: unknown): string {
  if (error instanceof RunApiClientError) {
    switch (error.status) {
      case 401:
        return "RunAPI rejected the API key. Check RUNAPI_API_KEY or ~/.config/runapi/config.json.";
      case 402:
        return "The RunAPI account has insufficient credits. Add credits in the RunAPI dashboard, then retry.";
      case 429:
        return "RunAPI rate limited this request. Wait briefly, then retry.";
      case 503:
        return "This RunAPI service is temporarily unavailable. Retry later or choose another model.";
      default:
        return error.message;
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "RunAPI request failed.";
}

export async function errorFromResponse(response: Response): Promise<RunApiClientError> {
  const text = await response.text();
  let body: unknown = text;

  try {
    body = text ? JSON.parse(text) : undefined;
  } catch {
    body = text;
  }

  return new RunApiClientError(extractMessage(body) || defaultMessage(response.status), response.status, body);
}

function extractMessage(body: unknown): string | undefined {
  if (typeof body === "string") {
    return body.trim() || undefined;
  }
  if (!body || typeof body !== "object") {
    return undefined;
  }

  const record = body as Record<string, unknown>;
  for (const key of ["message", "detail", "error", "msg"]) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
    const nested = extractMessage(value);
    if (nested) {
      return nested;
    }
  }

  return undefined;
}

function defaultMessage(status: number): string {
  switch (status) {
    case 400:
      return "RunAPI rejected the request parameters.";
    case 401:
      return "RunAPI API key is invalid or missing.";
    case 402:
      return "Insufficient RunAPI credits.";
    case 404:
      return "RunAPI resource was not found.";
    case 422:
      return "RunAPI could not validate the request.";
    case 429:
      return "RunAPI rate limit exceeded.";
    case 503:
      return "RunAPI service unavailable.";
    default:
      return `RunAPI request failed with HTTP ${status}.`;
  }
}
