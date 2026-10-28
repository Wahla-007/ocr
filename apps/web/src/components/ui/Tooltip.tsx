"use client";

import React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";

export const TooltipProvider = TooltipPrimitive.Provider;
export const Tooltip = TooltipPrimitive.Root;
export const TooltipTrigger = TooltipPrimitive.Trigger;

export const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className = "", sideOffset = 4, ...props }, ref) => (
  <TooltipPrimitive.Content
    ref={ref}
    sideOffset={sideOffset}
    className={`z-50 overflow-hidden rounded-sm border border-[var(--line-strong)] bg-[var(--surface-raised)] px-2.5 py-1 text-xs font-mono text-[var(--ink-primary)] shadow-card animate-fade-in ${className}`}
    {...props}
  />
));
TooltipContent.displayName = TooltipPrimitive.Content.displayName;
