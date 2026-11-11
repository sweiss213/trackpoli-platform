"use client";

import { Suspense, useRef, useState, type ReactNode } from "react";

import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { SnackbarProvider } from "@/components/ui/snackbar";
import { SideNav } from "./SideNav";
import { TopBar } from "./TopBar";
import { shellStrings } from "./strings";

// The authenticated admin shell (TP1-06, rebuilt responsive in TP1-07; Figma 805:19276 + dashboard 943:86543).
// Layout: a side navigation and the page content, with the top bar above the content. The (app) route-group
// layout has already enforced the session/active guards server-side before this renders.
//
// Responsive (Q-1-19, support-matrix.md): at >=1024px the nav is a persistent rail (collapsible to icons);
// below 1024px it is an off-canvas drawer (Sheet) opened from the top bar's menu button and closed on
// navigation. A skip link lets keyboard users jump past the nav straight to the content, and <main> is a
// focus target (tabIndex -1) so the skip link lands focus there (universal-accessibility-wcag; E2E-13).
// Colour via semantic tokens / --md-surface for the page canvas — no literal.

export function AppShell({ displayName, children }: { displayName: string; children: ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [railCollapsed, setRailCollapsed] = useState(false);
  // The drawer opens from the top-bar menu button via state (not a Radix trigger), so we return focus to
  // that button ourselves when the drawer closes (universal-accessibility-wcag: focus returns after a dialog).
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  return (
    <SnackbarProvider dismissLabel={shellStrings.snackbar.dismiss}>
      <div className="flex min-h-[100dvh] bg-muted">
        <a
          href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-[var(--md-shape-field)] focus:bg-card focus:px-4 focus:py-2 focus:text-[length:var(--md-label-large-size)] focus:font-medium focus:text-foreground focus:outline-2 focus:outline-offset-2 focus:outline-foreground"
      >
        {shellStrings.skipToContent}
      </a>

      {/* Persistent rail at >=1024px. Hidden (and out of the a11y tree) below that, where the drawer takes over. */}
      <aside className="hidden lg:block">
        <SideNav
          displayName={displayName}
          collapsed={railCollapsed}
          onToggleCollapsed={() => setRailCollapsed((c) => !c)}
        />
      </aside>

      {/* Off-canvas drawer below 1024px. Radix Dialog traps focus and returns it to the menu button on close. */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent
          side="left"
          className="lg:hidden"
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            menuButtonRef.current?.focus();
          }}
        >
          <SheetTitle className="sr-only">{shellStrings.nav.primaryLabel}</SheetTitle>
          <SideNav displayName={displayName} onNavigate={() => setDrawerOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="flex h-[100dvh] min-w-0 flex-1 flex-col overflow-hidden">
        <Suspense>
          <TopBar
            displayName={displayName}
            onMenu={() => setDrawerOpen(true)}
            menuExpanded={drawerOpen}
            menuRef={menuButtonRef}
          />
        </Suspense>
        <main
          id="main-content"
          tabIndex={-1}
          className="min-h-0 flex-1 overflow-y-auto bg-[var(--md-surface)] outline-none"
        >
          {children}
        </main>
      </div>
      </div>
    </SnackbarProvider>
  );
}
