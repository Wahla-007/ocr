import React, { useState } from "react";
import { Eye, EyeOff, AlertCircle } from "lucide-react";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
  isPassword?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      hint,
      error,
      isPassword = false,
      type = "text",
      id,
      className = "",
      disabled,
      ...props
    },
    ref
  ) => {
    const [showPassword, setShowPassword] = useState(false);
    const inputId = id || (label ? `input-${label.toLowerCase().replace(/\s+/g, "-")}` : undefined);
    const inputType = isPassword ? (showPassword ? "text" : "password") : type;

    return (
      <div className="w-full flex flex-col gap-1.5 font-sans">
        {label && (
          <div className="flex items-center justify-between">
            <label
              htmlFor={inputId}
              className="text-xs font-mono tracking-tight text-[var(--ink-secondary)] uppercase font-semibold"
            >
              {label}
            </label>
            {hint && <span className="text-[11px] text-[var(--ink-muted)]">{hint}</span>}
          </div>
        )}

        <div className="relative flex items-center">
          <input
            ref={ref}
            id={inputId}
            type={inputType}
            disabled={disabled}
            className={`w-full px-3 py-2 text-sm bg-[var(--surface-base)] text-[var(--ink-primary)] placeholder-[var(--ink-muted)] rounded-sm border transition-colors outline-none
              ${
                error
                  ? "border-[var(--semantic-error)] focus:border-[var(--semantic-error)] focus:ring-1 focus:ring-[var(--semantic-error)]"
                  : "border-[var(--line-strong)] hover:border-[var(--ink-secondary)] focus:border-[var(--signal)] focus:ring-1 focus:ring-[var(--signal)]"
              }
              ${disabled ? "opacity-50 cursor-not-allowed bg-[var(--surface-sunken)]" : ""}
              ${isPassword ? "pr-10" : ""}
              ${className}
            `}
            {...props}
          />

          {isPassword && (
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="absolute right-2.5 text-[var(--ink-muted)] hover:text-[var(--ink-primary)] p-1 transition-colors"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          )}
        </div>

        {error && (
          <div className="flex items-center gap-1.5 text-xs text-[var(--semantic-error)] mt-0.5">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
