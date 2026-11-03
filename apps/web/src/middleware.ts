import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  // 1. Generate cryptographic per-request nonce (CSPRNG)
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");

  // Next.js standalone SSR & static chunks require unsafe-inline & unsafe-eval for client hydration
  const scriptSrc = `'self' 'unsafe-eval' 'unsafe-inline' https://cdn.jsdelivr.net`;

  const connectSrc = `'self' ws: wss: http: https: data: blob: https://sandbox.api.getsafepay.com https://api.getsafepay.com https://cdn.jsdelivr.net`;

  // 2. Strict Content Security Policy (Level 2/3)
  const cspHeader = [
    `default-src 'self'`,
    `script-src ${scriptSrc}`,
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' data: blob:`,
    `font-src 'self' data:`,
    `connect-src ${connectSrc}`,
    `frame-ancestors 'none'`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self' https://sandbox.api.getsafepay.com https://getsafepay.com`,
  ].join("; ");

  // 3. Clone request headers and inject nonce for layout consumption
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", cspHeader);

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  // 4. Set security response headers
  response.headers.set("Content-Security-Policy", cspHeader);
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=()"
  );

  // 5. Prevent caching on authenticated or sensitive ledger routes
  const path = request.nextUrl.pathname;
  if (
    path.startsWith("/registry") ||
    path.startsWith("/billing") ||
    path.startsWith("/auth")
  ) {
    response.headers.set(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0"
    );
    response.headers.set("Pragma", "no-cache");
    response.headers.set("Expires", "0");
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt
     */
    {
      source:
        "/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
