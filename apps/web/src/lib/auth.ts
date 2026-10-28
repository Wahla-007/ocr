"use client";

import { apiClient, ApiError, validateInternalRedirect } from "./api-client";

export interface AuthUser {
  id: string;
  email: string;
  plan: string;
  email_verified: boolean;
  created_at: string;
  last_login_at?: string;
}

export interface SessionInfo {
  id: string;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
  last_seen_at: string;
  expires_at: string;
  is_current: boolean;
}

export interface PasswordStrengthResult {
  score: number; // 0 to 4
  label: string;
  feedback: string;
  colorClass: string;
}

/**
 * NIST SP 800-63B Passphrase Evaluator
 * Emphasizes passphrase length, entropy, and dictionary checking over arbitrary symbol rules.
 */
export function evaluatePasswordStrength(password: string, email: string = ""): PasswordStrengthResult {
  if (!password) {
    return { score: 0, label: "Empty", feedback: "Enter a secure passphrase", colorClass: "bg-[var(--line-strong)]" };
  }

  const length = password.length;
  let score = 0;

  // Length scoring (NIST recommended)
  if (length >= 12) score += 1;
  if (length >= 16) score += 1;
  if (length >= 20) score += 1;

  // Diversity bonus
  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasDigit = /\d/.test(password);
  const hasSpecial = /[^a-zA-Z0-9]/.test(password);
  const typesCount = [hasLower, hasUpper, hasDigit, hasSpecial].filter(Boolean).length;
  if (typesCount >= 3) score += 1;

  // Check email containment
  if (email) {
    const local = email.split("@")[0].toLowerCase();
    if (local.length >= 3 && password.toLowerCase().includes(local)) {
      return {
        score: 1,
        label: "Risky",
        feedback: "Passphrase must not contain parts of your email address",
        colorClass: "bg-[var(--semantic-error)]",
      };
    }
  }

  // Common dictionary trivial patterns
  const trivial = ["password", "12345678", "qwerty", "admin", "welcome", "openocr"];
  if (trivial.some((t) => password.toLowerCase().includes(t))) {
    score = Math.min(score, 1);
  }

  score = Math.min(score, 4);

  if (score <= 1) {
    return {
      score,
      label: "Weak",
      feedback: length < 12 ? "Minimum 12 characters required per NIST standards" : "Too simple — choose a passphrase",
      colorClass: "bg-[var(--semantic-error)]",
    };
  }
  if (score === 2) {
    return {
      score,
      label: "Fair",
      feedback: "Add more words or characters to enhance security",
      colorClass: "bg-[var(--semantic-warning)]",
    };
  }
  if (score === 3) {
    return {
      score,
      label: "Strong",
      feedback: "Robust passphrase protection",
      colorClass: "bg-[var(--semantic-success)]",
    };
  }
  return {
    score,
    label: "Optimal",
    feedback: "High-entropy archival passphrase",
    colorClass: "bg-[var(--semantic-success)]",
  };
}

/**
 * High-level typed Auth API endpoints connecting directly to FastAPI /v1/auth/*
 */
export const authApi = {
  async signup(email: string, password: string, honeypot?: string) {
    return apiClient<{ message: string; user_id?: string }>("/v1/auth/signup", {
      method: "POST",
      body: JSON.stringify({ email, password, honeypot }),
      skipAuthRedirect: true,
    });
  },

  async login(email: string, password: string, rememberMe: boolean = false, honeypot?: string): Promise<AuthUser> {
    return apiClient<AuthUser>("/v1/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password, remember_me: rememberMe, honeypot }),
      skipAuthRedirect: true,
    });
  },

  async logout(): Promise<void> {
    try {
      await apiClient<void>("/v1/auth/logout", {
        method: "POST",
        skipAuthRedirect: true,
      });
    } finally {
      // Synchronize logout across all browser tabs via BroadcastChannel
      if (typeof window !== "undefined" && "BroadcastChannel" in window) {
        try {
          const channel = new BroadcastChannel("openocr_auth");
          channel.postMessage({ type: "LOGOUT" });
          channel.close();
        } catch {}
      }
    }
  },

  async getCurrentUser(): Promise<AuthUser | null> {
    try {
      return await apiClient<AuthUser>("/v1/auth/me", {
        method: "GET",
        skipAuthRedirect: true,
      });
    } catch {
      return null;
    }
  },

  async getActiveSessions(): Promise<SessionInfo[]> {
    return apiClient<SessionInfo[]>("/v1/auth/sessions", {
      method: "GET",
    });
  },

  async revokeAllOtherSessions(): Promise<void> {
    return apiClient<void>("/v1/auth/sessions/revoke-all", {
      method: "POST",
    });
  },

  async verifyEmail(token: string) {
    return apiClient<{ message: string }>("/v1/auth/verify-email", {
      method: "POST",
      body: JSON.stringify({ token }),
      skipAuthRedirect: true,
    });
  },

  async resendVerification(email: string) {
    return apiClient<{ message: string }>("/v1/auth/resend-verification", {
      method: "POST",
      body: JSON.stringify({ email }),
      skipAuthRedirect: true,
    });
  },

  async forgotPassword(email: string, honeypot?: string) {
    return apiClient<{ message: string }>("/v1/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email, honeypot }),
      skipAuthRedirect: true,
    });
  },

  async resetPassword(token: string, newPassword: string) {
    return apiClient<{ message: string }>("/v1/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ token, new_password: newPassword }),
      skipAuthRedirect: true,
    });
  },
};

export { validateInternalRedirect, ApiError };
export const authFetch = apiClient;
