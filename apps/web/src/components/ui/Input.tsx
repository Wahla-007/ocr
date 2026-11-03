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
              className="text-xs font-medium text-zinc-700 dark:text-zinc-300 select-none"
            >
              {label}
            </label>
            {hint && <span className="text-[11px] text-zinc-400 dark:text-zinc-500">{hint}</span>}
          </div>
        )}

        <div className="relative flex items-center">
          <input
            ref={ref}
            id={inputId}
            type={inputType}
            disabled={disabled}
            className={`w-full px-3.5 py-2.5 text-sm bg-white dark:bg-[#08080a] text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-[#6e727a] rounded-[8px] border transition-all outline-none
              ${
                error
                  ? "border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
                  : "border-zinc-200 dark:border-[#292d30] hover:border-zinc-300 dark:hover:border-zinc-700 focus:border-purple-600 dark:focus:border-[#9281f7] focus:ring-2 focus:ring-purple-600/15 dark:focus:ring-[#9281f7]/20"
              }
              ${disabled ? "opacity-50 cursor-not-allowed bg-zinc-100 dark:bg-[#050505]" : ""}
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
              className="absolute right-2.5 text-zinc-400 hover:text-zinc-700 dark:text-[#a1a4a5] dark:hover:text-white p-1 rounded transition-colors"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          )}
        </div>

        {error && (
          <div className="flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400 mt-0.5">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
