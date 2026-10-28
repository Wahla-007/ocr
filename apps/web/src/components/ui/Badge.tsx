import React from "react";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "success" | "warning" | "error" | "signal" | "outline";
  confidence?: number; // 0.0 to 1.0 or 0 to 100
}

export const Badge: React.FC<BadgeProps> = ({
  variant = "default",
  confidence,
  className = "",
  children,
  ...props
}) => {
  // If confidence is provided, compute variant automatically if default
  let resolvedVariant = variant;
  let formattedConfidence = "";

  if (typeof confidence === "number") {
    const val = confidence <= 1.0 ? Math.round(confidence * 100) : Math.round(confidence);
    formattedConfidence = `${val}%`;
    if (variant === "default") {
      if (val >= 90) resolvedVariant = "success";
      else if (val >= 75) resolvedVariant = "warning";
      else resolvedVariant = "error";
    }
  }

  const variantStyles = {
    default:
      "bg-[var(--surface-raised)] text-[var(--ink-secondary)] border-[var(--line-hairline)]",
    signal:
      "bg-[var(--signal-subtle)] text-[var(--signal)] border-[var(--signal)]",
    success:
      "bg-[var(--semantic-success-subtle)] text-[var(--semantic-success)] border-[var(--semantic-success)]",
    warning:
      "bg-[var(--semantic-warning-subtle)] text-[var(--semantic-warning)] border-[var(--semantic-warning)]",
    error:
      "bg-[var(--semantic-error-subtle)] text-[var(--semantic-error)] border-[var(--semantic-error)]",
    outline:
      "bg-transparent text-[var(--ink-secondary)] border-[var(--line-strong)]",
  }[resolvedVariant];

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-sm border text-[11px] font-mono tracking-tight font-medium select-none ${variantStyles} ${className}`}
      {...props}
    >
      {children}
      {formattedConfidence && (
        <span className="tabular-nums font-bold">[{formattedConfidence}]</span>
      )}
    </span>
  );
};
