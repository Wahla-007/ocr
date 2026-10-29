"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Sun,
  Moon,
  User as UserIcon,
  LogOut,
  CreditCard,
  Key,
  Layers,
  FileText,
  ShieldCheck,
  Server,
  BookOpen,
  Bot,
} from "lucide-react";
import { authApi, AuthUser } from "@/lib/auth";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

interface HeaderProps {
  creditsBalance?: number;
  itemsProcessed?: number;
  maxItems?: number;
  plan?: string;
}

export function Header({
  creditsBalance = 10,
  itemsProcessed = 0,
  maxItems = 5,
  plan = "free",
}: HeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    // Check initial theme from DOM or system
    const darkActive = document.documentElement.classList.contains("dark");
    setIsDark(darkActive);

    authApi.getCurrentUser().then(setCurrentUser).catch(() => setCurrentUser(null));
  }, [pathname]);

  const toggleTheme = () => {
    const nextDark = !isDark;
    setIsDark(nextDark);
    if (nextDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  const handleLogout = async () => {
    try {
      await authApi.logout();
      setCurrentUser(null);
      router.push("/login");
    } catch {
      setCurrentUser(null);
      router.push("/login");
    }
  };

  const navLinks = [
    { href: "/", label: "Light Table" },
    { href: "/docs", label: "Documentation" },
    { href: "/pricing", label: "Rate Card" },
    { href: "/self-hosted", label: "Self-Hosted Solution" },
    { href: "/support", label: "Support" },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[var(--line-strong)] bg-[var(--surface-base)]/95 backdrop-blur-[4px] px-4 sm:px-8 py-2.5 transition-colors select-none">
      <div className="max-w-[1720px] mx-auto flex items-center justify-between gap-4">
        {/* Brand Logo & Tag */}
        <div className="flex items-center gap-6 sm:gap-8">
          <Link
            href="/"
            className="flex items-center gap-2.5 text-left hover:opacity-85 transition-opacity cursor-pointer group"
            title="OpenOCR Home"
          >
            <div className="h-6 w-6 rounded-sm bg-[var(--ink-primary)] text-[var(--surface-base)] flex items-center justify-center font-mono font-bold text-xs shadow-subtle">
              //
            </div>
            <div className="flex items-center gap-2">
              <span className="font-serif font-bold text-base tracking-tight text-[var(--ink-primary)]">
                OpenOCR
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-sm border border-[var(--line-hairline)] text-[var(--ink-muted)] bg-[var(--surface-subtle)]">
                v1.2
              </span>
            </div>
          </Link>

          {/* Primary Navigation Links */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-3 py-1.5 rounded-sm text-xs font-mono tracking-tight transition-colors ${
                    active
                      ? "text-[var(--signal)] font-bold bg-[var(--signal-subtle)] border border-[var(--signal)]"
                      : "text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] hover:bg-[var(--surface-subtle)] border border-transparent"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right Session Controls & Theme Toggle */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          {/* Assistant Trigger Button */}
          <button
            type="button"
            onClick={() => {
              if (typeof window !== "undefined") {
                window.dispatchEvent(new CustomEvent("open-openocr-chat"));
              }
            }}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono rounded-sm bg-[var(--signal-subtle)] border border-[var(--signal)]/50 text-[var(--signal)] hover:bg-[var(--signal)] hover:text-white transition-all font-bold group shadow-sm"
            title="Open AI Assistant QA Chatbot"
            aria-label="Open Assistant Chatbot"
          >
            <Bot className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">Assistant</span>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
          </button>

          {/* Theme Toggle */}
          <button
            type="button"
            onClick={toggleTheme}
            className="p-1.5 rounded-sm border border-[var(--line-hairline)] text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] hover:bg-[var(--surface-subtle)] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--focus-ring)]"
            title={isDark ? "Switch to Paper Light Theme" : "Switch to Deep Ink Dark Theme"}
            aria-label="Toggle visual theme"
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* User Session Desk */}
          {currentUser ? (
            <div className="flex items-center gap-2">
              <Link href="/billing">
                <Button variant="outline" size="xs" leftIcon={<CreditCard className="w-3.5 h-3.5" />}>
                  <span className="font-mono tabular-nums">{creditsBalance}</span> Credits
                </Button>
              </Link>

              <div className="hidden sm:flex items-center gap-1.5 px-2 py-1 bg-[var(--surface-subtle)] border border-[var(--line-hairline)] rounded-sm text-xs font-mono">
                <UserIcon className="w-3.5 h-3.5 text-[var(--ink-muted)]" />
                <span className="max-w-[120px] truncate text-[var(--ink-primary)]">
                  {currentUser.email}
                </span>
                <Badge variant={currentUser.plan === "pro" ? "signal" : "outline"} className="text-[10px]">
                  {currentUser.plan.toUpperCase()}
                </Badge>
              </div>

              <button
                type="button"
                onClick={handleLogout}
                className="p-1.5 rounded-sm text-[var(--ink-muted)] hover:text-[var(--semantic-error)] hover:bg-[var(--semantic-error-subtle)] transition-colors focus-visible:outline-none"
                title="Sign out of OpenOCR session"
                aria-label="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/login">
                <Button variant="subtle" size="sm">
                  Sign In
                </Button>
              </Link>
              <Link href="/signup">
                <Button variant="primary" size="sm">
                  Register
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
