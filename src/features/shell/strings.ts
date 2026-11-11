// Centralised English (UK) UI copy for the admin shell (Q-C-11: "keep strings in one place so
// translation is possible later"). usability-ux-universal-design (content-and-plain-language) requires
// that we avoid hard-coded concatenated sentences and format per locale — so each string is a whole,
// self-contained message, and anything with a variable is a FUNCTION that interpolates once (never
// string "+" at the call site). Nav labels live in navItems.ts (the nav data model); this file holds
// the rest of the shell's copy and the default copy for the shared state components.
//
// Role names are "Administrator" / "Administrator Manager" (Q-C-08); see @/lib/roles roleLabel.

export const shellStrings = {
  skipToContent: "Skip to main content",
  appName: "TrackPoli Admin",

  nav: {
    primaryLabel: "Primary",
    openMenu: "Open navigation menu",
    closeMenu: "Close navigation menu",
    expandRail: "Expand navigation",
    collapseRail: "Collapse navigation",
  },

  user: {
    accountLabel: "Account",
    signOut: "Log out",
    signOutOthers: "Log out other sessions",
  },

  breadcrumb: {
    navLabel: "Breadcrumb",
    home: "Dashboard",
  },

  states: {
    loading: "Loading…",
    empty: {
      title: "Nothing here yet",
      body: "There is nothing to show on this page yet.",
    },
    error: {
      title: "Something went wrong",
      body: "This page could not be loaded. Try again, and if it keeps happening, contact support.",
      retry: "Try again",
    },
    notFound: {
      title: "Page not found",
      body: "The page you were looking for does not exist or has moved.",
      backToDashboard: "Back to dashboard",
    },
  },

  dialog: {
    close: "Close",
    cancel: "Cancel",
  },

  snackbar: {
    dismiss: "Dismiss",
  },
} as const;

export type ShellStrings = typeof shellStrings;
