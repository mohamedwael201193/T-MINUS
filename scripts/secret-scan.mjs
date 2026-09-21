#!/usr/bin/env node
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const root = process.cwd();
const banned = [
  /ghp_[A-Za-z0-9]{20,}/,
  /github_pat_[A-Za-z0-9_]{20,}/,
  /vcp_[A-Za-z0-9]{20,}/,
  /rnd_[A-Za-z0-9]{20,}/,
  /sk-(?:live|test)-[A-Za-z0-9]+/,
  /-----BEGIN (?:RSA |OPENSSH )?PRIVATE KEY-----/,
  /xox[baprs]-[A-Za-z0-9-]+/,
];

const skipDir = new Set([
  ".git",
  "node_modules",
  "target",
  ".anchor",
  "test-ledger",
  "dist",
  "FRONTEND",
  ".next",
  ".turbo",
  ".cache",
  "coverage",
]);

function walk(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    if (skipDir.has(name)) continue;
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, acc);
    else acc.push(p);
  }
  return acc;
}

const files = walk(root).filter((p) => {
  const rel = relative(root, p).replaceAll("\\", "/");
  if (rel === ".env" || rel.startsWith(".env.")) return false;
  if (rel.endsWith(".json") && rel.includes("keys")) return false;
  return true;
});

let hits = 0;
for (const file of files) {
  let text;
  try {
    text = readFileSync(file, "utf8");
  } catch {
    continue;
  }
  for (const re of banned) {
    if (re.test(text)) {
      console.error(`secret_pattern ${relative(root, file)} ${re}`);
      hits += 1;
    }
  }
}

if (hits > 0) {
  console.error(`secret-scan FAIL hits=${hits}`);
  process.exit(1);
}
console.log(`secret-scan PASS files=${files.length}`);
