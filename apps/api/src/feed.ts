import { createHash } from "node:crypto";
import { Connection, PublicKey } from "@solana/web3.js";
import { env } from "./config.ts";
import { sql } from "./db.ts";

export type FeedRecord = {
  token: string;
  destination: string;
  ratio: string | null;
  deadline: string;
  event_type: string;
  lockup: string | null;
  issuer_powers: Record<string, unknown>;
  source_url: string;
  source_hash: string;
  fetched_at: string;
  verification_state: "verified" | "unverified" | "stale";
};

function sha256(bytes: Buffer | string): string {
  return createHash("sha256").update(bytes).digest("hex");
}

export async function fetchMintParsed(mint: string) {
  const connection = new Connection(env.solanaRpc, "confirmed");
  const info = await connection.getParsedAccountInfo(new PublicKey(mint));
  if (!info.value) throw new Error(`mint missing: ${mint}`);
  return info.value;
}

export async function refreshFeed(): Promise<FeedRecord> {
  const fetchedAt = new Date();
  const [metricsRes, pageRes, mint] = await Promise.all([
    fetch(env.prestocksMetricsUrl, { headers: { accept: "application/json" } }),
    fetch("https://prestocks.com/spacex", { headers: { accept: "text/html" } }),
    fetchMintParsed(env.spacexMint),
  ]);
  const metricsText = await metricsRes.text();
  const pageText = await pageRes.text();
  if (!metricsRes.ok) {
    throw new Error(`metrics HTTP ${metricsRes.status}`);
  }
  const metrics = JSON.parse(metricsText) as Record<string, unknown>;
  const parsed = mint.data;
  if (!("parsed" in parsed)) throw new Error("mint not jsonParsed");
  const extensions = (parsed.parsed as { info?: { extensions?: unknown[] } }).info
    ?.extensions;
  const sourceMaterial = JSON.stringify({
    metrics,
    mintOwner: mint.owner.toBase58(),
    extensions,
  });
  const sourceHash = sha256(sourceMaterial);
  const pageHash = sha256(pageText);
  const verification =
    metricsRes.ok && pageRes.ok ? "verified" : "unverified";
  const payload: FeedRecord = {
    token: env.spacexMint,
    destination: env.spcxxMint,
    ratio: null,
    deadline: "2027-03-12T23:59:00.000Z",
    event_type: "prestock_lifecycle",
    lockup: null,
    issuer_powers: {
      mint_owner: mint.owner.toBase58(),
      extensions,
      page_sha256: pageHash,
      metrics_http: metricsRes.status,
      page_http: pageRes.status,
    },
    source_url: env.prestocksMetricsUrl,
    source_hash: sourceHash,
    fetched_at: fetchedAt.toISOString(),
    verification_state: verification,
  };
  await sql`
    insert into feed_snapshots (
      token_symbol, payload, source_url, source_sha256, fetched_at, verification_state
    ) values (
      ${"SPACEX"},
      ${sql.json(payload as never)},
      ${payload.source_url},
      ${payload.source_hash},
      ${fetchedAt},
      ${payload.verification_state}
    )
  `;
  return payload;
}

export async function latestFeed(): Promise<FeedRecord | null> {
  const rows = await sql<{ payload: FeedRecord; fetched_at: Date }[]>`
    select payload, fetched_at from feed_snapshots
    order by fetched_at desc
    limit 1
  `;
  if (!rows[0]) return null;
  const rec = rows[0].payload;
  const age = Date.now() - new Date(rows[0].fetched_at).getTime();
  if (age > env.feedStaleMs) {
    return { ...rec, verification_state: "stale" };
  }
  return rec;
}
