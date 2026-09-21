import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(process.cwd());
const frontend = join(root, "FRONTEND");
if (!existsSync(frontend)) {
  console.log("FRONTEND_ABSENT");
  process.exit(0);
}

const hits = [];
function walk(dir) {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === "dist" || name === ".git") continue;
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) {
      walk(full);
      continue;
    }
    if (!/\.(ts|tsx|js|jsx)$/.test(name)) continue;
    const text = readFileSync(full, "utf8");
    if (/\b(mock|fake|dummy|simulateSuccess)\b/i.test(text) && /from\s+['"]/.test(text)) {
      hits.push(full.slice(root.length + 1));
    }
  }
}
walk(frontend);
if (hits.length) {
  console.error("FRONTEND_MOCK_IMPORTS", hits);
  process.exit(1);
}
console.log("FRONTEND_NO_MOCK_IMPORTS");
