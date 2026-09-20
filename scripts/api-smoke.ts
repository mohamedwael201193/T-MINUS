import { createServer } from "../apps/api/src/server.ts";
import { migrate } from "../apps/api/src/migrate.ts";
import { refreshFeed } from "../apps/api/src/feed.ts";

async function main() {
  await migrate();
  try {
    await refreshFeed();
  } catch (err) {
    console.error("feed_bootstrap_failed", err instanceof Error ? err.message : "unknown");
  }

  const server = createServer();
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const addr = server.address();
  if (!addr || typeof addr === "string") throw new Error("no_port");
  const base = `http://127.0.0.1:${addr.port}`;
  const paths = ["/health", "/ready", "/v1/feed", "/v1/keeper", "/v1/receipts", "/v1/quote?amount=200000000"];
  const out: Record<string, { status: number; snippet: string }> = {};
  for (const p of paths) {
    const res = await fetch(base + p);
    const text = await res.text();
    out[p] = { status: res.status, snippet: text.slice(0, 240) };
  }
  await new Promise<void>((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
  console.log(JSON.stringify({ label: "LOCAL", out }, null, 2));
  const bad = Object.values(out).some((r) => r.status >= 500);
  if (bad) process.exit(1);
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
