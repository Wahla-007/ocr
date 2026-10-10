import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import os from "os";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const format = req.nextUrl.searchParams.get("format") || "json";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Save uploaded file to temp directory
    const tempDir = os.tmpdir();
    const tempFileName = `openocr_upload_${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const tempFilePath = path.join(tempDir, tempFileName);

    const buffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(tempFilePath, buffer);

    // Run extract_cli.py using repo virtual environment
    const rootDir = path.resolve(process.cwd(), "..", "..");
    const pythonExe = path.join(rootDir, ".venv", "Scripts", "python.exe");
    const cliScript = path.join(rootDir, "extract_cli.py");

    const result = await new Promise<{ stdout: string; stderr: string; code: number }>(
      (resolve) => {
        const proc = spawn(pythonExe, [cliScript, tempFilePath], {
          cwd: rootDir,
        });

        let stdout = "";
        let stderr = "";

        proc.stdout.on("data", (d) => {
          stdout += d.toString();
        });

        proc.stderr.on("data", (d) => {
          stderr += d.toString();
        });

        proc.on("close", (code) => {
          resolve({ stdout, stderr, code: code ?? 0 });
        });
      }
    );

    // Clean up temp file
    try {
      fs.unlinkSync(tempFilePath);
    } catch {}

    if (result.code !== 0) {
      return NextResponse.json(
        { error: "Extraction failed", details: result.stderr },
        { status: 500 }
      );
    }

    // Parse JSON output from extract_cli reliably using demarcation markers
    let jsonStr = "";
    const startTag = "===OPENOCR_JSON_START===";
    const endTag = "===OPENOCR_JSON_END===";
    const startIndex = result.stdout.indexOf(startTag);
    const endIndex = result.stdout.indexOf(endTag);

    if (startIndex !== -1 && endIndex !== -1) {
      jsonStr = result.stdout.slice(startIndex + startTag.length, endIndex).trim();
    } else {
      // Fallback: look for JSON object containing doc_type or outermost braces
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
        { error: "Invalid CLI output format", raw: result.stdout, stderr: result.stderr },
        { status: 500 }
      );
    }

    const payload = JSON.parse(jsonStr);

    if (format === "markdown") {
      return new NextResponse(payload.markdown || "", {
        headers: { "Content-Type": "text/markdown; charset=utf-8" },
      });
    }

    if (format === "text" || format === "plain_text") {
      return new NextResponse(payload.text || "", {
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }

    return NextResponse.json(payload);
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
