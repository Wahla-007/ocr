/**
 * OpenOCR Typed API Client Module
 *
 * Enforces OWASP ASVS L2 / NIST SP 800-63B standards:
 * - Same-origin calls to /v1/*
 * - Credentials handling (HttpOnly __Host-openocr_session)
 * - Custom header (X-Requested-With: OpenOCR-Web) for CSRF defense
 * - Automatic X-Request-ID propagation
 * - Consistent typed error shape: { code, message, request_id, status }
 * - Abort and timeout support (default 30s)
 * - 429 rate-limit handling with Retry-After extraction
 * - 401 handling with open-redirect safe internal next validation
 */

export interface ApiErrorPayload {
  code: string;
  message: string;
  request_id?: string;
  detail?: any;
}

export class ApiError extends Error {
  public code: string;
  public status: number;
  public requestId?: string;
  public retryAfter?: number;

  constructor(status: number, payload: ApiErrorPayload, retryAfter?: number) {
    super(payload.message || `API Request failed with status ${status}`);
    this.name = "ApiError";
    this.status = status;
    this.code = payload.code || "REQUEST_FAILED";
    this.requestId = payload.request_id;
    this.retryAfter = retryAfter;
  }
}

export interface RequestOptions extends RequestInit {
  timeoutMs?: number;
  skipAuthRedirect?: boolean;
}

/**
 * Validates internal redirect paths to prevent open redirect vulnerabilities.
 * Only allows relative paths starting with single '/' and no protocol/host.
 */
export function validateInternalRedirect(raw: string | null | undefined, fallback: string = "/"): string {
  if (!raw) return fallback;
  const trimmed = raw.trim();
  // Must start with exactly one '/' and not contain backslashes or protocol specifiers
  if (
    !trimmed.startsWith("/") ||
    trimmed.startsWith("//") ||
    trimmed.startsWith("/\\") ||
    trimmed.includes("://")
  ) {
    return fallback;
  }
  // Disallow non-printable or control characters
  for (let i = 0; i < trimmed.length; i++) {
    const code = trimmed.charCodeAt(i);
    if (code < 32 || code === 127) return fallback;
  }
  return trimmed;
}

/**
 * Reads a cookie value by name in browser context.
 */
function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp("(^|;\\s*)(" + name + ")=([^;]*)"));
  return match ? decodeURIComponent(match[3]) : null;
}

/**
 * Generates an RFC4122 v4 UUID for request tracing.
 */
function generateRequestId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return "req_" + Math.random().toString(36).substring(2, 15);
}

/**
 * Core typed fetch wrapper.
 */
export async function apiClient<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { timeoutMs = 30000, skipAuthRedirect = false, ...fetchOptions } = options;

  // Always route via same-origin /v1/* (Next.js rewrites proxy to backend)
  const normalizedEndpoint = endpoint.startsWith("/v1")
    ? endpoint
    : endpoint.startsWith("/")
    ? `/v1${endpoint}`
    : `/v1/${endpoint}`;

  const requestId = generateRequestId();
  const headers = new Headers(fetchOptions.headers || {});

  // OWASP Defense Headers
  headers.set("X-Requested-With", "OpenOCR-Web");
  headers.set("X-Request-ID", requestId);

  // If body is JSON and Content-Type is not set, set application/json
  if (
    fetchOptions.body &&
    !(fetchOptions.body instanceof FormData) &&
    !headers.has("Content-Type")
  ) {
    headers.set("Content-Type", "application/json");
  }

  // Attach CSRF cookie if present (double-submit defense)
  const csrfCookie = getCookie("openocr_csrf");
  if (csrfCookie) {
    headers.set("X-CSRF-Token", csrfCookie);
  }

  // Setup abort controller for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(normalizedEndpoint, {
      ...fetchOptions,
      credentials: "include", // Enforces HttpOnly cookies across same-origin
      headers,
      signal: fetchOptions.signal || controller.signal,
    });

    clearTimeout(timeoutId);

    // Extract Retry-After on 429
    let retryAfterSeconds: number | undefined;
    if (response.status === 429) {
      const retryHeader = response.headers.get("Retry-After");
      if (retryHeader) {
        const parsed = parseInt(retryHeader, 10);
        if (!isNaN(parsed)) retryAfterSeconds = parsed;
      }
    }

    // Parse JSON response body if present
    const contentType = response.headers.get("content-type");
    const isJson = contentType && contentType.includes("application/json");
    const data = isJson ? await response.json() : null;

    if (!response.ok) {
      const respRequestId = response.headers.get("X-Request-ID") || requestId;
      const errorPayload: ApiErrorPayload = data?.error || {
        code: `HTTP_${response.status}`,
        message: data?.detail || data?.message || response.statusText || "Request failed",
        request_id: respRequestId,
      };

      // 401 Unauthorized handling: route to login if in browser and not suppressed
      if (response.status === 401 && !skipAuthRedirect && typeof window !== "undefined") {
        const currentPath = window.location.pathname + window.location.search;
        if (!currentPath.startsWith("/login") && !currentPath.startsWith("/signup")) {
          const safeNext = encodeURIComponent(validateInternalRedirect(currentPath));
          window.location.href = `/login?next=${safeNext}`;
        }
      }

      throw new ApiError(response.status, errorPayload, retryAfterSeconds);
    }

    return data as T;
  } catch (err: any) {
    clearTimeout(timeoutId);

    if (err instanceof ApiError) {
      throw err;
    }

    if (err.name === "AbortError") {
      throw new ApiError(408, {
        code: "TIMEOUT",
        message: `Request timed out after ${timeoutMs}ms. Please try again.`,
        request_id: requestId,
      });
    }

    throw new ApiError(500, {
      code: "NETWORK_ERROR",
      message: err.message || "Network request failed. Please check your connection.",
      request_id: requestId,
    });
  }
}
