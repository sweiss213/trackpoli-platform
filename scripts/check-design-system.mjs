#!/usr/bin/env node
/**
 * check-design-system.mjs - the design-system enforcement gate (TR-4, implements ADR-0011 D4).
 *
 * A mechanical, FAIL-CLOSED gate that blocks a PR when NEWLY CHANGED feature code bypasses the shadcn/ui
 * design system. It scans CHANGED FILES ONLY (never the whole tree): the repo already carries pre-existing
 * raw <button> and CSS-Module usage in src/features (e.g. MfaEnrolPage, TwoFactorCard), and that debt is
 * retired by the screen-by-screen migration PRs, not by this gate. A full-tree scan would fail immediately
 * on that pre-existing code; this gate bites only what a PR changes, so it catches NEW drift without
 * demanding an upfront cleanup. This is the arch-gate --changed ratchet, scoped to the design system.
 *
 *   node scripts/check-design-system.mjs --changed-list a.tsx,b.css [--added-list a.module.css]
 *   node scripts/check-design-system.mjs --changed            # derive the lists from git (local)
 *   node scripts/check-design-system.mjs --changed-list ... --root <dir>   # scan under <dir> (tests)
 *
 * It fails when, in a CHANGED file under src/ and OUTSIDE src/components/ui/ (the layer that DEFINES the
 * primitives, where raw elements and colour are allowed):
 *   - raw-control : a raw interactive element (<button> <input> <select> <textarea>) is used directly
 *                   instead of the @/components/ui/* equivalent;
 *   - ui-css-module : a new *.module.css is ADDED (the CSS-Module path is retired for components);
 *   - color-literal : a hex or rgb()/hsl() colour literal appears outside src/styles/tokens.css
 *                     (extends the decisions.md "no colour literal outside the token file" rule).
 *
 * The only bypass is an explicit, expiring waiver in design-system-gate.waivers.json (same shape as
 * arch-gate's), for a transitional PR that must touch a not-yet-migrated file. The ratchet only tightens.
 *
 * Exit 0 = clean. Exit 1 = a design-system violation. Exit 2 = fail closed (bad usage/config/waiver).
 * Zero dependencies, offline.
 */
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const args = process.argv.slice(2);
const hasFlag = (n) => args.includes(n);
const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 && args[i + 1] !== undefined ? args[i + 1] : d; };
const die2 = (m) => { console.error(`check-design-system: ${m}`); process.exit(2); };

const ROOT = path.resolve(opt("--root", process.cwd()));
const UI_LAYER = "src/components/ui/";
const toPosix = (p) => String(p).split("\\").join("/");
const parseList = (s) => (s == null ? [] : String(s).split(",").map((x) => toPosix(x.trim())).filter(Boolean));

// --- resolve the changed / added file sets -------------------------------------------------------------
function sh(cmd) { return execSync(cmd, { cwd: ROOT, encoding: "utf8", stdio: ["pipe", "pipe", "ignore"] }).trim(); }
function gitBase() {
  for (const b of ["origin/main", "main", "origin/master", "master"]) {
    try { const base = sh(`git merge-base HEAD ${b}`); if (base) return base; } catch { /* try next */ }
  }
  return null;
}
function fromGit(filter) {
  const base = gitBase();
  const out = new Set();
  const add = (s) => s.split("\n").forEach((f) => f && out.add(toPosix(f)));
  if (base) { try { add(sh(`git diff --name-only --diff-filter=${filter} ${base}...HEAD`)); } catch { /* ignore */ } }
  if (filter === "ACMR") { try { add(sh("git diff --name-only HEAD")); } catch { /* ignore */ } }
  return [...out];
}

const changedProvided = hasFlag("--changed-list");
const useGit = hasFlag("--changed");
if (!changedProvided && !useGit) die2("no --changed-list (or --changed) given: the files this change touches; fail closed.");
const changed = changedProvided ? parseList(opt("--changed-list", null)) : fromGit("ACMR");
const added = hasFlag("--added-list") ? parseList(opt("--added-list", null)) : (useGit ? fromGit("A") : []);
if (changedProvided && changed.length === 0) die2("--changed-list is empty (fail closed): a change that touches nothing cannot be evaluated.");
const addedSet = new Set(added);

// --- waivers: explicit, attributed, EXPIRING (the only bypass; same contract as arch-gate) -------------
const WAIVERS_PATH = path.resolve(ROOT, opt("--waivers", "design-system-gate.waivers.json"));
let waivers = [];
if (fs.existsSync(WAIVERS_PATH)) {
  try { waivers = JSON.parse(fs.readFileSync(WAIVERS_PATH, "utf8")); } catch (e) { die2(`cannot read waivers ${path.basename(WAIVERS_PATH)}: ${e.message}`); }
  if (!Array.isArray(waivers)) die2(`${path.basename(WAIVERS_PATH)} must be a JSON array of waivers.`);
  for (const [i, w] of waivers.entries()) {
    const missing = ["rule", "reason", "approvedBy", "expires"].filter((k) => !w || !w[k]);
    if (missing.length) die2(`waiver #${i} is missing required field(s): ${missing.join(", ")} (fail closed).`);
    if (Number.isNaN(new Date(w.expires).getTime())) die2(`waiver #${i} has an unparseable "expires" (${w.expires}); fail closed.`);
  }
}
const isWaived = (rule, file) => waivers.some((w) =>
  w.rule === rule && new Date(w.expires) >= new Date() && (!w.path || toPosix(w.path) === file));

