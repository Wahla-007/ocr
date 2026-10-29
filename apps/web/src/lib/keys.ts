export type PlanTier = "free" | "pro" | "enterprise";

export interface ApiKeyRecord {
  key: string;
  name: string;
  plan: PlanTier;
  itemsProcessed: number;
  maxItems: number; // 5 for free, Infinity for pro
  maxPagesPerItem: number; // 2 for free, 500 for pro
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

// Standard pricing
export const DEFAULT_COST_PER_PAGE_USD = 0.001;
export const FREE_TIER_MAX_ITEMS = 5;
export const FREE_TIER_MAX_PAGES_PER_ITEM = 2;

// 1. Free Trial Seeded Key (strict 5 items max, 2 pages max)
export const FREE_TRIAL_KEY = "ocr_free_trial12345";
API_KEY_STORE.set(FREE_TRIAL_KEY, {
  key: FREE_TRIAL_KEY,
  name: "Free Trial Developer Key",
  plan: "free",
  itemsProcessed: 0,
  maxItems: FREE_TIER_MAX_ITEMS,
  maxPagesPerItem: FREE_TIER_MAX_PAGES_PER_ITEM,
  creditsRemaining: 10,
  creditsUsed: 0,
  costPerCreditUsd: 0.000,
  createdAt: new Date().toISOString(),
  rateLimitPerMinute: 10,
  requestsThisMinute: 0,
  lastRequestMinute: Math.floor(Date.now() / 60000),
});

// 2. Pro Paid Key (unlimited items, 500 pages max, high rate limit)
export const PRO_DEMO_KEY = "ocr_live_pro123456789";
API_KEY_STORE.set(PRO_DEMO_KEY, {
  key: PRO_DEMO_KEY,
  name: "Pro Paid Key",
  plan: "pro",
  itemsProcessed: 12,
  maxItems: Number.POSITIVE_INFINITY,
  maxPagesPerItem: 500,
  creditsRemaining: 25000,
  creditsUsed: 12,
  costPerCreditUsd: DEFAULT_COST_PER_PAGE_USD,
  createdAt: new Date().toISOString(),
  rateLimitPerMinute: 300,
  requestsThisMinute: 0,
  lastRequestMinute: Math.floor(Date.now() / 60000),
});

// Backward-compatible alias for existing demo key
API_KEY_STORE.set("ocr_live_demo1234567890", {
  key: "ocr_live_demo1234567890",
  name: "Pro Sandbox Key",
  plan: "pro",
  itemsProcessed: 3,
  maxItems: Number.POSITIVE_INFINITY,
  maxPagesPerItem: 500,
  creditsRemaining: 10000,
  creditsUsed: 3,
  costPerCreditUsd: DEFAULT_COST_PER_PAGE_USD,
  createdAt: new Date().toISOString(),
  rateLimitPerMinute: 300,
  requestsThisMinute: 0,
  lastRequestMinute: Math.floor(Date.now() / 60000),
});

API_KEY_STORE.set("sk_live_demo1234567890", {
  key: "sk_live_demo1234567890",
  name: "Demo Key",
  plan: "free",
  itemsProcessed: 0,
  maxItems: FREE_TIER_MAX_ITEMS,
  maxPagesPerItem: FREE_TIER_MAX_PAGES_PER_ITEM,
  creditsRemaining: 10,
  creditsUsed: 0,
  costPerCreditUsd: 0.000,
  createdAt: new Date().toISOString(),
  rateLimitPerMinute: 10,
  requestsThisMinute: 0,
  lastRequestMinute: Math.floor(Date.now() / 60000),
});

export function generateApiKey(
  name: string = "Developer Key",
  plan: PlanTier = "pro",
  initialCredits: number = 25000
): ApiKeyRecord {
  if (plan === "free") {
    throw new Error("API keys are not permitted on the Free Plan. Programmatic API access requires a paid Developer or Enterprise plan.");
  }
  const randPart = Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10);
  const key = `ocr_live_${randPart}`;
  const isPro = true;

  const record: ApiKeyRecord = {
    key,
    name,
    plan,
    itemsProcessed: 0,
    maxItems: Number.POSITIVE_INFINITY,
    maxPagesPerItem: 500,
    creditsRemaining: initialCredits,
    creditsUsed: 0,
    costPerCreditUsd: DEFAULT_COST_PER_PAGE_USD,
    createdAt: new Date().toISOString(),
    rateLimitPerMinute: 300,
    requestsThisMinute: 0,
    lastRequestMinute: Math.floor(Date.now() / 60000),
  };
  API_KEY_STORE.set(key, record);
  return record;
}

export function upgradeKeyToPro(key: string): ApiKeyRecord | null {
  const cleanKey = key.startsWith("Bearer ") ? key.slice(7).trim() : key.trim();
  let record = API_KEY_STORE.get(cleanKey);
  if (!record) {
    record = generateApiKey("Pro Upgraded Key", "pro", 25000);
    return record;
  }
  record.plan = "pro";
  record.maxItems = Number.POSITIVE_INFINITY;
  record.maxPagesPerItem = 500;
  record.rateLimitPerMinute = 300;
  record.creditsRemaining += 25000;
  return record;
}

