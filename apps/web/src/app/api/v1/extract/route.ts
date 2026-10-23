import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import os from "os";
import { validateApiKey, deductCredits, enforcePageLimits, DEFAULT_COST_PER_PAGE_USD } from "@/lib/keys";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const startTime = Date.now();

  // 1. API Key Authentication & Rate Limit Check
  const apiKeyHeader =
    req.headers.get("x-api-key") ||
    req.headers.get("X-API-Key") ||
    req.headers.get("authorization") ||
    req.headers.get("Authorization");

  const auth = validateApiKey(apiKeyHeader);
  if (!auth.valid) {
    const status = auth.statusCode || 401;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "X-OpenOCR-Cost-USD": "0.000",
      "X-OpenOCR-Plan": auth.record?.plan || "none",
      "X-OpenOCR-Items-Used": String(auth.record?.itemsProcessed || 0),
      "X-OpenOCR-Items-Max": String(auth.record?.maxItems || 0),
    };
    if (status === 429 && auth.rateLimitResetSeconds) {
      headers["Retry-After"] = String(auth.rateLimitResetSeconds);
      headers["X-RateLimit-Reset"] = String(auth.rateLimitResetSeconds);
      headers["X-RateLimit-Limit"] = String(auth.record?.rateLimitPerMinute || 10);
      headers["X-RateLimit-Remaining"] = "0";
    }
    return NextResponse.json(
      {
        error: {
          code: auth.errorCode || (status === 429 ? "RATE_LIMIT_EXCEEDED" : status === 402 ? "FREE_TIER_LIMIT_REACHED" : "UNAUTHORIZED"),
          message: auth.error,
          plan: auth.record?.plan || "none",
          items_processed: auth.record?.itemsProcessed || 0,
          max_items_allowed: auth.record?.maxItems || 0,
          upgrade_url: "/pricing",
          pricing_info: {
            cost_per_page: `$${DEFAULT_COST_PER_PAGE_USD} USD`,
            pro_plan_monthly: "$9.00 USD/mo (unlimited items, 500 pages/doc, 300 req/min)",
          },
        },
      },
      {
        status,
        headers,
      }
    );
  }

  try {
    const contentType = req.headers.get("content-type") || "";
    let tempFilePath = "";
    let originalFileName = "document.jpg";
    let fileBuffer: Buffer | null = null;
    let format = req.nextUrl.searchParams.get("format") || "json";

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      if (!file) {
        return NextResponse.json({ error: "No file provided in 'file' field" }, { status: 400 });
      }
      originalFileName = file.name;
      fileBuffer = Buffer.from(await file.arrayBuffer());
    } else if (contentType.includes("application/json")) {
      const body = await req.json();
      if (body.format) format = body.format;

      if (body.image_base64) {
        const cleanBase64 = body.image_base64.replace(/^data:[^;]+;base64,/, "");
        fileBuffer = Buffer.from(cleanBase64, "base64");
        originalFileName = body.filename || "document.jpg";
      } else if (body.url) {
        const fetchRes = await fetch(body.url);
        if (!fetchRes.ok) {
          return NextResponse.json({ error: `Failed to download file from URL: HTTP ${fetchRes.status}` }, { status: 400 });
        }
        fileBuffer = Buffer.from(await fetchRes.arrayBuffer());
        originalFileName = path.basename(new URL(body.url).pathname) || "document.jpg";
      } else {
        return NextResponse.json({ error: "JSON body must provide 'image_base64' or 'url'" }, { status: 400 });
      }
    } else {
      return NextResponse.json(
        { error: "Unsupported Content-Type. Use 'multipart/form-data' or 'application/json'" },
        { status: 400 }
      );
    }

    // Save temporary file for inference
    const tempDir = os.tmpdir();
    const tempFileName = `openocr_api_${Date.now()}_${originalFileName.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    tempFilePath = path.join(tempDir, tempFileName);
    fs.writeFileSync(tempFilePath, fileBuffer);

    // Resolve python environment and CLI script
    let rootDir = process.cwd();
    const candidates = [
      rootDir,
      path.resolve(rootDir, ".."),
      path.resolve(rootDir, "..", ".."),
      "D:\\openocr",
    ];
    let resolvedRoot = rootDir;
    for (const c of candidates) {
      if (fs.existsSync(path.join(c, "extract_cli.py"))) {
        resolvedRoot = c;
        break;
      }
    }

    let pythonExe = path.join(resolvedRoot, ".venv", "Scripts", "python.exe");
    if (!fs.existsSync(pythonExe)) {
      pythonExe = path.join(resolvedRoot, ".venv", "bin", "python");
    }
    if (!fs.existsSync(pythonExe)) {
      pythonExe = "python";
    }
    const cliScript = path.join(resolvedRoot, "extract_cli.py");
    const maxPages = auth.record?.maxPagesPerItem || 2;

    const result = await new Promise<{ stdout: string; stderr: string; code: number }>((resolve) => {
      let stdout = "";
      let stderr = "";
      try {
        const proc = spawn(pythonExe, [cliScript, tempFilePath, "--max-pages", String(maxPages)], {
          cwd: resolvedRoot,
        });

        proc.stdout.on("data", (d) => {
          stdout += d.toString();
        });

        proc.stderr.on("data", (d) => {
          stderr += d.toString();
        });

        proc.on("error", (err) => {
          resolve({ stdout, stderr: err.message, code: 1 });
        });

        proc.on("close", (code) => {
          resolve({ stdout, stderr, code: code ?? 0 });
        });
      } catch (err: any) {
        resolve({ stdout: "", stderr: err?.message || "Spawn failed", code: 1 });
      }
    });

    // Cleanup temp file
    try {
      if (tempFilePath && fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }
    } catch {}

    if (result.code !== 0) {
      return NextResponse.json(
        { error: "Document extraction failed", details: result.stderr },
        { status: 500 }
      );
    }

    // Extract demarcated JSON payload
    let jsonStr = "";
    const startTag = "===OPENOCR_JSON_START===";
    const endTag = "===OPENOCR_JSON_END===";
    const startIndex = result.stdout.indexOf(startTag);
    const endIndex = result.stdout.indexOf(endTag);

    if (startIndex !== -1 && endIndex !== -1) {
      jsonStr = result.stdout.slice(startIndex + startTag.length, endIndex).trim();
    } else {
      const docTypeStart = result.stdout.indexOf('"doc_type"');
      if (docTypeStart !== -1) {
        const braceBefore = result.stdout.lastIndexOf("{", docTypeStart);
        const braceAfter = result.stdout.lastIndexOf("}");
        if (braceBefore !== -1 && braceAfter !== -1) {
          jsonStr = result.stdout.slice(braceBefore, braceAfter + 1).trim();
        }
      }
    }

    if (!jsonStr) {
      return NextResponse.json(
        { error: "Invalid CLI JSON output", raw: result.stdout, stderr: result.stderr },
        { status: 500 }
      );
    }

    const payload = JSON.parse(jsonStr);

    // Check if CLI returned page limit error
    if (payload.error === "TOO_MANY_PAGES") {
      return NextResponse.json(
        {
          error: {
            code: "FREE_TIER_PAGE_LIMIT",
            message: payload.message || `Free plan is limited to ${auth.record!.maxPagesPerItem} pages max per document (document has ${payload.pages} pages). Please upgrade to the Pro plan ($9/mo) to process multi-page documents.`,
            pages_found: payload.pages,
            max_pages_allowed: auth.record!.maxPagesPerItem,
            plan: auth.record!.plan,
            upgrade_url: "/pricing",
          },
        },
        {
          status: 402,
          headers: {
            "Content-Type": "application/json",
            "X-OpenOCR-Plan": auth.record!.plan,
            "X-OpenOCR-Cost-USD": "0.000",
            "X-OpenOCR-Items-Used": String(auth.record!.itemsProcessed),
            "X-OpenOCR-Items-Max": String(auth.record!.maxItems),
          },
        }
      );
    }

    const pagesCount = payload.pages || payload.page_count || 1;

    // Strict page limit enforcement
    const pageCheck = enforcePageLimits(auth.record!, pagesCount);
    if (!pageCheck.allowed) {
      return NextResponse.json(
        {
          error: {
            code: pageCheck.errorCode || "FREE_TIER_PAGE_LIMIT",
            message: pageCheck.error,
            pages_found: pagesCount,
            max_pages_allowed: auth.record!.maxPagesPerItem,
            plan: auth.record!.plan,
            upgrade_url: "/pricing",
          },
        },
        {
          status: 402,
          headers: {
            "Content-Type": "application/json",
            "X-OpenOCR-Plan": auth.record!.plan,
            "X-OpenOCR-Cost-USD": "0.000",
            "X-OpenOCR-Items-Used": String(auth.record!.itemsProcessed),
            "X-OpenOCR-Items-Max": String(auth.record!.maxItems),
          },
        }
      );
    }

    // 2. Deduct Credits & Record Cost
    const debit = deductCredits(auth.record!.key, pagesCount);
    const latencyMs = Date.now() - startTime;

    // Standard commercial response headers
    const responseHeaders: Record<string, string> = {
      "X-OpenOCR-Plan": auth.record!.plan,
      "X-OpenOCR-Items-Used": String(debit.itemsProcessed),
      "X-OpenOCR-Items-Max": String(debit.maxItems === Number.POSITIVE_INFINITY ? "unlimited" : debit.maxItems),
      "X-OpenOCR-Credits-Used": String(debit.charged),
      "X-OpenOCR-Credits-Remaining": String(debit.remaining),
      "X-OpenOCR-Cost-USD": debit.costUsd.toFixed(4),
      "X-OpenOCR-Latency-Ms": String(latencyMs),
      "X-RateLimit-Limit": String(auth.record?.rateLimitPerMinute || 120),
      "X-RateLimit-Remaining": String(Math.max(0, (auth.record?.rateLimitPerMinute || 120) - (auth.record?.requestsThisMinute || 1))),
      "X-RateLimit-Reset": String(auth.rateLimitResetSeconds || 60),
    };

    // Inject usage and plan info into payload
    payload.billing = {
      plan: auth.record!.plan,
      items_processed: debit.itemsProcessed,
      max_items: debit.maxItems === Number.POSITIVE_INFINITY ? "unlimited" : debit.maxItems,
      pages_billed: debit.charged,
      cost_usd: debit.costUsd,
      credits_remaining: debit.remaining,
      rate: `$${auth.record?.costPerCreditUsd || DEFAULT_COST_PER_PAGE_USD} / page`,
    };

    if (format === "markdown") {
      return new NextResponse(payload.markdown || "", {
        headers: {
          ...responseHeaders,
          "Content-Type": "text/markdown; charset=utf-8",
        },
      });
    }

    if (format === "text" || format === "plain_text") {
      return new NextResponse(payload.text || "", {
        headers: {
          ...responseHeaders,
          "Content-Type": "text/plain; charset=utf-8",
        },
      });
    }

    return NextResponse.json(payload, { headers: responseHeaders });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
