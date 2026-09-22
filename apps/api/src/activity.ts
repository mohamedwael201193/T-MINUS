import type postgres from "postgres";
import { sql as defaultSql } from "./db.ts";

export const OWNER_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

export type ReceiptStoreRow = {
  order_pda: string;
  sig: string;
  slot: string | number | bigint;
  created_at: Date | string;
  payload: Record<string, unknown> | null;
};

export type ActivityItem = {
  network: "MAINNET" | "DEVNET";
  kind: "CONVERSION" | "PROTOCOL_ORDER";
  owner: string | null;
  assetId: string | null;
  sourceSymbol: string;
  destinationSymbol: string;
  sourceAmount: number | null;
  destinationAmount: number | null;
  ratio: number | null;
  route: string | null;
  timestamp: string;
  slot: number;
  signature: string;
  explorerUrl: string;
  verifiedOnchain: boolean;
  corporateAction: string | null;
  fingerprint: string | null;
  pda: string | null;
  event: string | null;
};

const SPACEX_DISPLAY_RAW = 200_000_000;
const SPCXX_DISPLAY_RAW = 100_000_000;

export function isOnChainOrderPda(id: string | undefined | null): boolean {
  if (!id) return false;
  if (id.includes(":")) return false;
  return OWNER_RE.test(id);
}

export function receiptOwnerFields(row: ReceiptStoreRow): string[] {
  const p = row.payload ?? {};
  const fields = [p.taker, p.wallet, p.owner, p.takerPubkey];
  const out: string[] = [];
  for (const v of fields) {
    if (typeof v === "string" && v.length > 0) out.push(v);
  }
  const pda = row.order_pda ?? "";
  const conv = pda.match(/^conversion:[a-z0-9]+:([1-9A-HJ-NP-Za-km-z]{32,44})$/i);
  if (conv?.[1]) out.push(conv[1]);
  return out;
}

export function receiptMatchesOwner(row: ReceiptStoreRow, owner: string): boolean {
  return receiptOwnerFields(row).some((v) => v === owner);
}

function asNumber(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v !== "" && Number.isFinite(Number(v))) return Number(v);
  return null;
}

function displayAmount(raw: unknown, display: unknown, divisor: number): number | null {
  const d = asNumber(display);
  if (d != null) return d;
  const r = asNumber(raw);
  if (r == null) return null;
  return r / divisor;
}

function executedRatio(payload: Record<string, unknown>): number | null {
  const n = asNumber(payload.ratio);
  if (n == null) return null;
  if (n > 2) return n / 1e9;
  return n;
}

function routeLabel(payload: Record<string, unknown>): string | null {
  const route = payload.route;
  if (typeof route === "string" && route) return route;
  if (route && typeof route === "object") {
    const rec = route as { composition?: unknown; path?: unknown; router?: unknown };
    if (typeof rec.composition === "string" && rec.composition) return rec.composition;
    if (typeof rec.router === "string" && rec.router) return rec.router;
    if (typeof rec.path === "string" && rec.path) return rec.path;
  }
  return null;
}

function kindOf(payload: Record<string, unknown>): ActivityItem["kind"] {
  const raw = typeof payload.kind === "string" ? payload.kind.toLowerCase() : "";
  if (raw === "mainnet_jupiter_conversion" || raw === "conversion") return "CONVERSION";
  if (payload.network === "MAINNET" && payload.settlementKind === "TRADE") return "CONVERSION";
  return "PROTOCOL_ORDER";
}

export function toActivityItem(row: ReceiptStoreRow): ActivityItem | null {
  const payload = row.payload ?? {};
  const network = payload.network === "MAINNET" ? "MAINNET" : payload.network === "DEVNET" ? "DEVNET" : null;
  if (!network) return null;
  const kind = kindOf(payload);
  if (kind === "CONVERSION" && network !== "MAINNET") return null;
  if (kind === "PROTOCOL_ORDER" && network !== "DEVNET") return null;

  const sig = row.sig;
  const slot = Number(row.slot);
  const owners = receiptOwnerFields(row);
  const eventRaw = typeof payload.kind === "string" ? payload.kind.toLowerCase() : "";
  const event =
    kind === "PROTOCOL_ORDER" &&
    (eventRaw === "place" || eventRaw === "fill" || eventRaw === "cancel" || eventRaw === "expire")
      ? eventRaw
      : kind === "PROTOCOL_ORDER"
        ? "fill"
        : null;
  const explorer =
    typeof payload.explorer === "string" && payload.explorer
      ? payload.explorer
      : network === "DEVNET"
        ? `https://explorer.solana.com/tx/${sig}?cluster=devnet`
        : `https://explorer.solana.com/tx/${sig}`;
  const timestamp =
    (typeof payload.timestamp === "string" && payload.timestamp) ||
    (row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at));
  const conversion = kind === "CONVERSION";
  const pda = isOnChainOrderPda(row.order_pda) ? row.order_pda : null;

  return {
    network,
    kind,
    owner: owners[0] ?? null,
    assetId: typeof payload.assetId === "string" ? payload.assetId : conversion ? "spacex" : null,
    sourceSymbol: conversion ? "SPACEX" : "DEVNET-SRC",
    destinationSymbol: conversion
      ? typeof payload.destinationSymbol === "string"
        ? payload.destinationSymbol
        : "SPCXx"
      : "DEVNET-DST",
    sourceAmount: displayAmount(payload.sourceAmount, payload.sourceDisplay, conversion ? SPACEX_DISPLAY_RAW : 1e6),
    destinationAmount: displayAmount(
      payload.destinationAmount,
      payload.destinationDisplay,
      conversion ? SPCXX_DISPLAY_RAW : 1e6,
    ),
    ratio: executedRatio(payload),
    route: routeLabel(payload),
    timestamp,
    slot: Number.isFinite(slot) ? slot : 0,
    signature: sig,
    explorerUrl: explorer,
    verifiedOnchain: payload.verifiedOnchain === true,
    corporateAction: typeof payload.corporateActionId === "string" ? payload.corporateActionId : null,
    fingerprint:
      typeof payload.actionFingerprint === "string"
        ? payload.actionFingerprint
        : typeof payload.feedHash === "string"
          ? payload.feedHash
          : null,
    pda,
    event,
  };
}

export function ownerActivityFromRows(rows: ReceiptStoreRow[], owner: string): ActivityItem[] {
  return rows
    .filter((row) => receiptMatchesOwner(row, owner))
    .map(toActivityItem)
    .filter((item): item is ActivityItem => item != null)
    .sort((a, b) => {
      const ta = Date.parse(a.timestamp);
      const tb = Date.parse(b.timestamp);
      if (tb !== ta) return tb - ta;
      return b.slot - a.slot;
    });
}

export async function listOwnerActivity(
  owner: string,
  db: postgres.Sql = defaultSql,
): Promise<ActivityItem[]> {
  const rows = await db<ReceiptStoreRow[]>`
    select order_pda, sig, slot, payload, created_at
    from receipts
    where
      payload->>'taker' = ${owner}
      or payload->>'wallet' = ${owner}
      or payload->>'owner' = ${owner}
      or order_pda like ${"conversion:%:" + owner}
    order by created_at desc
    limit 100
  `;
  return ownerActivityFromRows(rows, owner);
}
