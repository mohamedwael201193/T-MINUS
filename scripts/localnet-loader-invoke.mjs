import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  Connection,
  Keypair,
  Transaction,
  TransactionInstruction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";

const WORKDIR = process.env.TMINUS_LOADER_EXP
  || (process.env.HOME ? `${process.env.HOME}/.tminus/loader-cost-exp` : null)
  || "D:/route/sol/T-MINUS/.tmp-loader-exp";
const payer = Keypair.fromSecretKey(
  Uint8Array.from(JSON.parse(readFileSync(`${WORKDIR}/tight-payer.json`, "utf8"))),
);
const program = Keypair.fromSecretKey(
  Uint8Array.from(JSON.parse(readFileSync(`${WORKDIR}/program-tight.json`, "utf8"))),
);
const programId = program.publicKey;
const connection = new Connection("http://127.0.0.1:8899", "confirmed");
const ix = new TransactionInstruction({
  programId,
  keys: [{ pubkey: payer.publicKey, isSigner: true, isWritable: false }],
  data: Buffer.alloc(8),
});
const tx = new Transaction().add(ix);
let result;
try {
  const sig = await sendAndConfirmTransaction(connection, tx, [payer], {
    commitment: "confirmed",
  });
  result = { ok: true, signature: sig };
} catch (err) {
  const message = String(err.message || err);
  result = {
    ok: false,
    logs: err.logs ?? null,
    message,
    programWasInvoked: /custom program error|Error processing Instruction|InstructionError|failed: custom program error|AnchorError|InstructionFallbackNotFound/i.test(
      message + JSON.stringify(err.logs || []),
    ),
  };
}
const info = await connection.getAccountInfo(programId);
result.executable = Boolean(info?.executable);
result.owner = info?.owner.toBase58() ?? null;
result.lamports = info?.lamports ?? null;
const payload = {
  label: "LOCALNET_LOADER_INVOKE",
  at: new Date().toISOString(),
  programId: programId.toBase58(),
  ...result,
};
const evidencePaths = [
  "D:/route/sol/T-MINUS/evidence/localnet-loader-invoke.json",
  "/mnt/d/route/sol/T-MINUS/evidence/localnet-loader-invoke.json",
  resolve("evidence/localnet-loader-invoke.json"),
];
for (const p of evidencePaths) {
  try {
    writeFileSync(p, JSON.stringify(payload, null, 2));
    break;
  } catch {}
}
console.log(JSON.stringify(payload, null, 2));
