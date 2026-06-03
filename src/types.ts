export type ContractField = {
  required?: boolean;
  enum?: unknown[];
  default?: unknown;
  min?: number;
  max?: number;
  minimum?: number;
  maximum?: number;
  type?: string;
  description?: string;
};

export type ContractAction = {
  provider: string;
  model: string;
  endpoint: string;
  models: string[];
  fields_by_model: Record<string, Record<string, ContractField>>;
};

export type Contract = {
  generated_by: string;
  catalog_models: string[];
  actions: Record<string, ContractAction>;
  unresolved_actions: string[];
};

export type PricingConfig = {
  markup_rate?: number;
  provider_markup?: Record<string, number>;
  endpoint_markup?: Record<string, number>;
  endpoints?: Record<string, PricingEndpoint>;
};

export type PricingEndpoint = {
  cost_unit_price_cents?: number;
  cost_input_price_per_1m_cents?: number;
  cost_output_price_per_1m_cents?: number;
  cost_cache_read_price_per_1m_cents?: number;
  cost_cache_write_5m_price_per_1m_cents?: number;
  cost_cache_write_1h_price_per_1m_cents?: number;
  cost_billing_config?: {
    key?: string;
    overrides?: Record<string, number>;
  };
};

export type ModelInfo = {
  service: string;
  action: string;
  route_action: string;
  provider: string;
  model_line: string;
  model: string;
  fields: Record<string, ContractField>;
};

export type RunApiTaskResponse = {
  id?: string;
  task_id?: string;
  status?: string;
  state?: string;
  data?: unknown;
  result?: unknown;
  output?: unknown;
  outputs?: unknown;
  url?: string;
  urls?: string[];
  cost_cents?: number;
  amount_cents?: number;
  [key: string]: unknown;
};

export type SearchPromptsParams = {
  modality?: string;
  category?: string;
  tags?: string[];
  q?: string;
  model?: string;
  featured?: boolean;
  page?: number;
  per_page?: number;
};

export type RunApiPrompt = {
  id: number;
  title?: string | null;
  prompt: string;
  modality: string;
  service?: string | null;
  action?: string | null;
  runapi_model?: string | null;
  source_model?: string | null;
  source?: string | null;
  source_url?: string | null;
  category?: string | null;
  tags?: string[];
  difficulty?: string | null;
  engagement?: unknown;
  params?: unknown;
  preview_url?: string | null;
  featured?: boolean;
};

export type RunApiPromptsResponse = {
  prompts: RunApiPrompt[];
  pagination: {
    page: number;
    per_page: number;
    total: number;
    pages: number;
  };
};

export type PollingOptions = {
  timeoutMs?: number;
  intervalMs?: number;
  onProgress?: (task: RunApiTaskResponse) => Promise<void> | void;
};
