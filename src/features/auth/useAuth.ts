"use client";

// Read the current auth state in a client component. Must be used inside <AuthProvider>; it throws
// otherwise, so a mis-placed consumer fails loudly in development rather than silently rendering as a
// signed-out user.

import { useContext } from "react";
import { AuthContext, type AuthState } from "./AuthProvider";

export function useAuth(): AuthState {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within <AuthProvider>.");
  }
  return context;
}
