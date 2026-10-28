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
        "bg-[var(--signal)] text-[var(--signal-contrast)] hover:bg-[var(--signal-hover)] border border-transparent shadow-subtle",
      secondary:
        "bg-[var(--surface-raised)] text-[var(--ink-primary)] hover:bg-[var(--surface-sunken)] border border-[var(--line-strong)]",
      outline:
        "bg-transparent text-[var(--ink-primary)] hover:bg-[var(--surface-subtle)] border border-[var(--line-strong)]",
      subtle:
        "bg-[var(--surface-subtle)] text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] hover:bg-[var(--surface-raised)] border border-[var(--line-hairline)]",
      destructive:
        "bg-[var(--semantic-error)] text-white hover:opacity-90 border border-transparent",
      ghost:
        "bg-transparent text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] hover:bg-[var(--surface-subtle)] border border-transparent",
    }[variant];

    const sizeStyles = {
      xs: "text-xs px-2 py-1 rounded-sm gap-1 min-h-[26px]",
      sm: "text-xs px-3 py-1.5 rounded-sm gap-1.5 min-h-[32px]",
      md: "text-sm px-4 py-2 rounded-sm gap-2 min-h-[40px]",
      lg: "text-base px-5 py-2.5 rounded-sm gap-2.5 min-h-[46px]",
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
