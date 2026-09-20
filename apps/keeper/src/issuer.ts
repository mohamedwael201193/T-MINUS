import { Connection, PublicKey } from "@solana/web3.js";
import { env } from "./config.ts";
import { log } from "./log.ts";

export type IssuerSnapshot = {
  paused: boolean;
  hookProgramId: string | null;
  transferFeeBps: number | null;
  feeEpoch: number | null;
  multiplier: string | null;
  permanentDelegate: string | null;
  mintAuthority: string | null;
  freezeAuthority: string | null;
};

type Ext = { extension: string; state: Record<string, unknown> };

export async function readIssuer(connection: Connection, mint: string): Promise<IssuerSnapshot> {
  const info = await connection.getParsedAccountInfo(new PublicKey(mint));
  if (!info.value || !("parsed" in info.value.data)) {
    throw new Error("mint_unparsed");
  }
  const parsed = info.value.data.parsed as {
    info: {
      mintAuthority?: string | null;
      freezeAuthority?: string | null;
      extensions?: Ext[];
    };
  };
  const exts = parsed.info.extensions ?? [];
  const by = Object.fromEntries(exts.map((e) => [e.extension, e.state]));
  const pause = by.pausableConfig as { paused?: boolean } | undefined;
  const hook = by.transferHook as { programId?: string | null } | undefined;
  const fee = by.transferFeeConfig as {
    newerTransferFee?: { transferFeeBasisPoints?: number; epoch?: number };
  } | undefined;
  const scaled = by.scaledUiAmountConfig as { multiplier?: string } | undefined;
  const perm = by.permanentDelegate as { delegate?: string } | undefined;
  return {
    paused: Boolean(pause?.paused),
    hookProgramId: hook?.programId ?? null,
    transferFeeBps: fee?.newerTransferFee?.transferFeeBasisPoints ?? null,
    feeEpoch: fee?.newerTransferFee?.epoch ?? null,
    multiplier: scaled?.multiplier ?? null,
    permanentDelegate: perm?.delegate ?? null,
    mintAuthority: parsed.info.mintAuthority ?? null,
    freezeAuthority: parsed.info.freezeAuthority ?? null,
  };
}

export function haltReason(snap: IssuerSnapshot): string | null {
  if (snap.paused) return "issuer_paused";
  if (snap.hookProgramId) return "transfer_hook_attached";
  return null;
}

export function logIssuer(snap: IssuerSnapshot): void {
  log("issuer_snapshot", {
    paused: snap.paused,
    hook: snap.hookProgramId,
    fee_bps: snap.transferFeeBps,
    fee_epoch: snap.feeEpoch,
    multiplier: snap.multiplier,
    has_permanent_delegate: Boolean(snap.permanentDelegate),
    has_mint_authority: Boolean(snap.mintAuthority),
    has_freeze_authority: Boolean(snap.freezeAuthority),
  });
}

export { env };