// --- rules ---------------------------------------------------------------------------------------------
const inScope = (f) => f.startsWith("src/") && !f.startsWith(UI_LAYER) &&
  !/\.(test|spec)\.[tj]sx?$/.test(f) && !/(^|\/)__tests__\//.test(f);
const REPLACEMENT = { button: "@/components/ui/button", input: "@/components/ui/input", select: "@/components/ui/select", textarea: "@/components/ui/textarea" };
const RAW_CONTROL = /<(button|input|select|textarea)(\s|>|\/)/g;
const HEX_BODY = "#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})";
// In .css a colour hex is unquoted (`color:#fff`). In .ts/.tsx it is a quoted string literal
// (`'#fff'`, `fill="#fff"`): matching only quoted hex avoids flagging issue refs (`// fixes #123`),
// private fields (`this.#fade`), and in-page anchors - the last are then filtered by URL_ATTR below.
const CSS_HEX = new RegExp(HEX_BODY + "\\b", "g");
const QUOTED_HEX = new RegExp("(['\"`])" + HEX_BODY + "\\1", "g");
// rgb(/hsl( followed by a value char, so a function merely NAMED rgb(a) is not a colour literal.
const COLOR_FN = /\b(?:rgb|rgba|hsl|hsla)\(\s*[\d.]/g;
// A quoted hex right after a URL-ish attribute is a fragment link (href="#dad"), not a colour.
const URL_ATTR = /\b(?:href|src|to|cite|poster|action|formaction|xlinkHref)=\s*$/i;

const lineOf = (content, index) => content.slice(0, index).split("\n").length;
const violations = [];
function record(rule, file, line, snippet, fix) {
  if (isWaived(rule, file)) return;
  violations.push({ rule, file, line, snippet: snippet.replace(/\s+/g, " ").trim().slice(0, 90), fix });
}

for (const file of changed) {
  if (!inScope(file)) continue;

  // ui-css-module: a NEWLY ADDED *.module.css for a component (whole-file; no line).
  if (/\.module\.css$/.test(file)) {
    if (addedSet.has(file)) record("ui-css-module", file, 1, file,
      "style components with the design system (Tailwind utilities on shadcn/ui primitives), not a new CSS Module");
    continue; // a .module.css carries no JSX controls; colour in it is caught below only for non-module css
  }

  const abs = path.join(ROOT, file);
  let content;
  // A diff lists deleted/renamed-away files too; ENOENT means "gone, nothing to scan". Any OTHER read
  // error (permissions, encoding) must NOT silently skip enforcement on a changed file - fail closed.
  try { content = fs.readFileSync(abs, "utf8"); }
  catch (e) { if (e.code === "ENOENT") continue; die2(`cannot read changed file ${file}: ${e.message} (fail closed).`); }

  // raw-control: only JSX files.
  if (/\.[jt]sx$/.test(file)) {
    let m;
    RAW_CONTROL.lastIndex = 0;
    while ((m = RAW_CONTROL.exec(content))) {
      const el = m[1];
      record("raw-control", file, lineOf(content, m.index), m[0],
        `use ${REPLACEMENT[el]} instead of a raw <${el}>`);
      if (m.index === RAW_CONTROL.lastIndex) RAW_CONTROL.lastIndex++;
    }
  }

  // color-literal: css + every script file (ts/tsx/js/jsx - a colour constant in a .ts theme file is
  // just as much a literal outside the token file), excluding the token file itself.
  const isCss = /\.css$/.test(file);
  if ((isCss || /\.[jt]sx?$/.test(file)) && file !== "src/styles/tokens.css") {
    const fix = "colour literals live only in src/styles/tokens.css (decisions.md); use a semantic token / Tailwind colour utility";
    for (const re of [isCss ? CSS_HEX : QUOTED_HEX, COLOR_FN]) {
      let m;
      re.lastIndex = 0;
      while ((m = re.exec(content))) {
        // A quoted hex right after href=/src=/... is a fragment link, not a colour.
        if (re === QUOTED_HEX && URL_ATTR.test(content.slice(Math.max(0, m.index - 16), m.index))) {
          if (m.index === re.lastIndex) re.lastIndex++;
          continue;
        }
        record("color-literal", file, lineOf(content, m.index), m[0], fix);
        if (m.index === re.lastIndex) re.lastIndex++;
      }
    }
  }
}

// --- report --------------------------------------------------------------------------------------------
const scanned = changed.filter(inScope).length;
if (violations.length === 0) {
  console.log(`[check-design-system] OK - ${scanned} in-scope changed file(s) scanned; no design-system violations (pre-existing debt in unchanged files is not scanned).`);
  process.exit(0);
}
const byRule = new Map();
for (const v of violations) { if (!byRule.has(v.rule)) byRule.set(v.rule, []); byRule.get(v.rule).push(v); }
console.error(`\n[check-design-system] FAIL - ${violations.length} design-system violation(s) in changed feature code:\n`);
for (const [rule, list] of byRule) {
  console.error(`  x ${rule} (${list.length})`);
  for (const v of list.slice(0, 20)) console.error(`      ${v.file}:${v.line}  ${v.snippet}  -> ${v.fix}`);
  if (list.length > 20) console.error(`      ...and ${list.length - 20} more`);
}
console.error(`\nFix them in src/components/ui/ via the design system, or add an explicit expiring waiver to design-system-gate.waivers.json.\n`);
process.exit(1);
