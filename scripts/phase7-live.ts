/**
 * Phase 7 live prep: re-fetch mint, quote 1 display, prove Trigger still
 * rejects transfer-fee mints, simulate a place without sending.
 * Never prints secrets. Never sends a transaction.
 */
import { config } from "dotenv";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  Connection,
  Keypair,
  PublicKey,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import { getAssociatedTokenAddressSync, TOKEN_2022_PROGRAM_ID } from "@solana/spl-token";
import { DISPLAY_RAW_SPACEX, orderPda, PROGRAM_ID, SPACEX_MINT, SPCXX_MINT } from "@tminus/sdk";
import { placeIx } from "../apps/keeper/src/ix.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
config({ path: resolve(root, ".env") });

function loadKeypair(path: string): Keypair {
  return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(readFileSync(path, "utf8")) as number[]));
}

function sha256Json(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

const rpc = process.env.SOLANA_RPC_URL ?? "https://api.mainnet-beta.solana.com";
const mint = new PublicKey(process.env.SPACEX_MINT ?? SPACEX_MINT);
const dst = new PublicKey(process.env.SPCXX_MINT ?? SPCXX_MINT);
const programId = new PublicKey(process.env.PROGRAM_ID ?? PROGRAM_ID);
const wallet = loadKeypair(
  process.env.ANCHOR_WALLET ?? `${process.env.USERPROFILE}\\.tminus\\keys\\deploy.json`
);

async function main() {
const connection = new Connection(rpc, "confirmed");
const epoch = await connection.getEpochInfo();
const mintAcc = await connection.getParsedAccountInfo(mint);
if (!mintAcc.value || !("parsed" in mintAcc.value.data)) {
  throw new Error("mint_unparsed");
}
const parsed = mintAcc.value.data.parsed as {
  info: {
    decimals: number;
    mintAuthority: string | null;
    freezeAuthority: string | null;
    extensions?: { extension: string; state: Record<string, unknown> }[];
  };
};
const exts = parsed.info.extensions ?? [];
const by = Object.fromEntries(exts.map((e) => [e.extension, e.state]));
const fee = by.transferFeeConfig as {
  newerTransferFee?: { transferFeeBasisPoints?: number; epoch?: number };
} | undefined;
const hook = by.transferHook as { programId?: string | null } | undefined;
const pause = by.pausableConfig as { paused?: boolean } | undefined;
const scaled = by.scaledUiAmountConfig as {
  multiplier?: string;
  newMultiplier?: string;
  newMultiplierEffectiveTimestamp?: number;
} | undefined;
const perm = by.permanentDelegate as { delegate?: string } | undefined;

const jupHeaders: Record<string, string> = { accept: "application/json" };
if (process.env.JUPITER_API_KEY) jupHeaders["x-api-key"] = process.env.JUPITER_API_KEY;
const lite = process.env.JUPITER_LITE_API_BASE ?? "https://lite-api.jup.ag";

const quoteUrl =
  `${lite}/swap/v1/quote?` +
  new URLSearchParams({
    inputMint: mint.toBase58(),
    outputMint: dst.toBase58(),
    amount: DISPLAY_RAW_SPACEX.toString(),
    slippageBps: "50",
  });
const quoteRes = await fetch(quoteUrl, { headers: jupHeaders });
const quoteText = await quoteRes.text();
const quote = quoteRes.ok ? (JSON.parse(quoteText) as { inAmount: string; outAmount: string; swapUsdValue?: string }) : null;

const expiredAt = Math.floor(Date.now() / 1000) + 3600;
const triggerRes = await fetch(`${lite}/trigger/v1/createOrder`, {
  method: "POST",
  headers: { ...jupHeaders, "content-type": "application/json" },
  body: JSON.stringify({
    maker: wallet.publicKey.toBase58(),
    payer: wallet.publicKey.toBase58(),
    inputMint: mint.toBase58(),
    outputMint: dst.toBase58(),
    params: {
      makingAmount: DISPLAY_RAW_SPACEX.toString(),
      takingAmount: "1",
      expiredAt: String(expiredAt),
      slippageBps: "50",
    },
  }),
});
const triggerText = await triggerRes.text();

const programInfo = await connection.getAccountInfo(programId);
const ownerSrcAta = getAssociatedTokenAddressSync(
  mint,
  wallet.publicKey,
  true,
  TOKEN_2022_PROGRAM_ID
);
const nonce = 1n;
const [order] = orderPda(wallet.publicKey, mint, dst, nonce);
const escrowAta = getAssociatedTokenAddressSync(mint, order, true, TOKEN_2022_PROGRAM_ID);
const now = BigInt(Math.floor(Date.now() / 1000));
const ix = placeIx({
  programId,
  owner: wallet.publicKey,
  order,
  srcMint: mint,
  dstMint: dst,
  ownerSrcAta,
  escrowAta,
  nonce,
  amountRaw: DISPLAY_RAW_SPACEX,
  minRatioE9: 1n,
  failsafeFloorE9: 1n,
  failsafeTs: now + 3600n,
  hardExpiryTs: now + 7200n,
  minFillRaw: 1n,
  srcMultiplierE9: 5_000_000_000n,
});
const { blockhash } = await connection.getLatestBlockhash("confirmed");
const msg = new TransactionMessage({
  payerKey: wallet.publicKey,
  recentBlockhash: blockhash,
  instructions: [ix],
}).compileToV0Message();
const tx = new VersionedTransaction(msg);
const sim = await connection.simulateTransaction(tx, {
  sigVerify: false,
  replaceRecentBlockhash: true,
});

const hookProgram = hook?.programId ?? null;
const evidence = {
  label: "PHASE7_SAFETY",
  network: "MAINNET",
  sent: false,
  at: new Date().toISOString(),
  mint: mint.toBase58(),
  epoch: epoch.epoch,
  slot: epoch.absoluteSlot,
  feeBps: fee?.newerTransferFee?.transferFeeBasisPoints ?? null,
  feeEpoch: fee?.newerTransferFee?.epoch ?? null,
  hookProgramId: hookProgram,
  paused: Boolean(pause?.paused),
  multiplier: scaled?.multiplier ?? null,
  newMultiplier: scaled?.newMultiplier ?? null,
  newMultiplierEffectiveTimestamp: scaled?.newMultiplierEffectiveTimestamp ?? null,
  permanentDelegate: perm?.delegate ?? null,
  mintAuthority: parsed.info.mintAuthority,
  freezeAuthority: parsed.info.freezeAuthority,
  quote: quote
    ? { inAmount: quote.inAmount, outAmount: quote.outAmount, swapUsdValue: quote.swapUsdValue ?? null }
    : { error: `quote_http_${quoteRes.status}` },
  triggerV1: {
    status: triggerRes.status,
    bodyPreview: triggerText.slice(0, 240),
  },
  programAccountExists: Boolean(programInfo),
  simulatePlace: {
    err: sim.value.err,
    unitsConsumed: sim.value.unitsConsumed ?? 0,
    logsPreview: (sim.value.logs ?? []).slice(0, 6),
  },
  spendCapRaw: process.env.KEEPER_SPEND_CAP_RAW ?? "200000000",
  keeperSendEnabled: process.env.KEEPER_SEND_ENABLED === "true",
  abortIfHook: Boolean(hookProgram),
  abortIfPaused: Boolean(pause?.paused),
  mintSha256: sha256Json({ mint: mint.toBase58(), extensions: exts, epoch: epoch.epoch }),
};

mkdirSync(resolve(root, "evidence"), { recursive: true });
writeFileSync(resolve(root, "evidence/phase7-safety.json"), JSON.stringify(evidence, null, 2));
console.log(JSON.stringify(evidence, null, 2));
if (evidence.abortIfHook || evidence.abortIfPaused) {
  process.exit(2);
}
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
