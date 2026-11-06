// The browser (anon) Supabase client, for client components that do non-auth reads (ADR-0005). It performs
// NO authentication: sign-in/out and every session read happen on the server via server.ts. A single
// instance is reused per browser tab. Per the arch-gate "UI must not access a backend directly" rule,
// components import this through a hook/service, never directly from a page or component.

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/lib/database.types";
import { supabaseAnonKey, supabaseUrl } from "./config";

let browserClient: ReturnType<typeof createBrowserClient<Database>> | undefined;

export function getBrowserClient() {
  browserClient ??= createBrowserClient<Database>(supabaseUrl(), supabaseAnonKey());
  return browserClient;
}
