// Discriminating tests for scripts/check-design-system.mjs (the TR-4 design-system enforcement gate).
// verifiable-quality-gates requires every automated check ship a test that FAILS when the check is
// neutralized. These prove the gate actually detects each violation class in CHANGED feature code while
// (a) allowing the same thing inside src/components/ui/ (the primitive layer), (b) NOT flagging
// pre-existing debt in files the change does not touch (changed-files scope), and (c) failing closed on
// bad input. A no-op "always pass" gate would turn every red-on-violation test below green, so they are
// the mutation guard: neutralise any rule and its test fails.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const CHECK = resolve(REPO, "scripts/check-design-system.mjs");

// Build a temp repo root, write the given files (relative path -> content), and return the root.
function fixture(files) {
  const dir = mkdtempSync(join(tmpdir(), "ds-gate-"));
  for (const [rel, content] of Object.entries(files)) {
    const abs = join(dir, rel);
    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, content);
  }
  return dir;
}
function run(dir, changedList, addedList) {
  const args = [CHECK, "--root", dir, "--changed-list", changedList];
  if (addedList !== undefined) args.push("--added-list", addedList);
  const r = spawnSync(process.execPath, args, { encoding: "utf8" });
  return { status: r.status, out: (r.stdout || "") + (r.stderr || "") };
}
const RAW = 'export default function P(){return <button type="button">Go</button>;}\n';
const COMPLIANT = 'import { Button } from "@/components/ui/button";\nexport default function P(){return <Button>Go</Button>;}\n';

// --- raw-control -------------------------------------------------------------------------------------
test("raw <button> in a CHANGED feature file -> FAIL, naming the file and the @/components/ui replacement", () => {
  const dir = fixture({ "src/features/profile/Profile.tsx": RAW });
  const r = run(dir, "src/features/profile/Profile.tsx");
  assert.equal(r.status, 1, r.out);
  assert.match(r.out, /raw-control/);
  assert.match(r.out, /Profile\.tsx/);
  assert.match(r.out, /@\/components\/ui\/button/);
});

test("the SAME raw <button> inside src/components/ui/ PASSES (that layer defines the primitives)", () => {
  const dir = fixture({ "src/components/ui/button.tsx": RAW });
  assert.equal(run(dir, "src/components/ui/button.tsx").status, 0);
});

test("a compliant feature file using @/components/ui/* PASSES", () => {
  const dir = fixture({ "src/features/profile/Profile.tsx": COMPLIANT });
  assert.equal(run(dir, "src/features/profile/Profile.tsx").status, 0);
});

test("raw <input>, <select>, <textarea> are each caught", () => {
  const dir = fixture({
    "src/features/a/A.tsx": "export const A=()=><input name='x'/>;\n",
    "src/features/b/B.tsx": "export const B=()=><select><option/></select>;\n",
    "src/features/c/C.tsx": "export const C=()=><textarea/>;\n",
  });
  for (const f of ["src/features/a/A.tsx", "src/features/b/B.tsx", "src/features/c/C.tsx"]) {
    assert.equal(run(dir, f).status, 1, f);
  }
});

// --- ui-css-module -----------------------------------------------------------------------------------
test("a NEWLY ADDED *.module.css in feature code -> FAIL", () => {
  const dir = fixture({ "src/features/profile/Profile.module.css": ".x{display:block}\n" });
  const r = run(dir, "src/features/profile/Profile.module.css", "src/features/profile/Profile.module.css");
  assert.equal(r.status, 1, r.out);
  assert.match(r.out, /ui-css-module/);
});

test("a MODIFIED (not added) *.module.css PASSES - the gate bites only NEW module stylesheets", () => {
  const dir = fixture({ "src/features/profile/Profile.module.css": ".x{display:block}\n" });
  // changed but NOT in the added list
  assert.equal(run(dir, "src/features/profile/Profile.module.css", "").status, 0);
});

test("a *.module.css inside src/components/ui/ PASSES even when added", () => {
  const dir = fixture({ "src/components/ui/button.module.css": ".x{display:block}\n" });
  assert.equal(run(dir, "src/components/ui/button.module.css", "src/components/ui/button.module.css").status, 0);
});

// --- color-literal -----------------------------------------------------------------------------------
test("a hex colour literal in a changed feature file -> FAIL", () => {
  const dir = fixture({ "src/features/profile/Profile.tsx": "export const s={color:'#ff0000'};\n" });
  const r = run(dir, "src/features/profile/Profile.tsx");
  assert.equal(r.status, 1, r.out);
  assert.match(r.out, /color-literal/);
});

test("an rgb()/hsl() colour literal in a changed .css file -> FAIL", () => {
  const dir = fixture({ "src/features/x/x.css": ".a{color:rgb(1,2,3)} .b{background:hsl(0,0%,0%)}\n" });
  const r = run(dir, "src/features/x/x.css");
  assert.equal(r.status, 1, r.out);
  assert.match(r.out, /color-literal/);
});

