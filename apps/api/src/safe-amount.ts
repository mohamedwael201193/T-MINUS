/**
 * Balance-aware input sizing for SPACEX conversions.
 * Never invent a default like 0.01 display when the wallet holds less.
 */

export const SPACEX_DISPLAY_RAW = 200_000_000n;
/** Keep enough SOL for a Jupiter TRADE + rent/priority. */
export const MIN_SOL_LAMPORTS = 3_000_000n;
export const MIN_MEANINGFUL_SPACEX_RAW = 1n;
/** Desk cap — 10 display SPACEX — not a substitute for the wallet. */
export const UI_LIMIT_SPACEX_RAW = 2_000_000_000n;

export function maxSafeInputRaw(opts: {
  walletRaw: bigint;
  uiLimitRaw?: bigint;
  routeMaxRaw?: bigint | null;
}): bigint {
  let v = opts.walletRaw < 0n ? 0n : opts.walletRaw;
  const ui = opts.uiLimitRaw ?? UI_LIMIT_SPACEX_RAW;
  if (ui < v) v = ui;
  if (opts.routeMaxRaw != null && opts.routeMaxRaw >= 0n && opts.routeMaxRaw < v) {
    v = opts.routeMaxRaw;
  }
  if (v < MIN_MEANINGFUL_SPACEX_RAW) return 0n;
  return v;
}

export function rawToDisplayString(raw: bigint, scale = SPACEX_DISPLAY_RAW): string {
  if (raw <= 0n) return "0";
  const n = Number(raw) / Number(scale);
  if (!Number.isFinite(n)) return "0";
  return n.toFixed(12).replace(/\.?0+$/, "");
}

export function displayToRaw(display: string, scale = Number(SPACEX_DISPLAY_RAW)): bigint {
  const n = Number(display);
  if (!Number.isFinite(n) || n <= 0) return 0n;
  return BigInt(Math.round(n * scale));
}
