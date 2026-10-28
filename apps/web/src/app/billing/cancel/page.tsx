"use client";

import React, { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Header } from "@/components/Header";
import { XCircle, ArrowRight, RefreshCw, CreditCard } from "lucide-react";

function CancelContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("order_id");

  return (
    <div className="max-w-md mx-auto px-4 py-20 text-center space-y-6">
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-8 space-y-6 shadow-2xl">
        <div className="w-16 h-16 rounded-full bg-zinc-800 text-zinc-400 mx-auto flex items-center justify-center">
          <XCircle className="w-9 h-9" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-extrabold text-white">Checkout Canceled</h1>
          <p className="text-sm text-zinc-400 leading-relaxed">
            The payment process was canceled. No charges were made to your credit card or digital wallet.
          </p>
        </div>

        {orderId && (
          <div className="text-[11px] font-mono text-zinc-500 border border-zinc-800/80 bg-zinc-950/50 py-2 px-3 rounded-lg">
            Reference: {orderId}
          </div>
        )}

        <div className="flex flex-col gap-3 pt-2">
          <Link
            href="/pricing"
            className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-zinc-200 text-zinc-950 font-bold text-xs transition-colors flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Try Checkout Again</span>
          </Link>
          <Link
            href="/billing"
            className="w-full py-2.5 px-4 rounded-xl border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium text-xs transition-colors"
          >
            Go to Billing Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function CancelPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 selection:bg-zinc-800 selection:text-white">
      <Header />
      <Suspense fallback={<div className="max-w-md mx-auto py-20 text-center text-xs text-zinc-400">Loading...</div>}>
        <CancelContent />
      </Suspense>
    </div>
  );
}
