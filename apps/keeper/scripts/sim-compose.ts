import { config } from "dotenv";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  Connection,
  Keypair,
  PublicKey,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import { SPACEX_MINT, SPCXX_MINT, DISPLAY_RAW_SPACEX } from "@tminus/sdk";
import { buildSwap, loadLookupTables, quoteExactIn, toInstruction } from "../src/jupiter.ts";
import { env } from "../src/config.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
config({ path: resolve(root, ".env") });

const MEMO = new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr");

function loadKeypair(path: string): Keypair {
  const raw = JSON.parse(readFileSync(path, "utf8")) as number[];
  return Keypair.fromSecretKey(Uint8Array.from(raw));
}

const keeper = loadKeypair(env.keypairPath);
const connection = new Connection(env.solanaRpc, "confirmed");
const taker = keeper.publicKey.toBase58();

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

const memo = new TransactionInstruction({
  programId: MEMO,
  keys: [{ pubkey: keeper.publicKey, isSigner: true, isWritable: false }],
  data: Buffer.from("T-MINUS G10 compose stand-in", "utf8"),
});

const ixs = [
  ...build.computeBudgetInstructions.map(toInstruction),
  ...build.setupInstructions.map(toInstruction),
  toInstruction(build.swapInstruction),
  memo,
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
        ? "ATOMIC_COMPOSITION_SERIALIZES; simulation_err_present_likely_missing_inventory; keep atomic path if err is funds/token, else two-tx"
        : "ATOMIC_SWAP_PLUS_FILL_STANDIN_OK"
      : "SAFE_TWO_TRANSACTION_FALLBACK",
};

mkdirSync(resolve(root, "evidence"), { recursive: true });
writeFileSync(
  resolve(root, "evidence/phase1-sim.json"),
  JSON.stringify(evidence, null, 2)
);
console.log(JSON.stringify({
  serializedBytes: evidence.tx.serializedBytes,
  underLimit: evidence.tx.underLimit,
  unitsConsumed: evidence.simulation.unitsConsumed,
  err: evidence.simulation.err,
  alts: evidence.build.alts,
  decision: evidence.decision,
  outAmount: quote.outAmount,
}));
