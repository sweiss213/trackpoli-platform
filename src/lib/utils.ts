import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge class names the shadcn/ui way: `clsx` resolves conditional/array input, then
 * `tailwind-merge` collapses conflicting Tailwind utilities so the last one wins
 * (`cn("px-2", "px-4") === "px-4"`). This is the single `@/lib/utils` helper the shadcn
 * components (added screen-by-screen in later PRs) compose. See ADR-0011.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
