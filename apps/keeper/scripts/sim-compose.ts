import { config } from "dotenv";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  Connection,
  Keypair,
  PublicKey,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import { getAssociatedTokenAddressSync, TOKEN_2022_PROGRAM_ID } from "@solana/spl-token";
import {
  DISPLAY_RAW_SPACEX,
  PROGRAM_ID,
  SPACEX_MINT,
  SPCXX_MINT,
  orderPda,
} from "@tminus/sdk";
import { buildSwap, loadLookupTables, quoteExactIn, toInstruction } from "../src/jupiter.ts";
import { env } from "../src/config.ts";
import { fillIx } from "../src/ix.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
config({ path: resolve(root, ".env") });

function loadKeypair(path: string): Keypair {
  const raw = JSON.parse(readFileSync(path, "utf8")) as number[];
  return Keypair.fromSecretKey(Uint8Array.from(raw));
}

const takerPath =
  process.env.ANCHOR_WALLET ||
  env.keypairPath ||
  `${process.env.USERPROFILE}\\.tminus\\keys\\user-fund.json`;
const keeper = loadKeypair(takerPath);
const connection = new Connection(env.solanaRpc, "confirmed");
const taker = keeper.publicKey.toBase58();
const srcMint = new PublicKey(SPACEX_MINT);
const dstMint = new PublicKey(SPCXX_MINT);
const programId = new PublicKey(process.env.PROGRAM_ID ?? PROGRAM_ID);

const quote = await quoteExactIn(
  SPACEX_MINT,
  SPCXX_MINT,
  DISPLAY_RAW_SPACEX.toString(),
  taker
);

const build = await buildSwap({
  inputMint: SPACEX_MINT,
  outputMint: SPCXX_MINT,
  amount: DISPLAY_RAW_SPACEX.toString(),
  taker,
});

const nonce = 1n;
const [order] = orderPda(keeper.publicKey, srcMint, dstMint, nonce, programId);
const escrowAta = getAssociatedTokenAddressSync(srcMint, order, true, TOKEN_2022_PROGRAM_ID);
const ownerDstAta = getAssociatedTokenAddressSync(dstMint, keeper.publicKey, true, TOKEN_2022_PROGRAM_ID);
const fillerSrcAta = getAssociatedTokenAddressSync(srcMint, keeper.publicKey, true, TOKEN_2022_PROGRAM_ID);
const fillerDstAta = getAssociatedTokenAddressSync(dstMint, keeper.publicKey, true, TOKEN_2022_PROGRAM_ID);

const fill = fillIx({
  programId,
  filler: keeper.publicKey,
  owner: keeper.publicKey,
  order,
  srcMint,
  dstMint,
  escrowAta,
  ownerDstAta,
  fillerSrcAta,
  fillerDstAta,
  fillSrcRaw: DISPLAY_RAW_SPACEX,
  dstRaw: BigInt(quote.outAmount),
});

const ixs = [
  ...build.computeBudgetInstructions.map(toInstruction),
  ...build.setupInstructions.map(toInstruction),
  toInstruction(build.swapInstruction),
  fill,
  ...(build.cleanupInstruction ? [toInstruction(build.cleanupInstruction)] : []),
  ...build.otherInstructions.map(toInstruction),
];

const alts = await loadLookupTables(connection, build);
const { blockhash } = await connection.getLatestBlockhash("confirmed");
const msg = new TransactionMessage({
  payerKey: keeper.publicKey,
  recentBlockhash: blockhash,
  instructions: ixs,
}).compileToV0Message(alts);
const tx = new VersionedTransaction(msg);
const serialized = Buffer.from(tx.serialize());
const sim = await connection.simulateTransaction(tx, {
  sigVerify: false,
  replaceRecentBlockhash: true,
});

const evidence = {
  label: "SIMULATION",
  network: "MAINNET",
  composition: "jupiter_swap_v2_build_plus_fill_ix",
  taker,
  quote: {
    inAmount: quote.inAmount,
    outAmount: quote.outAmount,
    otherAmountThreshold: quote.otherAmountThreshold,
    swapUsdValue: quote.swapUsdValue ?? null,
  },
  build: {
    inAmount: build.inAmount,
    outAmount: build.outAmount,
    slippageBps: build.slippageBps,
    setupCount: build.setupInstructions.length,
    computeBudgetCount: build.computeBudgetInstructions.length,
    hasCleanup: Boolean(build.cleanupInstruction),
    otherCount: build.otherInstructions.length,
    alts: Object.keys(build.addressesByLookupTableAddress ?? {}),
    routePlan: build.routePlan,
  },
  fill: {
    programId: programId.toBase58(),
    order: order.toBase58(),
    fillSrcRaw: DISPLAY_RAW_SPACEX.toString(),
    dstRaw: quote.outAmount,
    standInMemo: false,
  },
  tx: {
    serializedBytes: serialized.length,
    version0Limit: 1232,
    underLimit: serialized.length <= 1232,
    altCount: alts.length,
    ixCount: ixs.length,
  },
  simulation: {
    err: sim.value.err,
    unitsConsumed: sim.value.unitsConsumed ?? null,
    logs: (sim.value.logs ?? []).slice(-20),
  },
  decision:
    serialized.length <= 1232
      ? sim.value.err
        ? "ATOMIC_SWAP_PLUS_FILL_SERIALIZES; simulation_err_present_likely_missing_program_or_inventory; keep atomic path if err is funds/token/program, else two-tx"
        : "ATOMIC_SWAP_PLUS_FILL_OK"
      : "SAFE_TWO_TRANSACTION_FALLBACK",
};

mkdirSync(resolve(root, "evidence"), { recursive: true });
writeFileSync(resolve(root, "evidence/phase1-sim.json"), JSON.stringify(evidence, null, 2));
console.log(
  JSON.stringify({
    serializedBytes: evidence.tx.serializedBytes,
    underLimit: evidence.tx.underLimit,
    unitsConsumed: evidence.simulation.unitsConsumed,
    err: evidence.simulation.err,
    alts: evidence.build.alts,
    decision: evidence.decision,
    outAmount: quote.outAmount,
    fillStandInMemo: false,
  })
);
