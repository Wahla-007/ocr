"use client";

import React, { useState } from "react";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/Dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/Tabs";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/Table";
import { Progress } from "@/components/ui/Progress";
import { CodeBlock } from "@/components/ui/CodeBlock";
import { Sun, Moon, ArrowRight, Check, ShieldCheck, AlertTriangle, Layers } from "lucide-react";

export default function StyleguidePage() {
  // If production, disable styleguide
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  const [dir, setDir] = useState<"ltr" | "rtl">("ltr");
  const [theme, setTheme] = useState<"light" | "dark">("light");

  const toggleTheme = () => {
    const nextTheme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
    if (nextTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  const toggleDir = () => {
    setDir(dir === "ltr" ? "rtl" : "ltr");
  };

  return (
    <div
      dir={dir}
      className="min-h-screen bg-[var(--surface-base)] text-[var(--ink-primary)] p-6 sm:p-12 transition-colors font-sans"
    >
      <div className="max-w-6xl mx-auto space-y-12">
        {/* Header & Controls */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[var(--line-strong)] pb-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-[var(--signal)] font-bold tracking-wider uppercase">
                OpenOCR Design System
              </span>
              <Badge variant="outline">DOC-DEV-001</Badge>
            </div>
            <h1 className="text-3xl font-serif font-bold text-[var(--ink-primary)] mt-1">
              The Archivist&apos;s Light Table: Component Styleguide
            </h1>
            <p className="text-sm text-[var(--ink-secondary)] mt-1">
              Living design system inventory across all states, themes, and reading directions.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={toggleDir}
              leftIcon={<span className="font-mono font-bold text-xs">{dir.toUpperCase()}</span>}
            >
              Toggle Direction ({dir === "ltr" ? "LTR" : "RTL"})
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={toggleTheme}
              leftIcon={theme === "light" ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
            >
              Theme: {theme === "light" ? "Paper Light" : "Ink Dark"}
            </Button>
          </div>
        </div>

        {/* 1. Color Palette Tokens */}
        <section className="space-y-4">
          <h2 className="text-base font-mono font-bold uppercase tracking-wider text-[var(--ink-secondary)] border-b border-[var(--line-hairline)] pb-2">
            01. Color Tokens & Contrast Ratios
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
            {[
              { label: "surface-base", bg: "var(--surface-base)", border: "var(--line-strong)", text: "var(--ink-primary)" },
              { label: "surface-subtle", bg: "var(--surface-subtle)", border: "var(--line-hairline)", text: "var(--ink-primary)" },
              { label: "surface-raised", bg: "var(--surface-raised)", border: "var(--line-strong)", text: "var(--ink-primary)" },
              { label: "surface-sunken", bg: "var(--surface-sunken)", border: "var(--line-hairline)", text: "var(--ink-primary)" },
              { label: "signal", bg: "var(--signal)", border: "transparent", text: "var(--signal-contrast)" },
              { label: "semantic-success", bg: "var(--semantic-success)", border: "transparent", text: "#fff" },
              { label: "semantic-warning", bg: "var(--semantic-warning)", border: "transparent", text: "#fff" },
              { label: "semantic-error", bg: "var(--semantic-error)", border: "transparent", text: "#fff" },
              { label: "semantic-info", bg: "var(--semantic-info)", border: "transparent", text: "#fff" },
              { label: "line-strong", bg: "var(--line-strong)", border: "transparent", text: "var(--surface-base)" },
              { label: "ink-primary", bg: "var(--ink-primary)", border: "transparent", text: "var(--surface-base)" },
              { label: "ink-muted", bg: "var(--ink-muted)", border: "transparent", text: "var(--surface-base)" },
            ].map((token) => (
              <div
                key={token.label}
                className="p-3 rounded-sm border flex flex-col justify-between h-20"
                style={{ backgroundColor: token.bg, borderColor: token.border, color: token.text }}
              >
                <span className="font-mono text-[11px] font-bold">{token.label}</span>
                <span className="text-[10px] opacity-80 font-mono">WCAG AA Pass</span>
              </div>
            ))}
          </div>
        </section>

        {/* 2. Typography & Languages */}
        <section className="space-y-4">
          <h2 className="text-base font-mono font-bold uppercase tracking-wider text-[var(--ink-secondary)] border-b border-[var(--line-hairline)] pb-2">
            02. Typography & Internationalization (LTR & RTL)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-5 border border-[var(--line-strong)] rounded-sm bg-[var(--surface-subtle)] space-y-3">
              <span className="text-xs font-mono uppercase text-[var(--signal)] font-bold">
                Editorial Display Serif & UI Grotesque
              </span>
              <p className="font-serif text-2xl font-bold leading-tight">
                Universal Zero-Selection Document Extraction
              </p>
              <p className="text-sm text-[var(--ink-secondary)]">
                The Archivist&apos;s Light Table turns physical paperwork into verifiable, structured intelligence with 99.4% field precision.
              </p>
              <div className="font-mono text-xs tabular-nums text-[var(--ink-muted)]">
                INV-2026-4092 | Latency: 48.2ms | Credits: 24,980.00 USD
              </div>
            </div>

            <div className="p-5 border border-[var(--line-strong)] rounded-sm bg-[var(--surface-subtle)] space-y-3" dir="rtl">
              <span className="text-xs font-mono uppercase text-[var(--signal)] font-bold">
                Urdu / Arabic Document Naskh Font Support
              </span>
              <p className="font-arabic text-xl font-bold leading-relaxed">
                اوپن او سی آر: دستاویزات کی تصدیق اور خودکار فیلڈ اخراج
              </p>
              <p className="font-arabic text-sm text-[var(--ink-secondary)] leading-relaxed">
                پاکستانی اور عربی دستاویزات کے لیے مکمل سپورٹ۔ انوائس نمبر، کل رقم اور ٹیکس کا خودکار اندراج۔
              </p>
              <div className="font-mono text-xs tabular-nums text-[var(--ink-muted)]">
                رسید نمبر: 8841 | کل رقم: ₨ 14,500 | تصدیق شدہ
              </div>
            </div>
          </div>
        </section>

        {/* 3. Button Component States */}
        <section className="space-y-4">
          <h2 className="text-base font-mono font-bold uppercase tracking-wider text-[var(--ink-secondary)] border-b border-[var(--line-hairline)] pb-2">
            03. Button Primitives & All States
          </h2>
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="primary">Primary Signal</Button>
              <Button variant="secondary">Secondary Ruled</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="subtle">Subtle</Button>
              <Button variant="destructive">Destructive</Button>
              <Button variant="ghost">Ghost</Button>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="primary" loading>Processing</Button>
              <Button variant="primary" disabled>Disabled State</Button>
              <Button variant="primary" size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                Proceed to Checkout
              </Button>
              <Button variant="outline" size="xs">XS Tag</Button>
              <Button variant="secondary" size="lg">Large Action</Button>
            </div>
          </div>
        </section>

        {/* 4. Form Inputs & Error Handling */}
        <section className="space-y-4">
          <h2 className="text-base font-mono font-bold uppercase tracking-wider text-[var(--ink-secondary)] border-b border-[var(--line-hairline)] pb-2">
            04. Inputs, Passwords, & Validated Form Fields
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input label="Document Title" placeholder="e.g. Q3 Financial Statement" hint="Max 128 chars" />
            <Input label="Passphrase" isPassword defaultValue="ArchivistSecretPassphrase123!" />
            <Input
              label="Tax Registration"
              defaultValue="INVALID_SERIAL"
              error="Registration serial must follow ISO-7064 format"
            />
          </div>
        </section>

        {/* 5. Badges & Confidence Metrics */}
        <section className="space-y-4">
          <h2 className="text-base font-mono font-bold uppercase tracking-wider text-[var(--ink-secondary)] border-b border-[var(--line-hairline)] pb-2">
            05. Badges, Archival Stamps & Confidence Ratings
          </h2>
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant="signal">Signal Active</Badge>
            <Badge confidence={0.99}>Header BBox</Badge>
            <Badge confidence={0.82}>Line Item Tax</Badge>
            <Badge confidence={0.64}>Handwritten Note</Badge>
            <Badge variant="outline">Archival Record</Badge>
            <span className="archival-stamp text-[var(--semantic-success)]">
              <Check className="w-3.5 h-3.5" /> Verified
            </span>
            <span className="archival-stamp text-[var(--semantic-warning)]">
              <AlertTriangle className="w-3.5 h-3.5" /> Inspection Req
            </span>
          </div>
        </section>

        {/* 6. Tabs & Segmented Controls */}
        <section className="space-y-4">
          <h2 className="text-base font-mono font-bold uppercase tracking-wider text-[var(--ink-secondary)] border-b border-[var(--line-hairline)] pb-2">
            06. Tabs & Modal Dialogs
          </h2>
          <Tabs defaultValue="overview">
            <TabsList>
              <TabsTrigger value="overview">01. Overview</TabsTrigger>
              <TabsTrigger value="tables">02. Tables (2)</TabsTrigger>
              <TabsTrigger value="fields">03. Key Fields (18)</TabsTrigger>
              <TabsTrigger value="json">04. Raw JSON</TabsTrigger>
            </TabsList>
            <TabsContent value="overview" className="p-4 border border-[var(--line-hairline)] rounded-sm bg-[var(--surface-subtle)]">
              Overview Tab Content: Showing synthesized document summary and spatial extraction breakdown.
            </TabsContent>
            <TabsContent value="tables" className="p-4 border border-[var(--line-hairline)] rounded-sm bg-[var(--surface-subtle)]">
              Tables Tab: Virtualized tabular rows.
            </TabsContent>
          </Tabs>

          <div className="pt-2">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="secondary" size="sm">
                  Open Archival Inspection Dialog
                </Button>
              </DialogTrigger>
              <DialogContent
                title="Archival Security Inspection"
                description="Review cryptographic checksums and air-gap network boundary logs."
              >
                <div className="space-y-4 mt-2">
                  <div className="p-3 bg-[var(--surface-sunken)] rounded-sm font-mono text-xs border border-[var(--line-hairline)]">
                    SHA-256: 9e107d9d372bb6826bd81d3542a419d6dae034e3e3b33346f04c
                  </div>
                  <Progress value={85} label="Inspection Progress" showPercent />
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </section>

        {/* 7. Table & Ledger Component */}
        <section className="space-y-4">
          <h2 className="text-base font-mono font-bold uppercase tracking-wider text-[var(--ink-secondary)] border-b border-[var(--line-hairline)] pb-2">
            07. Tabular Ledger
          </h2>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp (UTC)</TableHead>
                <TableHead>Transaction</TableHead>
                <TableHead>Reference ID</TableHead>
                <TableHead>Delta</TableHead>
                <TableHead>Running Balance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-mono text-[11px]">2026-10-28 21:04:12</TableCell>
                <TableCell>Document Extraction (2 Pages)</TableCell>
                <TableCell className="font-mono text-[11px] text-[var(--ink-muted)]">job_91a02f81c4e2</TableCell>
                <TableCell className="font-mono tabular-nums text-[var(--semantic-error)] font-bold">-2</TableCell>
                <TableCell className="font-mono tabular-nums font-bold">24,980</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-mono text-[11px]">2026-10-24 00:00:00</TableCell>
                <TableCell>Pro Monthly Subscription Grant</TableCell>
                <TableCell className="font-mono text-[11px] text-[var(--ink-muted)]">sub_renew_oct2026</TableCell>
                <TableCell className="font-mono tabular-nums text-[var(--semantic-success)] font-bold">+60,000</TableCell>
                <TableCell className="font-mono tabular-nums font-bold">24,982</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </section>

        {/* 8. Code Block Component */}
        <section className="space-y-4">
          <h2 className="text-base font-mono font-bold uppercase tracking-wider text-[var(--ink-secondary)] border-b border-[var(--line-hairline)] pb-2">
            08. Technical Code Block & SDK Generator
          </h2>
          <CodeBlock
            language="python"
            filename="extract_example.py"
            showLineNumbers
            code={`import httpx

# OpenOCR Zero-Selection Extraction
url = "https://api.openocr.io/v1/extract"
headers = {"X-API-Key": "ocr_live_pro123456789"}

with open("tax_invoice.pdf", "rb") as f:
    res = httpx.post(url, headers=headers, files={"file": f}, data={"format": "json"})

data = res.json()
print("Extracted fields:", data["fields"])`}
          />
        </section>
      </div>
    </div>
  );
}
