"use client";

import * as React from "react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

// ConfirmDialog — a destructive/irreversible-action confirmation (TP1-07; Figma 791:14123). Built on the
// Dialog primitive, so Radix gives the accessibility contract: focus is trapped while open and RETURNED to
// the trigger on close, Escape and overlay-click cancel, and the content is labelled by its title and
// described by its body (universal-accessibility-wcag; E2E-13). The destructive affordance uses the
// destructive Button variant. Controlled: the parent owns `open`; Cancel closes, Confirm fires onConfirm.
//
// Copy is passed in (design-system primitive, no feature strings); cancelLabel/closeLabel default to English.

export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  body: React.ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  /** Use the destructive styling for the confirm button (delete, deactivate, …). */
  destructive?: boolean;
  /** Disable the confirm button while the action is in flight. */
  confirmPending?: boolean;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  body,
  confirmLabel,
  cancelLabel = "Cancel",
  onConfirm,
  destructive = false,
  confirmPending = false,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* The X uses its own "Close" label so it does not collide with the footer "Cancel" button. */}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{body}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              {cancelLabel}
            </Button>
          </DialogClose>
          <Button
            type="button"
            variant={destructive ? "destructive" : "default"}
            disabled={confirmPending}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
