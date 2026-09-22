export const SPACEX_DISPLAY_RAW = 200_000_000;
export const MIN_SOL_FOR_TRADE = 0.003;
export const UI_LIMIT_SPACEX_RAW = BigInt("2000000000");
const ZERO = BigInt(0);

export function maxSafeInputRaw(walletRaw: bigint, uiLimitRaw = UI_LIMIT_SPACEX_RAW): bigint {
  if (walletRaw <= ZERO) return ZERO;
  return walletRaw < uiLimitRaw ? walletRaw : uiLimitRaw;
}

export function rawToDisplayString(raw: bigint, scale = SPACEX_DISPLAY_RAW): string {
  if (raw <= ZERO) return "0";
  const n = Number(raw) / scale;
  if (!Number.isFinite(n)) return "0";
  return n.toFixed(12).replace(/\.?0+$/, "");
}

export function displayToRaw(display: string, scale = SPACEX_DISPLAY_RAW): bigint {
  const n = Number(display);
  if (!Number.isFinite(n) || n <= 0) return ZERO;
  return BigInt(Math.round(n * scale));
}

export function isWalletRejected(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const rec = err as { code?: number; message?: string; name?: string };
  if (rec.code === 4001) return true;
  const msg = `${rec.name ?? ""} ${rec.message ?? ""}`;
  return /user reject|rejected|denied|cancelled|canceled/i.test(msg);
}
