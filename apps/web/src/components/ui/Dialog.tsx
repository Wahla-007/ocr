"use client";

import React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogPortal = DialogPrimitive.Portal;
export const DialogClose = DialogPrimitive.Close;

export const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className = "", ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={`fixed inset-0 z-50 bg-black/60 backdrop-blur-[2px] transition-opacity duration-150 data-[state=open]:animate-fade-in ${className}`}
    {...props}
  />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

export const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
    title?: string;
    description?: string;
  }
>(({ className = "", children, title, description, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={`fixed left-[50%] top-[50%] z-50 translate-x-[-50%] translate-y-[-50%] w-full max-w-lg bg-[var(--surface-base)] border border-[var(--line-strong)] p-6 shadow-inspection rounded-sm duration-150 focus:outline-none ${className}`}
      {...props}
    >
      <div className="flex items-center justify-between pb-3 border-b border-[var(--line-hairline)] mb-4">
        <div>
          {title && (
            <DialogPrimitive.Title className="text-base font-serif font-bold text-[var(--ink-primary)] tracking-tight">
              {title}
            </DialogPrimitive.Title>
          )}
          {description && (
            <DialogPrimitive.Description className="text-xs text-[var(--ink-muted)] mt-0.5">
              {description}
            </DialogPrimitive.Description>
          )}
        </div>
        <DialogPrimitive.Close
          className="p-1 rounded-sm text-[var(--ink-muted)] hover:text-[var(--ink-primary)] hover:bg-[var(--surface-subtle)] transition-colors focus:outline-none focus:ring-1 focus:ring-[var(--focus-ring)]"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </DialogPrimitive.Close>
      </div>

      {children}
    </DialogPrimitive.Content>
  </DialogPortal>
));
DialogContent.displayName = DialogPrimitive.Content.displayName;
