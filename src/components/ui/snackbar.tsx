"use client";

import * as React from "react";
import { Toast as ToastPrimitive } from "radix-ui";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

// Snackbar — transient messages with optional undo (TP1-07; Figma 791:14186). Built on Radix Toast, which
// gives the accessibility contract: each message is announced POLITELY by default (aria-live), does not
// steal focus, auto-dismisses after a timeout but pauses on hover/focus, and is keyboard-dismissable
// (universal-accessibility-wcag). An `assertive` message is announced immediately for time-critical cases.
// The optional action (e.g. "Undo") is a real Button with the Radix altText for screen-reader context.
//
// Pattern: Provider + Context (pattern-selector) — SnackbarProvider hosts the viewport and exposes
// useSnackbar().show() to anything beneath it. Design-system primitive: copy is passed by the caller;
// only the dismiss label has an English default.

export interface SnackbarAction {
  label: string;
  onClick: () => void;
}

export interface SnackbarOptions {
  message: string;
  action?: SnackbarAction;
  /** Milliseconds before auto-dismiss (default 6000). */
  duration?: number;
  /** Announce immediately (assertive) instead of politely. Use sparingly. */
  assertive?: boolean;
}

interface SnackbarItem extends SnackbarOptions {
  id: number;
  open: boolean;
}

interface SnackbarContextValue {
  show: (options: SnackbarOptions) => void;
}

const SnackbarContext = React.createContext<SnackbarContextValue | null>(null);

export function SnackbarProvider({
  children,
  dismissLabel = "Dismiss",
}: {
  children: React.ReactNode;
  dismissLabel?: string;
}) {
  const [items, setItems] = React.useState<SnackbarItem[]>([]);
  const idRef = React.useRef(0);

  const show = React.useCallback((options: SnackbarOptions) => {
    const id = (idRef.current += 1);
    setItems((prev) => [...prev, { ...options, id, open: true }]);
  }, []);

  const setOpen = React.useCallback((id: number, open: boolean) => {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, open } : item)));
    if (!open) {
      // Remove after the close animation so the list does not grow unbounded.
      window.setTimeout(() => setItems((prev) => prev.filter((item) => item.id !== id)), 200);
    }
  }, []);

  const value = React.useMemo(() => ({ show }), [show]);

  return (
    <SnackbarContext.Provider value={value}>
      <ToastPrimitive.Provider swipeDirection="right">
        {children}
        {items.map((item) => (
          <ToastPrimitive.Root
            key={item.id}
            open={item.open}
            duration={item.duration ?? 6000}
            type={item.assertive ? "foreground" : "background"}
            onOpenChange={(open) => setOpen(item.id, open)}
            className={cn(
              "flex items-center gap-3 rounded-[var(--md-shape-field)] bg-[var(--md-on-surface)] px-4 py-3 text-[var(--md-surface-container-lowest)] shadow-[var(--md-elevation-card)]",
              "data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom-2 data-[state=closed]:animate-out data-[state=closed]:fade-out-0",
            )}
          >
            <ToastPrimitive.Title className="min-w-0 flex-1 text-[length:var(--md-body-medium-size)] leading-[var(--md-body-medium-line)] tracking-[var(--md-body-medium-tracking)]">
              {item.message}
            </ToastPrimitive.Title>
            {item.action ? (
              <ToastPrimitive.Action altText={item.action.label} asChild>
                <Button
                  type="button"
                  variant="ghost"
                  className="h-auto rounded-full px-3 py-1 text-[var(--md-surface-container-lowest)] hover:bg-transparent hover:opacity-80"
                  onClick={item.action.onClick}
                >
                  {item.action.label}
                </Button>
              </ToastPrimitive.Action>
            ) : null}
            <ToastPrimitive.Close
              aria-label={dismissLabel}
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[var(--md-surface-container-lowest)] outline-none hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--md-surface-container-lowest)]"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </ToastPrimitive.Close>
          </ToastPrimitive.Root>
        ))}
        <ToastPrimitive.Viewport className="fixed bottom-0 right-0 z-[70] m-0 flex w-[min(420px,calc(100vw-2rem))] max-w-full list-none flex-col gap-2 p-4 outline-none" />
      </ToastPrimitive.Provider>
    </SnackbarContext.Provider>
  );
}

export function useSnackbar(): SnackbarContextValue {
  const ctx = React.useContext(SnackbarContext);
  if (!ctx) {
    throw new Error("useSnackbar must be used within a <SnackbarProvider>.");
  }
  return ctx;
}
