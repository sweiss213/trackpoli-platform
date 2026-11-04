// Exact-origin CORS. ALLOWED_ORIGINS is a comma-separated allow-list; never "*". Because only the
// Next.js server calls these functions, ALLOWED_ORIGINS is normally empty and browser cross-origin
// calls are refused (Phase 1 plan, section 4 and the Q-1-09 backend-for-frontend rule).

function allowedOrigins(): string[] {
  return (Deno.env.get("ALLOWED_ORIGINS") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function corsHeaders(origin: string | null): Record<string, string> {
  const headers: Record<string, string> = {
    "Vary": "Origin",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, content-type, x-client-ip, x-internal-call-secret",
  };
  if (origin && allowedOrigins().includes(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
  }
  return headers;
}

// Returns a 204 preflight response for OPTIONS, or null for the handler to continue.
export function handleCors(req: Request): Response | null {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(req.headers.get("Origin")) });
  }
  return null;
}
