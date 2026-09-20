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
