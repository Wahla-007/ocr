import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        surface: {
          base: "var(--surface-base)",
          subtle: "var(--surface-subtle)",
          raised: "var(--surface-raised)",
          sunken: "var(--surface-sunken)",
          overlay: "var(--surface-overlay)",
        },
        ink: {
          primary: "var(--ink-primary)",
          secondary: "var(--ink-secondary)",
          muted: "var(--ink-muted)",
        },
        line: {
          hairline: "var(--line-hairline)",
          strong: "var(--line-strong)",
        },
        signal: {
          DEFAULT: "var(--signal)",
          hover: "var(--signal-hover)",
          subtle: "var(--signal-subtle)",
          contrast: "var(--signal-contrast)",
        },
        semantic: {
          success: "var(--semantic-success)",
          "success-subtle": "var(--semantic-success-subtle)",
          warning: "var(--semantic-warning)",
          "warning-subtle": "var(--semantic-warning-subtle)",
          error: "var(--semantic-error)",
          "error-subtle": "var(--semantic-error-subtle)",
          info: "var(--semantic-info)",
          "info-subtle": "var(--semantic-info-subtle)",
        },
      },
      fontFamily: {
        serif: ["var(--font-serif)", "Newsreader", "Georgia", "serif"],
        sans: ["var(--font-sans)", "Plus Jakarta Sans", "system-ui", "-apple-system", "sans-serif"],
        mono: ["var(--font-mono)", "JetBrains Mono", "SFMono-Regular", "monospace"],
        arabic: ["var(--font-arabic)", "Noto Naskh Arabic", "serif"],
      },
      borderRadius: {
        sm: "2px",
        DEFAULT: "4px",
        md: "6px",
      },
      boxShadow: {
        subtle: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
        card: "0 2px 4px -1px rgba(0, 0, 0, 0.06)",
        inspection: "0 0 0 1px var(--line-strong), 0 4px 12px -2px rgba(0, 0, 0, 0.08)",
      },
      animation: {
        "scan-line": "scanline 2s ease-in-out infinite",
        "stamp-in": "stamp 180ms cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "fade-in": "fadein 150ms ease-out forwards",
      },
      keyframes: {
        scanline: {
          "0%": { top: "0%", opacity: "0.2" },
          "50%": { opacity: "1" },
          "100%": { top: "100%", opacity: "0.2" },
        },
        stamp: {
          "0%": { transform: "scale(1.15) rotate(-3deg)", opacity: "0" },
          "100%": { transform: "scale(1) rotate(0deg)", opacity: "1" },
        },
        fadein: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
