import { ceilRatio, isFillable, quoteRatioE9 } from "@tminus/sdk";
import type { IssuerSnapshot } from "./issuer.ts";

export function isConfiguredPair(
  srcMint: string,
  dstMint: string,
  allowedSrc: string,
  allowedDst: string
): boolean {
  return srcMint === allowedSrc && dstMint === allowedDst;
}

export function fillSize(
  remaining: bigint,
  cap: bigint,
  minFill: bigint
): bigint | null {
  if (remaining <= 0n || cap <= 0n) return null;
  const fillSrc = remaining > cap ? cap : remaining;
  if (fillSrc < minFill && fillSrc !== remaining) return null;
  return fillSrc;
}

export function haltFromIssuer(
  snap: IssuerSnapshot,
  previousFeeBps: number | null
): string | null {
  if (snap.paused) return "issuer_paused";
  if (snap.hookProgramId) return "transfer_hook_attached";
  if (
    previousFeeBps !== null &&
    snap.transferFeeBps !== null &&
    snap.transferFeeBps !== previousFeeBps
  ) {
    return "issuer_fee_changed";
  }
  return null;
}

export function haltFromFeed(
  fetchedAtMs: number | null,
  nowMs: number,
  staleMs: number
): string | null {
  if (fetchedAtMs === null) return "feed_missing";
  if (nowMs - fetchedAtMs > staleMs) return "feed_stale";
  return null;
}

export type FillPlan =
  | { action: "skip"; reason: string }
  | { action: "inventory"; fillSrc: bigint; dstRaw: bigint }
  | { action: "atomic_swap"; fillSrc: bigint; dstRaw: bigint };

export function chooseFillPlan(args: {
  remaining: bigint;
  cap: bigint;
  minFill: bigint;
  floorE9: bigint;
  inventoryDst: bigint;
  quoteIn: bigint | null;
  quoteOut: bigint | null;
  allowInventoryWithoutQuote: boolean;
}): FillPlan {
  const fillSrc = fillSize(args.remaining, args.cap, args.minFill);
  if (fillSrc === null) return { action: "skip", reason: "fill_too_small" };
  const minDst = ceilRatio(fillSrc, args.floorE9);
  const hasQuote = args.quoteIn !== null && args.quoteOut !== null && args.quoteIn > 0n;
  if (hasQuote) {
    const qRatio = quoteRatioE9(args.quoteOut!, args.quoteIn!);
    if (!isFillable(qRatio, args.floorE9)) {
      return { action: "skip", reason: "not_fillable" };
    }
    if (args.inventoryDst >= minDst) {
      return { action: "inventory", fillSrc, dstRaw: minDst };
    }
    return { action: "atomic_swap", fillSrc, dstRaw: args.quoteOut! };
  }
  if (args.allowInventoryWithoutQuote && args.inventoryDst >= minDst) {
    return { action: "inventory", fillSrc, dstRaw: minDst };
  }
  return {
    action: "skip",
    reason: args.inventoryDst >= minDst ? "quote_required" : "no_quote_no_inventory",
  };
}
