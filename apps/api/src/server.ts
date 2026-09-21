import http from "node:http";
import { Connection, PublicKey } from "@solana/web3.js";
import { PROGRAM_ID, decodeOrder } from "@tminus/sdk";
import { env } from "./config.ts";
import { sql } from "./db.ts";
import { latestFeed, refreshFeed } from "./feed.ts";
import { declaredProgramId, readProgramStatus, rpcForCluster, type ClusterName } from "./program-status.ts";

const started = Date.now();

type Health = {
  ok: boolean;
  service: "tminus-api";
  uptime_ms: number;
};

async function jupiterQuote(amount: string) {
  const url =
    `${env.jupiterLiteBase}/swap/v1/quote?` +
    new URLSearchParams({
      inputMint: env.spacexMint,
      outputMint: env.spcxxMint,
      amount,
      slippageBps: "50",
    });
  const headers: Record<string, string> = { accept: "application/json" };
  if (env.jupiterApiKey) headers["x-api-key"] = env.jupiterApiKey;
  const res = await fetch(url, { headers });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`jupiter quote HTTP ${res.status}`);
  }
  return JSON.parse(text) as Record<string, unknown>;
}

async function readJson(req: http.IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const c of req) chunks.push(c as Buffer);
  if (chunks.length === 0) return null;
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function send(res: http.ServerResponse, status: number, body: unknown, extra: Record<string, string> = {}) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": extra["cache-control"] ?? "no-store",
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET,OPTIONS",
    "access-control-allow-headers": "content-type",
    ...extra,
  });
  res.end(payload);
}

export function createServer() {
  return http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url ?? "/", "http://localhost");
      if (req.method === "OPTIONS") {
        send(res, 204, {});
        return;
      }
      if (req.method !== "GET") {
        send(res, 405, { error: "method_not_allowed" });
        return;
      }
      if (url.pathname === "/health") {
        const body: Health = {
          ok: true,
          service: "tminus-api",
          uptime_ms: Date.now() - started,
        };
        send(res, 200, body);
        return;
      }
      if (url.pathname === "/ready") {
        const connection = new Connection(env.solanaRpc, "confirmed");
        const [slot, db] = await Promise.all([
          connection.getSlot("confirmed"),
          sql`select 1 as ok`,
        ]);
        send(res, 200, { ok: true, slot, db: db[0]?.ok === 1 });
        return;
      }
      if (url.pathname === "/v1/program") {
        const programId = declaredProgramId(env.programId);
        const devnetRpc = process.env.DEVNET_RPC_URL ?? "https://api.devnet.solana.com";
        const [mainnet, devnet] = await Promise.all([
          readProgramStatus(env.solanaRpc, programId, "mainnet-beta"),
          readProgramStatus(devnetRpc, programId, "devnet"),
        ]);
        send(res, 200, {
          programId,
          keeperSendEnabled: process.env.KEEPER_SEND_ENABLED === "true",
          clusters: { mainnet, devnet },
        });
        return;
      }
      if (url.pathname === "/v1/feed") {
        let feed = await latestFeed();
        if (!feed) feed = await refreshFeed();
        send(res, 200, { network: "MAINNET", feed }, { "cache-control": "public, max-age=15" });
        return;
      }
      if (url.pathname === "/v1/feed/refresh") {
        const feed = await refreshFeed();
        send(res, 200, { network: "MAINNET", feed });
        return;
      }
      if (url.pathname.startsWith("/v1/orders/")) {
        const pda = url.pathname.slice("/v1/orders/".length);
        if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(pda)) {
          send(res, 400, { error: "invalid_pda" });
          return;
        }
        const clusterParam = url.searchParams.get("cluster");
        const cluster: ClusterName =
          clusterParam === "devnet" || clusterParam === "devnet-beta" ? "devnet" : "mainnet-beta";
        const rpc = rpcForCluster(cluster, env.solanaRpc, process.env.DEVNET_RPC_URL);
        const connection = new Connection(rpc, "confirmed");
        const info = await connection.getAccountInfo(new PublicKey(pda));
        if (!info) {
          send(res, 404, { error: "not_found" });
          return;
        }
        if (info.owner.toBase58() !== PROGRAM_ID && info.owner.toBase58() !== env.programId) {
          send(res, 400, { error: "wrong_owner" });
          return;
        }
        const order = decodeOrder(Buffer.from(info.data));
        send(res, 200, {
          network: cluster,
          pda,
          lamports: info.lamports,
          order: {
            owner: order.owner.toBase58(),
            srcMint: order.srcMint.toBase58(),
            dstMint: order.dstMint.toBase58(),
            escrowAta: order.escrowAta.toBase58(),
            nonce: order.nonce.toString(),
            escrowedRaw: order.escrowedRaw.toString(),
            filledRaw: order.filledRaw.toString(),
            minRatioE9: order.minRatioE9.toString(),
            failsafeFloorE9: order.failsafeFloorE9.toString(),
            failsafeTs: order.failsafeTs.toString(),
            hardExpiryTs: order.hardExpiryTs.toString(),
            minFillRaw: order.minFillRaw.toString(),
            status: order.status === 0 ? "open" : "closed",
          },
        });
        return;
      }
      if (url.pathname === "/v1/receipts") {
        const pda = url.searchParams.get("pda");
        const rows = pda
          ? await sql`
              select order_pda, sig, slot, payload, created_at
              from receipts where order_pda = ${pda}
              order by created_at desc limit 50
            `
          : await sql`
              select order_pda, sig, slot, payload, created_at
              from receipts order by created_at desc limit 50
            `;
        send(res, 200, { receipts: rows });
        return;
      }
      if (url.pathname === "/v1/keeper") {
        const rows = await sql`select payload, updated_at from keeper_health where id = 1`;
        send(res, 200, { health: rows[0] ?? null });
        return;
      }
      if (url.pathname === "/v1/quote") {
        const amount = url.searchParams.get("amount") ?? "200000000";
        if (!/^[0-9]+$/.test(amount)) {
          send(res, 400, { error: "invalid_amount" });
          return;
        }
        const quote = await jupiterQuote(amount);
        send(res, 200, {
          network: "MAINNET",
          source: "jupiter_swap_v1_quote",
          cache_ms: 0,
          quote,
        });
        return;
      }
      send(res, 404, { error: "not_found" });
      void readJson;
    } catch (err) {
      send(res, 500, {
        error: "internal",
        message: err instanceof Error ? err.message : "unknown",
      });
    }
  });
}
