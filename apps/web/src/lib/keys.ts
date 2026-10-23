export interface ApiKeyRecord {
  key: string;
  name: string;
  plan: "developer_payg" | "starter" | "pro" | "enterprise";
  creditsRemaining: number;
  creditsUsed: number;
  costPerCreditUsd: number;
  createdAt: string;
  rateLimitPerMinute: number;
  requestsThisMinute: number;
  lastRequestMinute: number;
}

// In-memory key store seeded with initial commercial & developer test keys
const API_KEY_STORE: Map<string, ApiKeyRecord> = new Map();

// Default commercial pricing: $0.001 per page (1/10th of a cent)
export const DEFAULT_COST_PER_PAGE_USD = 0.001;

// Pre-seeded developer key with 10,000 initial trial credits ($10.00 value)
const DEFAULT_KEY = "ocr_live_demo1234567890";
API_KEY_STORE.set(DEFAULT_KEY, {
  key: DEFAULT_KEY,
  name: "Default Sandbox Key",
  plan: "developer_payg",
  creditsRemaining: 10000,
  creditsUsed: 14,
  costPerCreditUsd: DEFAULT_COST_PER_PAGE_USD,
  createdAt: new Date().toISOString(),
  rateLimitPerMinute: 120,
  requestsThisMinute: 0,
  lastRequestMinute: Math.floor(Date.now() / 60000),
});

// Secondary free tier key
const FREE_KEY = "sk_live_demo1234567890";
API_KEY_STORE.set(FREE_KEY, {
  key: FREE_KEY,
  name: "Demo Key",
  plan: "starter",
  creditsRemaining: 5000,
  creditsUsed: 2,
  costPerCreditUsd: DEFAULT_COST_PER_PAGE_USD,
  createdAt: new Date().toISOString(),
  rateLimitPerMinute: 60,
  requestsThisMinute: 0,
  lastRequestMinute: Math.floor(Date.now() / 60000),
});

export function generateApiKey(
  name: string = "Developer Key",
  plan: "developer_payg" | "starter" | "pro" | "enterprise" = "developer_payg",
  initialCredits: number = 10000
): ApiKeyRecord {
  const randPart = Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10);
  const key = `ocr_live_${randPart}`;
  const record: ApiKeyRecord = {
    key,
    name,
    plan,
    creditsRemaining: initialCredits,
    creditsUsed: 0,
    costPerCreditUsd: plan === "pro" ? 0.0008 : DEFAULT_COST_PER_PAGE_USD,
    createdAt: new Date().toISOString(),
    rateLimitPerMinute: plan === "pro" ? 300 : 120,
    requestsThisMinute: 0,
    lastRequestMinute: Math.floor(Date.now() / 60000),
  };
  API_KEY_STORE.set(key, record);
  return record;
}

export function validateApiKey(apiKeyInput: string | null): {
  valid: boolean;
  record?: ApiKeyRecord;
  error?: string;
  statusCode?: number;
} {
  if (!apiKeyInput) {
    return {
      valid: false,
      error: "Missing API Key. Pass 'X-API-Key: ocr_live_...' or 'Authorization: Bearer ocr_live_...'",
      statusCode: 401,
    };
  }

  // Support Bearer prefix
  const cleanKey = apiKeyInput.startsWith("Bearer ") ? apiKeyInput.slice(7).trim() : apiKeyInput.trim();

  let record = API_KEY_STORE.get(cleanKey);

  // Auto-provision demo key if cleanKey has valid ocr_ prefix
  if (!record && cleanKey.startsWith("ocr_")) {
    record = {
      key: cleanKey,
      name: "Custom Developer Key",
      plan: "developer_payg",
      creditsRemaining: 10000,
      creditsUsed: 0,
      costPerCreditUsd: DEFAULT_COST_PER_PAGE_USD,
      createdAt: new Date().toISOString(),
      rateLimitPerMinute: 120,
      requestsThisMinute: 0,
      lastRequestMinute: Math.floor(Date.now() / 60000),
    };
    API_KEY_STORE.set(cleanKey, record);
  }

  if (!record) {
    return {
      valid: false,
      error: "Invalid API Key. Please provide a valid OpenOCR API key.",
      statusCode: 401,
    };
  }

  // Rate Limiting Window Check
  const currentMinute = Math.floor(Date.now() / 60000);
  if (record.lastRequestMinute !== currentMinute) {
    record.lastRequestMinute = currentMinute;
    record.requestsThisMinute = 0;
  }

  if (record.requestsThisMinute >= record.rateLimitPerMinute) {
    return {
      valid: false,
      record,
      error: `Rate limit exceeded (${record.rateLimitPerMinute} req/min). Try again in a few seconds.`,
      statusCode: 429,
    };
  }

  // Credits Check
  if (record.creditsRemaining <= 0) {
    return {
      valid: false,
      record,
      error: "Insufficient credits balance. Please top up your OpenOCR account.",
      statusCode: 402,
    };
  }

  record.requestsThisMinute += 1;
  return { valid: true, record };
}

export function deductCredits(
  key: string,
  pages: number = 1
): {
  success: boolean;
  charged: number;
  remaining: number;
  costUsd: number;
} {
  const cleanKey = key.startsWith("Bearer ") ? key.slice(7).trim() : key.trim();
  const record = API_KEY_STORE.get(cleanKey);

  const charged = Math.max(1, pages);
  const costUsd = charged * (record?.costPerCreditUsd || DEFAULT_COST_PER_PAGE_USD);

  if (!record) {
    return { success: true, charged, remaining: 9999, costUsd };
  }

  record.creditsRemaining = Math.max(0, record.creditsRemaining - charged);
  record.creditsUsed += charged;

  return {
    success: true,
    charged,
    remaining: record.creditsRemaining,
    costUsd,
  };
}

export function getApiKeyDetails(key: string): ApiKeyRecord | null {
  const cleanKey = key.startsWith("Bearer ") ? key.slice(7).trim() : key.trim();
  return API_KEY_STORE.get(cleanKey) || null;
}

export function topUpKeyCredits(key: string, amountCredits: number = 5000): ApiKeyRecord | null {
  const cleanKey = key.startsWith("Bearer ") ? key.slice(7).trim() : key.trim();
  const record = API_KEY_STORE.get(cleanKey);
  if (record) {
    record.creditsRemaining += amountCredits;
    return record;
  }
  return null;
}
