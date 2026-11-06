// Discriminating tests for scripts/check-bundle-size.mjs (the TP1-02 first-load JS budget gate).
// verifiable-quality-gates requires every automated check ship a test that FAILS when the check is
// neutralized. These prove the gate actually detects an over-budget bundle: the SAME fixture bundle
// PASSES under a generous budget and FAILS under a tight one (so a no-op "always pass" gate would fail
// the over-budget case), only .js first-load chunks are counted, and a missing manifest fails closed.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, mkdirSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { tmpdir } from "node:os";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const CHECK = resolve(REPO, "scripts/check-bundle-size.mjs");

// Build a fake .next dir: a manifest listing `chunks` (as first-load .js) plus any `extra` non-chunk
// entries, with each chunk filled with random (incompressible) bytes so gzip size is predictable.
function fixture({ chunkBytes = 4096, extra = [] } = {}) {
  const dir = mkdtempSync(join(tmpdir(), "bundle-"));
  mkdirSync(join(dir, "static"), { recursive: true });
  const chunk = "static/chunk.js";
  writeFileSync(join(dir, chunk), randomBytes(chunkBytes));
  for (const e of extra) writeFileSync(join(dir, e), randomBytes(chunkBytes));
  const manifest = {
    rootMainFiles: [chunk, ...extra],
    polyfillFiles: [],
    pages: { "/": [chunk], "/sign-in": [chunk] },
  };
  writeFileSync(join(dir, "build-manifest.json"), JSON.stringify(manifest));
  return dir;
}

function run(dir, budgetKb) {
  const r = spawnSync(process.execPath, [CHECK], {
    encoding: "utf8",
    env: {
      ...process.env,
      BUNDLE_DIR: dir,
      BUNDLE_MANIFEST: join(dir, "build-manifest.json"),
      BUNDLE_BUDGET_KB: String(budgetKb),
    },
  });
  return { status: r.status, out: (r.stdout || "") + (r.stderr || "") };
}

test("PASSES when the first-load bundle is under budget", () => {
  const dir = fixture();
  assert.equal(run(dir, 1000).status, 0, run(dir, 1000).out);
});

test("FAILS when the SAME bundle is over a tight budget (discriminating — a no-op gate would pass here)", () => {
  const dir = fixture();
  const r = run(dir, 1); // the random 4 KB chunk cannot gzip under 1 KB
  assert.equal(r.status, 1, r.out);
  assert.match(r.out, /over budget/);
});

test("counts only .js first-load chunks: a non-.js entry does not inflate the total", () => {
  // Same .js chunk, but add a big .css sibling to the manifest arrays. It must be ignored, so a budget
  // that fits the single .js chunk still PASSES despite the extra file on disk.
  const dir = fixture({ chunkBytes: 2048, extra: ["static/app.css"] });
  assert.equal(run(dir, 1000).status, 0, run(dir, 1000).out);
});

test("fails closed (exit 1) when the manifest is missing", () => {
  const dir = mkdtempSync(join(tmpdir(), "bundle-empty-"));
  const r = run(dir, 1000); // no build-manifest.json written
  assert.equal(r.status, 1, r.out);
  assert.match(r.out, /not found/);
});
