"use client";

import React from "react";
import * as ProgressPrimitive from "@radix-ui/react-progress";

export interface ProgressProps extends React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> {
  value?: number;
  label?: string;
  showPercent?: boolean;
}

export const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  ProgressProps
>(({ className = "", value = 0, label, showPercent = false, ...props }, ref) => (
  <div className="w-full flex flex-col gap-1 font-mono text-xs">
    {(label || showPercent) && (
      <div className="flex items-center justify-between text-[11px] text-[var(--ink-secondary)]">
        {label && <span className="font-semibold uppercase tracking-wider">{label}</span>}
        {showPercent && <span className="tabular-nums font-bold">{Math.round(value || 0)}%</span>}
      </div>
    )}
    <ProgressPrimitive.Root
      ref={ref}
      className={`relative h-2 w-full overflow-hidden rounded-sm bg-[var(--surface-sunken)] border border-[var(--line-hairline)] ${className}`}
      {...props}
    >
      <ProgressPrimitive.Indicator
        className="h-full bg-[var(--signal)] transition-all duration-300 ease-out"
        style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
      />
    </ProgressPrimitive.Root>
  </div>
));
Progress.displayName = ProgressPrimitive.Root.displayName;
