import { Connection, PublicKey } from "@solana/web3.js";
import { env } from "./config.ts";

export type OnchainMintState = {
  mint: string;
  tokenProgram: string | null;
  decimals: number | null;
  paused: boolean | null;
  hookProgramId: string | null;
  transferFeeBps: number | null;
  freezeAuthority: string | null;
  mintAuthority: string | null;
  permanentDelegate: string | null;
  scaledMultiplier: string | null;
  fetchedAt: string | null;
  rpcOk: boolean;
  error: string | null;
};

type Ext = { extension?: string; state?: Record<string, unknown> };

const cache = new Map<string, { at: number; state: OnchainMintState }>();
const CACHE_MS = 30_000;

export function emptyMintState(mint: string, error: string | null = null): OnchainMintState {
  return {
    mint,
    tokenProgram: null,
    decimals: null,
    paused: null,
    hookProgramId: null,
    transferFeeBps: null,
    freezeAuthority: null,
    mintAuthority: null,
    permanentDelegate: null,
    scaledMultiplier: null,
    fetchedAt: null,
    rpcOk: false,
    error,
  };
}

export function parseMintExtensions(opts: {
  mint: string;
  tokenProgram?: string | null;
  decimals?: number | null;
  mintAuthority?: string | null;
  freezeAuthority?: string | null;
  extensions?: unknown;
}): OnchainMintState {
  const exts = Array.isArray(opts.extensions) ? (opts.extensions as Ext[]) : [];
  const by = Object.fromEntries(
    exts
      .filter((e) => typeof e?.extension === "string")
      .map((e) => [e.extension as string, e.state ?? {}]),
  );
  const pause = by.pausableConfig as { paused?: boolean } | undefined;
  const hook = by.transferHook as { programId?: string | null } | undefined;
  const fee = by.transferFeeConfig as {
    newerTransferFee?: { transferFeeBasisPoints?: number };
  } | undefined;
  const scaled = by.scaledUiAmountConfig as { multiplier?: string | number } | undefined;
  const perm = by.permanentDelegate as { delegate?: string } | undefined;
  const hookId = hook?.programId && hook.programId !== "11111111111111111111111111111111" ? hook.programId : null;
  return {
    mint: opts.mint,
    tokenProgram: opts.tokenProgram ?? null,
    decimals: opts.decimals ?? null,
    paused: typeof pause?.paused === "boolean" ? pause.paused : false,
    hookProgramId: hookId,
    transferFeeBps: fee?.newerTransferFee?.transferFeeBasisPoints ?? null,
    freezeAuthority: opts.freezeAuthority ?? null,
    mintAuthority: opts.mintAuthority ?? null,
    permanentDelegate: perm?.delegate ?? null,
    scaledMultiplier: scaled?.multiplier != null ? String(scaled.multiplier) : null,
    fetchedAt: new Date().toISOString(),
    rpcOk: true,
    error: null,
  };
}

export function parseFeedIssuerPowers(mint: string, powers: Record<string, unknown> | null | undefined): OnchainMintState | null {
  if (!powers) return null;
  const extensions = powers.extensions;
  if (!Array.isArray(extensions)) return null;
  return parseMintExtensions({
    mint,
    tokenProgram: typeof powers.mint_owner === "string" ? powers.mint_owner : null,
    extensions,
  });
}

export async function readMintState(mint: string, force = false): Promise<OnchainMintState> {
  const now = Date.now();
  const hit = cache.get(mint);
  if (!force && hit && now - hit.at < CACHE_MS) return hit.state;
  try {
    const connection = new Connection(env.solanaRpc, "confirmed");
    const info = await connection.getParsedAccountInfo(new PublicKey(mint));
    if (!info.value || !("parsed" in info.value.data)) {
      const state = emptyMintState(mint, "mint_unparsed");
      cache.set(mint, { at: now, state });
      return state;
    }
    const parsed = info.value.data.parsed as {
      info?: {
        decimals?: number;
        mintAuthority?: string | null;
        freezeAuthority?: string | null;
        extensions?: unknown;
      };
    };
    const state = parseMintExtensions({
      mint,
      tokenProgram: info.value.owner.toBase58(),
      decimals: parsed.info?.decimals ?? null,
      mintAuthority: parsed.info?.mintAuthority ?? null,
      freezeAuthority: parsed.info?.freezeAuthority ?? null,
      extensions: parsed.info?.extensions,
    });
    cache.set(mint, { at: now, state });
    return state;
  } catch (err) {
    const state = emptyMintState(mint, err instanceof Error ? err.message : "rpc_error");
    cache.set(mint, { at: now, state });
    return state;
  }
}
