#!/usr/bin/env node
// Bundle-size gate (TP1-02). Caps the FIRST-LOAD client JavaScript every route ships, so a heavy
// dependency or an accidental client import that bloats the admin app is caught in CI rather than in
// users' browsers. Measured from Next's build-manifest (main + polyfill + per-route chunks), which
// EXCLUDES on-demand dynamic imports (e.g. Sentry, which loads only when a DSN is configured). Coarse
// Phase-1 backstop; P1-12 can refine to per-route reporting. Run after `npm run build`.

import { readFileSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { join } from "node:path";

// Path + budget are overridable via env so the gate is testable against fixtures (it must provably detect
// an over-budget bundle, per verifiable-quality-gates); defaults are the real build output and budget.
const MANIFEST = process.env.BUNDLE_MANIFEST ?? ".next/build-manifest.json";
const MANIFEST_DIR = process.env.BUNDLE_DIR ?? ".next";
// Gzipped first-load client JS budget. Baseline ~168 KB (React 19 + Next runtime + the sign-in screen);
// headroom left for Phase-1 growth. Lower it (and split per-route) when the app shell lands in P1-12.
const BUDGET_KB = Number(process.env.BUNDLE_BUDGET_KB ?? 260);

let manifest;
try {
  manifest = JSON.parse(readFileSync(MANIFEST, "utf8"));
} catch {
  console.error(`[check-bundle-size] FAIL - ${MANIFEST} not found. Run 'npm run build' first.`);
  process.exit(1);
}

const files = new Set();
const add = (arr) => {
  for (const f of arr ?? []) if (f.endsWith(".js")) files.add(f);
};
add(manifest.rootMainFiles);
add(manifest.polyfillFiles);
for (const route of Object.keys(manifest.pages ?? {})) add(manifest.pages[route]);

let total = 0;
for (const f of files) {
  total += gzipSync(readFileSync(join(MANIFEST_DIR, f))).length;
}
const kb = total / 1024;
console.log(
  `[check-bundle-size] first-load client JS (gzip): ${kb.toFixed(1)} KB across ${files.size} chunk(s); budget ${BUDGET_KB} KB.`,
);
if (kb > BUDGET_KB) {
  console.error(`[check-bundle-size] FAIL - over budget by ${(kb - BUDGET_KB).toFixed(1)} KB.`);
  process.exit(1);
}
console.log("[check-bundle-size] OK");
