"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";
import { authApi, AuthUser } from "@/lib/auth";
import { apiClient } from "@/lib/api-client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/Dialog";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/Table";
import {
  Key,
  Plus,
  Copy,
  Check,
  Trash2,
  AlertTriangle,
  ShieldAlert,
  Clock,
  ExternalLink,
  ShieldCheck,
} from "lucide-react";

interface ApiKeyItem {
  id: string;
  name: string;
  key_prefix: string;
  last_four: string;
  created_at: string;
  last_used_at?: string | null;
  rate_limit: number;
}

export default function ApiKeysPage() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [keys, setKeys] = useState<ApiKeyItem[]>([
    {
      id: "key_01",
      name: "Production Worker Key",
      key_prefix: "ocr_live_pro",
      last_four: "9a2f",
      created_at: "2026-10-24 14:22:01",
      last_used_at: "2026-10-28 21:04:12",
      rate_limit: 300,
    },
    {
      id: "key_02",
      name: "Staging Testing Key",
      key_prefix: "ocr_live_pro",
      last_four: "110c",
      created_at: "2026-10-20 09:15:33",
      last_used_at: "2026-10-27 18:30:00",
      rate_limit: 300,
    },
  ]);

  // One-time secret state (strictly wiped from memory upon dialog close)
  const [createdSecret, setCreatedSecret] = useState<string | null>(null);
  const [newKeyName, setNewKeyName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  useEffect(() => {
    authApi.getCurrentUser().then(setUser).catch(() => setUser(null));
  }, []);

  const handleCreateKey = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName || isCreating) return;

    setIsCreating(true);

    // Generate simulated CSPRNG token for one-time reveal
    const randomHex = Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    const generatedKey = `ocr_live_${randomHex}`;
    const lastFour = randomHex.slice(-4);

    const newRecord: ApiKeyItem = {
      id: `key_${Date.now()}`,
      name: newKeyName,
      key_prefix: "ocr_live",
      last_four: lastFour,
      created_at: new Date().toISOString().replace("T", " ").slice(0, 19),
      rate_limit: 300,
    };

    setKeys([newRecord, ...keys]);
    setCreatedSecret(generatedKey);
    setNewKeyName("");
    setIsCreating(false);
  };

  const handleDismissSecret = () => {
    // Explicitly wipe the plaintext key from memory
    setCreatedSecret(null);
    setCopiedSecret(false);
    setCreateDialogOpen(false);
  };

  const handleRevokeKey = (id: string, name: string) => {
    if (!confirm(`Are you sure you want to permanently revoke API Key "${name}"? This action cannot be reversed.`)) {
      return;
    }
    setKeys(keys.filter((k) => k.id !== id));
  };

  const isFree = user?.plan === "free" || !user?.plan;

  return (
    <div className="min-h-screen bg-[var(--surface-base)] text-[var(--ink-primary)] transition-colors">
      <Header />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--line-strong)] pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-[var(--signal)] font-bold tracking-wider uppercase">
                The Registry
              </span>
              <Badge variant="outline">RESTRICTED VAULT</Badge>
            </div>
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[var(--ink-primary)] tracking-tight mt-1">
              API Keys & Credentials
            </h1>
            <p className="text-xs sm:text-sm text-[var(--ink-secondary)] mt-0.5">
              Programmatic Bearer authentication for server-to-server extraction pipelines.
            </p>
          </div>

          {!isFree && (
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Plus className="w-3.5 h-3.5" />}
              onClick={() => {
                setCreatedSecret(null);
                setCreateDialogOpen(true);
              }}
            >
              Generate New API Key
            </Button>
          )}
        </div>

        {/* Free Plan Restrictive Banner */}
        {isFree && (
          <div className="p-4 border border-[var(--semantic-warning)] bg-[var(--semantic-warning-subtle)] rounded-sm space-y-2">
            <div className="flex items-center gap-2 font-serif font-bold text-sm text-[var(--ink-primary)]">
              <ShieldAlert className="w-4 h-4 text-[var(--semantic-warning)]" />
              <span>Programmatic API Access Requires Developer Plan</span>
            </div>
            <p className="text-xs text-[var(--ink-secondary)] leading-relaxed">
              API keys and webhooks are restricted to active Developer and Pro accounts. The Free Tier is intended for web light-table inspection only.
            </p>
            <div className="pt-1">
              <Link href="/pricing">
                <Button variant="primary" size="xs">
                  Upgrade to Developer Tier ($0.0010/page)
                </Button>
              </Link>
            </div>
          </div>
        )}

        {/* Keys Inventory Table */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-mono font-bold uppercase tracking-wider text-[var(--ink-secondary)]">
              Active Key Roster
            </h2>
            <span className="text-xs font-mono text-[var(--ink-muted)]">
              {keys.length} Active Key Identifiers
            </span>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Label / Name</TableHead>
                <TableHead>Key Identifier (Masked)</TableHead>
                <TableHead>Created Date (UTC)</TableHead>
                <TableHead>Last Used</TableHead>
                <TableHead>Rate Limit</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {keys.map((key) => (
                <TableRow key={key.id}>
                  <TableCell className="font-semibold text-[var(--ink-primary)]">
                    {key.name}
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    <span className="text-[var(--ink-muted)]">{key.key_prefix}_</span>
                    <span>••••••••••••••••</span>
                    <span className="font-bold text-[var(--ink-primary)]">{key.last_four}</span>
                  </TableCell>
                  <TableCell className="font-mono text-[11px] text-[var(--ink-secondary)]">
                    {key.created_at}
                  </TableCell>
                  <TableCell className="font-mono text-[11px] text-[var(--ink-secondary)]">
                    {key.last_used_at || "Never"}
                  </TableCell>
                  <TableCell className="font-mono text-xs tabular-nums">
                    {key.rate_limit} req/min
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="destructive"
                      size="xs"
                      onClick={() => handleRevokeKey(key.id, key.name)}
                      leftIcon={<Trash2 className="w-3 h-3" />}
                    >
                      Revoke
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </section>

        {/* Creation / One-Time Reveal Dialog */}
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogContent
            title={createdSecret ? "Secret Key Issued (One-Time Reveal)" : "Issue New API Key"}
            description={
              createdSecret
                ? "Copy this key now. It is shown exactly once and will never be displayed again."
                : "Enter a descriptive label for your new programmatic API token."
            }
          >
            {createdSecret ? (
              <div className="space-y-4 mt-2">
                <div className="p-3 bg-[var(--surface-sunken)] border border-[var(--semantic-warning)] rounded-sm space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-[var(--semantic-warning)] font-mono">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>STORE THIS SECRET SAFELY</span>
                  </div>
                  <div className="p-2 bg-[var(--surface-base)] rounded-sm border border-[var(--line-strong)] font-mono text-xs break-all text-[var(--ink-primary)] select-all font-bold">
                    {createdSecret}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="primary"
                    size="sm"
                    className="flex-1"
                    onClick={() => {
                      navigator.clipboard.writeText(createdSecret);
                      setCopiedSecret(true);
                      setTimeout(() => setCopiedSecret(false), 2000);
                    }}
                    leftIcon={copiedSecret ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  >
                    {copiedSecret ? "Copied to Clipboard" : "Copy Key Secret"}
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleDismissSecret}>
                    Dismiss & Close
                  </Button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleCreateKey} className="space-y-4 mt-2">
                <Input
                  label="Key Description"
                  placeholder="e.g. AWS Lambda Invoicing Worker"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  required
                />
                <Button type="submit" variant="primary" size="sm" loading={isCreating} className="w-full">
                  Generate Key
                </Button>
              </form>
            )}
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