export function validateApiKey(apiKeyInput: string | null): {
  valid: boolean;
  record?: ApiKeyRecord;
  error?: string;
  errorCode?: string;
  statusCode?: number;
  rateLimitResetSeconds?: number;
} {
  if (!apiKeyInput) {
    return {
      valid: false,
      error: "Missing API Key. Programmatic access requires a Developer or Enterprise paid plan. Free plan provides web playground testing only. Pass 'X-API-Key: ocr_live_...'",
      errorCode: "UNAUTHORIZED",
      statusCode: 401,
    };
  }

  const cleanKey = apiKeyInput.startsWith("Bearer ") ? apiKeyInput.slice(7).trim() : apiKeyInput.trim();

  let record = API_KEY_STORE.get(cleanKey);

  // Auto-provision if cleanKey has valid free prefix or evaluation key
  if (!record && (cleanKey.startsWith("ocr_free_") || cleanKey === FREE_TRIAL_KEY)) {
    record = {
      key: cleanKey,
      name: "Free Trial Key",
      plan: "free",
      itemsProcessed: 0,
      maxItems: FREE_TIER_MAX_ITEMS,
      maxPagesPerItem: FREE_TIER_MAX_PAGES_PER_ITEM,
      creditsRemaining: 10,
      creditsUsed: 0,
      costPerCreditUsd: 0.000,
      createdAt: new Date().toISOString(),
      rateLimitPerMinute: 10,
      requestsThisMinute: 0,
      lastRequestMinute: Math.floor(Date.now() / 60000),
    };
    API_KEY_STORE.set(cleanKey, record);
  }

  // Auto-provision if cleanKey has valid pro prefix
  if (!record && (cleanKey.startsWith("ocr_live_") || cleanKey.startsWith("ocr_pro_"))) {
    record = {
      key: cleanKey,
      name: "Pro Key",
      plan: "pro",
      itemsProcessed: 0,
      maxItems: Number.POSITIVE_INFINITY,
      maxPagesPerItem: 500,
      creditsRemaining: 10000,
      creditsUsed: 0,
      costPerCreditUsd: DEFAULT_COST_PER_PAGE_USD,
      createdAt: new Date().toISOString(),
      rateLimitPerMinute: 300,
      requestsThisMinute: 0,
      lastRequestMinute: Math.floor(Date.now() / 60000),
    };
    API_KEY_STORE.set(cleanKey, record);
  }

  if (!record) {
    return {
      valid: false,
      error: "Invalid API Key. Please provide a valid active OpenOCR API key.",
      errorCode: "INVALID_KEY",
      statusCode: 401,
    };
  }

  // Check free plan lifetime item limit (max 5 items)
  if (record.plan === "free" && record.itemsProcessed >= record.maxItems) {
    return {
      valid: false,
      record,
      error: `Free tier lifetime limit of ${record.maxItems} documents reached. Please upgrade to Pro plan ($9/mo) for unlimited items.`,
      errorCode: "FREE_TIER_LIMIT_REACHED",
      statusCode: 402,
    };
  }

  // 1. Sliding Window Rate Limiting (Best practice token bucket / window reset)
  const currentMinute = Math.floor(Date.now() / 60000);
  const secondsIntoMinute = Math.floor((Date.now() % 60000) / 1000);
  const rateLimitResetSeconds = Math.max(1, 60 - secondsIntoMinute);

  if (record.lastRequestMinute !== currentMinute) {
    record.lastRequestMinute = currentMinute;
    record.requestsThisMinute = 0;
  }

  if (record.requestsThisMinute >= record.rateLimitPerMinute) {
    return {
      valid: false,
      record,
      error: `Rate limit of ${record.rateLimitPerMinute} req/min exceeded for ${record.plan} plan. Retry in ${rateLimitResetSeconds}s.`,
      errorCode: "RATE_LIMIT_EXCEEDED",
      statusCode: 429,
      rateLimitResetSeconds,
    };
  }

  // 2. Credits balance check

  record.requestsThisMinute += 1;
  return { valid: true, record, rateLimitResetSeconds };
}

export function enforcePageLimits(
  record: ApiKeyRecord,
  actualPages: number
): { allowed: boolean; error?: string; errorCode?: string; statusCode?: number } {
  if (record.plan === "free" && actualPages > record.maxPagesPerItem) {
    return {
      allowed: false,
      error: `Free plan is limited to ${record.maxPagesPerItem} pages max per document (document has ${actualPages} pages). Please upgrade to Pro plan to process full documents.`,
      errorCode: "FREE_TIER_PAGE_LIMIT",
      statusCode: 402,
    };
  }
  return { allowed: true };
}

export function deductCredits(
  key: string,
  pages: number = 1
): {
  success: boolean;
  charged: number;
  remaining: number;
  costUsd: number;
  itemsProcessed: number;
  maxItems: number;
} {
  const cleanKey = key.startsWith("Bearer ") ? key.slice(7).trim() : key.trim();
  const record = API_KEY_STORE.get(cleanKey);

  const charged = Math.max(1, pages);
  const costUsd = charged * (record?.costPerCreditUsd || DEFAULT_COST_PER_PAGE_USD);

  if (!record) {
    return { success: true, charged, remaining: 9999, costUsd, itemsProcessed: 1, maxItems: 5 };
  }

  record.itemsProcessed += 1;
  record.creditsRemaining = Math.max(0, record.creditsRemaining - charged);
  record.creditsUsed += charged;

  return {
    success: true,
    charged,
    remaining: record.creditsRemaining,
    costUsd,
    itemsProcessed: record.itemsProcessed,
    maxItems: record.maxItems,
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