test("hex in src/styles/tokens.css PASSES (the one sanctioned home for colour)", () => {
  const dir = fixture({ "src/styles/tokens.css": ":root{--md-primary:#000000}\n" });
  assert.equal(run(dir, "src/styles/tokens.css").status, 0);
});

test("hex inside src/components/ui/ PASSES (primitive layer)", () => {
  const dir = fixture({ "src/components/ui/button.tsx": "export const s={color:'#111'};\n" });
  assert.equal(run(dir, "src/components/ui/button.tsx").status, 0);
});

test("a colour literal in a .ts file (not just tsx/css) is caught", () => {
  const dir = fixture({ "src/lib/colors.ts": "export const danger='#b3261e';\n" });
  const r = run(dir, "src/lib/colors.ts");
  assert.equal(r.status, 1, r.out);
  assert.match(r.out, /color-literal/);
});

test("a colour JSX attribute (fill=\"#fff\") is caught", () => {
  const dir = fixture({ "src/features/x/Icon.tsx": 'export const I=()=><svg fill="#ffffff"/>;\n' });
  assert.equal(run(dir, "src/features/x/Icon.tsx").status, 1);
});

test("NO false positive: an issue-ref comment (#123) and an in-page anchor (href=\"#dad\")", () => {
  const dir = fixture({
    "src/features/x/A.tsx": '// fixes #123 and #abc\nexport const A=()=><a href="#dad">x</a>;\n',
  });
  const r = run(dir, "src/features/x/A.tsx");
  assert.equal(r.status, 0, r.out);
});

test("NO false positive: a function or identifier merely NAMED rgb(...)", () => {
  const dir = fixture({ "src/lib/rgb.ts": "export function rgb(a){return a;}\n" });
  assert.equal(run(dir, "src/lib/rgb.ts").status, 0);
});

// --- changed-files scope: pre-existing debt in UNCHANGED files is not blocked ------------------------
test("pre-existing raw controls in an UNCHANGED file do NOT fail the gate (changed-files scope)", () => {
  // The repo-like file has raw buttons, but it is NOT in the changed list; a sibling service file is.
  const dir = fixture({
    "src/features/auth/MfaEnrolPage.tsx": "export const M=()=><div><button/><button/></div>;\n",
    "src/services/ranking.service.ts": "export const rank=(x)=>x;\n",
  });
  const r = run(dir, "src/services/ranking.service.ts");
  assert.equal(r.status, 0, r.out);
});

test("a PR that changes only a service file (no UI) PASSES", () => {
  const dir = fixture({ "src/services/ranking.service.ts": "export const rank=(x)=>x;\n" });
  assert.equal(run(dir, "src/services/ranking.service.ts").status, 0);
});

// --- waivers: the only bypass, expiring ---------------------------------------------------------------
test("a valid unexpired waiver suppresses the violation -> PASS", () => {
  const dir = fixture({
    "src/features/profile/Profile.tsx": RAW,
    "design-system-gate.waivers.json": JSON.stringify([
      { rule: "raw-control", path: "src/features/profile/Profile.tsx", reason: "transitional; migrated in PR 5", approvedBy: "mdenner", expires: "2999-01-01" },
    ]),
  });
  assert.equal(run(dir, "src/features/profile/Profile.tsx").status, 0);
});

test("an EXPIRED waiver does not count -> FAIL", () => {
  const dir = fixture({
    "src/features/profile/Profile.tsx": RAW,
    "design-system-gate.waivers.json": JSON.stringify([
      { rule: "raw-control", path: "src/features/profile/Profile.tsx", reason: "stale", approvedBy: "x", expires: "2000-01-01" },
    ]),
  });
  assert.equal(run(dir, "src/features/profile/Profile.tsx").status, 1);
});

test("a waiver with an unparseable expires date -> exit 2 (fail closed, never a permanent waiver)", () => {
  const dir = fixture({
    "src/features/profile/Profile.tsx": RAW,
    "design-system-gate.waivers.json": JSON.stringify([
      { rule: "raw-control", path: "src/features/profile/Profile.tsx", reason: "x", approvedBy: "x", expires: "whenever" },
    ]),
  });
  assert.equal(run(dir, "src/features/profile/Profile.tsx").status, 2);
});

// --- fail closed -------------------------------------------------------------------------------------
test("missing --changed-list -> exit 2", () => {
  const dir = fixture({});
  const r = spawnSync(process.execPath, [CHECK, "--root", dir], { encoding: "utf8" });
  assert.equal(r.status, 2);
});

test("empty --changed-list -> exit 2", () => {
  const dir = fixture({});
  assert.equal(run(dir, "").status, 2);
});

// cleanup is best-effort; the OS tmpdir is reclaimed. Remove one to exercise the path.
test("cleanup", () => { try { rmSync(mkdtempSync(join(tmpdir(), "ds-gate-rm-")), { recursive: true, force: true }); } catch { /* ignore */ } });
