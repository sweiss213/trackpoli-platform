#!/usr/bin/env node
/**
 * check-lighthouse — the NFR-P1 performance gate for the admin shell (TP1-07, P1-12).
 *
 * NFR-P1: "Shell loads and is interactive in 2.5 seconds or less on a mid-range laptop on broadband (LCP)."
 * This runs Lighthouse against the shell and fails if Largest Contentful Paint exceeds the budget (or the
 * overall performance score / Total Blocking Time are below their floors). It writes the full result to
 * reports/lighthouse-results.json.
 *
 * Like the axe gate (run-axe.mjs), it is NOT dependency-free and does NOT run in the dependency-free CI: it
 * needs `lighthouse` + `chrome-launcher` and a RUNNING app. The shell demo is gated off in a normal prod
 * build, so build/start the measurement target with the gallery enabled first:
 *
 *   npm i -D lighthouse chrome-launcher          # already in devDependencies
 *   NEXT_PUBLIC_ENABLE_GALLERY=1 npm run build
 *   NEXT_PUBLIC_ENABLE_GALLERY=1 npm run start & # serve the production build on :3000
 *   node scripts/check-lighthouse.mjs --config lighthouse.config.json --out reports/lighthouse-results.json
 *
 * The imports are dynamic so this file parses even where lighthouse is not installed (so it can live in the
 * repo alongside the committed config). Exit 0 = every page within budget; 1 = a budget breach; 2 = usage /
 * environment error (fail closed).
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

function die(code, msg) {
  console.error(`check-lighthouse: ${msg}`);
  process.exit(code);
}
function opt(name, def) {
  const i = process.argv.indexOf(name);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : def;
}

const CONFIG = resolve(opt("--config", "lighthouse.config.json"));
const OUT = resolve(opt("--out", "reports/lighthouse-results.json"));

let cfg;
try {
  cfg = JSON.parse(readFileSync(CONFIG, "utf8"));
} catch (e) {
  die(2, `cannot read config ${CONFIG}: ${e.message}`);
}
const baseUrl = (cfg.baseUrl || "http://localhost:3000").replace(/\/$/, "");
const pages = Array.isArray(cfg.pages) && cfg.pages.length ? cfg.pages : die(2, "config.pages must be a non-empty array");
const budgets = cfg.budgets || {};
const lcpMs = Number(budgets.lcpMs ?? 2500);
const tbtMs = budgets.tbtMs == null ? null : Number(budgets.tbtMs);
const perfScore = budgets.perfScore == null ? null : Number(budgets.perfScore);
const formFactor = cfg.formFactor === "mobile" ? "mobile" : "desktop";

let lighthouse, chromeLauncher;
try {
  ({ default: lighthouse } = await import("lighthouse"));
  chromeLauncher = await import("chrome-launcher");
} catch (e) {
  die(2, `lighthouse + chrome-launcher are required but not importable (${e.message}). Install the devDependencies and run against a started app.`);
}

const chrome = await chromeLauncher.launch({ chromeFlags: ["--headless=new", "--no-sandbox", "--disable-gpu"] });
const base = {
  logLevel: "error",
  output: "json",
  onlyCategories: ["performance"],
  port: chrome.port,
  formFactor,
  screenEmulation:
    formFactor === "desktop"
      ? { mobile: false, width: 1350, height: 940, deviceScaleFactor: 1, disabled: false }
      : undefined,
};

const results = [];
const failures = [];
try {
  for (const page of pages) {
    const url = page.startsWith("http") ? page : `${baseUrl}${page}`;
    const run = await lighthouse(url, base);
    const lhr = run.lhr;
    const lcp = lhr.audits["largest-contentful-paint"]?.numericValue ?? null;
    const tbt = lhr.audits["total-blocking-time"]?.numericValue ?? null;
    const score = lhr.categories.performance?.score ?? null;
    results.push({ url, lcpMs: lcp, tbtMs: tbt, perfScore: score });

    if (lcp != null && lcp > lcpMs) failures.push(`${url}: LCP ${Math.round(lcp)}ms > budget ${lcpMs}ms (NFR-P1)`);
    if (tbtMs != null && tbt != null && tbt > tbtMs) failures.push(`${url}: TBT ${Math.round(tbt)}ms > budget ${tbtMs}ms`);
    if (perfScore != null && score != null && score < perfScore)
      failures.push(`${url}: performance score ${score.toFixed(2)} < floor ${perfScore}`);
  }
} finally {
  await chrome.kill();
}

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify({ config: { baseUrl, budgets, formFactor }, results }, null, 2) + "\n");

for (const r of results) {
  console.log(`  ${r.url}  LCP=${r.lcpMs == null ? "n/a" : Math.round(r.lcpMs) + "ms"}  TBT=${r.tbtMs == null ? "n/a" : Math.round(r.tbtMs) + "ms"}  perf=${r.perfScore == null ? "n/a" : r.perfScore.toFixed(2)}`);
}
if (failures.length) {
  console.error(`\ncheck-lighthouse - FAIL (${failures.length}):`);
  for (const f of failures) console.error(`  • ${f}`);
  process.exit(1);
}
console.log(`\ncheck-lighthouse - PASS. ${results.length} page(s) within budget (LCP <= ${lcpMs}ms, NFR-P1). Report: ${OUT}`);
