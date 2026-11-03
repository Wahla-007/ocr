import React from "react";
import { Loader2 } from "lucide-react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "subtle" | "outline" | "destructive" | "ghost";
  size?: "xs" | "sm" | "md" | "lg";
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      loading = false,
      disabled,
      className = "",
      children,
      leftIcon,
      rightIcon,
      ...props
    },
    ref
  ) => {
    // Base styles: crisp edges or 2px radius, hairline borders, focus ring, no blurry shadows
    const baseStyles =
      "inline-flex items-center justify-center font-sans font-medium transition-all duration-150 select-none disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]";

    const variantStyles = {
      primary:
        "bg-purple-600 dark:bg-[#9281f7] text-white dark:text-[#000000] hover:bg-purple-700 dark:hover:bg-[#baa7ff] border border-transparent font-medium shadow-sm dark:shadow-[0_0_12px_rgba(146,129,247,0.25)]",
      secondary:
        "bg-transparent text-zinc-900 dark:text-[#ffffff] hover:border-zinc-900 dark:hover:border-[#ffffff] border border-zinc-200 dark:border-[#292d30]",
      outline:
        "bg-transparent text-zinc-800 dark:text-[#f0f0f0] hover:text-zinc-950 dark:hover:text-[#ffffff] border border-zinc-200 dark:border-[#292d30] hover:border-zinc-900 dark:hover:border-[#ffffff]",
      subtle:
        "bg-zinc-100 dark:bg-[#0b0e14] text-zinc-700 dark:text-[#a1a4a5] hover:text-zinc-900 dark:hover:text-[#ffffff] hover:bg-zinc-200 dark:hover:bg-[#14171f] border border-zinc-200 dark:border-[#292d30]",
      destructive:
        "bg-red-600 dark:bg-[#ff6465] text-white hover:opacity-90 border border-transparent",
      ghost:
        "bg-transparent text-zinc-600 dark:text-[#a1a4a5] hover:text-zinc-900 dark:hover:text-[#ffffff] hover:bg-zinc-100 dark:hover:bg-[#0b0e14] border border-transparent",
    }[variant];

    const sizeStyles = {
      xs: "text-xs px-2.5 py-1 rounded-[6px] gap-1.5 min-h-[28px]",
      sm: "text-xs px-3.5 py-1.5 rounded-[6px] gap-2 min-h-[32px]",
      md: "text-sm px-4 py-2 rounded-[6px] gap-2 min-h-[38px]",
      lg: "text-base px-5 py-2.5 rounded-[6px] gap-2.5 min-h-[44px]",
    }[size];

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={`${baseStyles} ${variantStyles} ${sizeStyles} ${className}`}
        {...props}
      >
        {loading && <Loader2 className="w-4 h-4 animate-spin shrink-0" />}
        {!loading && leftIcon && <span className="shrink-0">{leftIcon}</span>}
        <span>{children}</span>
        {!loading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = "Button";
