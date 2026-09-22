import type { ExecutionReceipt } from "../domain/types";
import { PROGRAM_ID, type ReceiptRow } from "./api";

const SPACEX_DISPLAY_RAW = 200_000_000;
const SPCXX_DISPLAY_RAW = 100_000_000;

/** Real DEVNET order PDAs are base58. Conversion receipts use `conversion:asset:wallet`. */
export function isOnChainOrderPda(id: string | undefined | null): boolean {
  if (!id) return false;
  if (id.includes(":")) return false;
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(id);
}

export function mapReceipt(row: ReceiptRow, index: number): ExecutionReceipt {
  const payload = row.payload ?? {};
  const network = (payload.network === "MAINNET" || payload.network === "DEVNET"
    ? payload.network
    : "DEVNET") as ExecutionReceipt["network"];
  const srcRaw = Number(payload.sourceAmount ?? "0");
  const dstRaw = Number(payload.destinationAmount ?? "0");
  const ratioE9 = Number(payload.ratio ?? "0");
  const composition =
    typeof payload.route === "string" ? payload.route : payload.route?.composition ?? "unknown";
  const kindRaw = typeof payload.kind === "string" ? payload.kind.toLowerCase() : "";
  const isConversion = kindRaw === "mainnet_jupiter_conversion" || kindRaw === "conversion";
  const eventKind: ExecutionReceipt["eventKind"] = isConversion
    ? "conversion"
    : kindRaw === "fill" || kindRaw === "cancel" || kindRaw === "expire" || kindRaw === "place"
      ? kindRaw
      : dstRaw > 0
        ? "fill"
        : "place";
  const isDevnet = network === "DEVNET";
  return {
    id: `R-${String(index + 1).padStart(4, "0")}`,
    orderId: row.order_pda,
    assetId: payload.assetId ?? (isDevnet ? "protocol-devnet" : "spacex"),
    path: payload.failsafeFlag ? "FAILSAFE" : "TARGET",
    targetRatio: ratioE9 ? ratioE9 / 1e9 : 0,
    floorRatio: ratioE9 ? ratioE9 / 1e9 : 0,
    executedRatio: ratioE9 ? ratioE9 / 1e9 : 0,
    size: isConversion ? srcRaw / SPACEX_DISPLAY_RAW : srcRaw / 1e6,
    filled: isConversion ? dstRaw / SPCXX_DISPLAY_RAW : dstRaw / 1e6,
    signature: row.sig,
    slot: Number(row.slot ?? payload.slot ?? 0),
    route: `${network} · ${eventKind} · ${composition}`,
    feeBps:
      typeof payload.transferFeeBps === "number"
        ? payload.transferFeeBps
        : isConversion
          ? 100
          : 0,
    settledAt: payload.timestamp ?? row.created_at,
    feedHash: payload.feedHash ?? "—",
    network,
    explorerUrl:
      payload.explorer ??
      (network === "DEVNET"
        ? `https://explorer.solana.com/tx/${row.sig}?cluster=devnet`
        : `https://explorer.solana.com/tx/${row.sig}`),
    programId: isConversion ? "jupiter-swap-v2" : payload.programId ?? PROGRAM_ID,
    sourceSymbol: isConversion ? "SPACEX" : isDevnet ? "DEVNET-SRC" : "SPACEX",
    destinationSymbol: isConversion
      ? payload.destinationSymbol ?? "SPCXx"
      : isDevnet
        ? "DEVNET-DST"
        : "SPCXx",
    eventKind,
  };
}
