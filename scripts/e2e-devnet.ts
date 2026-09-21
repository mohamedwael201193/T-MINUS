/**
 * DEVNET e2e: place/cancel/fill/expire against a mock Token-2022 fee mint.
 * Label: DEVNET. Do not call the fixture SPACEX.
 */
import { config } from "dotenv";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import * as anchor from "@coral-xyz/anchor";
import {
  TOKEN_2022_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  createInitializeMintInstruction,
  createInitializeTransferFeeConfigInstruction,
  createMintToInstruction,
  getAssociatedTokenAddressSync,
  getMintLen,
  ExtensionType,
  getAccount,
} from "@solana/spl-token";
import {
  Keypair,
  Connection,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
  PublicKey,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
config({ path: resolve(root, ".env") });

function loadKeypair(path: string): Keypair {
  return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(readFileSync(path, "utf8")) as number[]));
}

async function main() {
const RPC = process.env.DEVNET_RPC_URL ?? "https://api.devnet.solana.com";
const PROGRAM_ID = new PublicKey(process.env.PROGRAM_ID ?? "HRLmVcuk6PRcVwB3UVpcbEC3LVVMhdLZfPvHtmL2PUdL");
const wallet = loadKeypair(process.env.ANCHOR_WALLET ?? `${process.env.USERPROFILE}\\.tminus\\keys\\user-fund.json`);
const connection = new Connection(RPC, "confirmed");
const provider = new anchor.AnchorProvider(connection, new anchor.Wallet(wallet), { commitment: "confirmed" });
anchor.setProvider(provider);

async function pause(ms = 1200) {
  await new Promise((r) => setTimeout(r, ms));
}

function ata(mint: PublicKey, owner: PublicKey) {
  return getAssociatedTokenAddressSync(mint, owner, true, TOKEN_2022_PROGRAM_ID);
}

async function ensureAta(payer: Keypair, mint: PublicKey, owner: PublicKey) {
  const addr = ata(mint, owner);
  const info = await connection.getAccountInfo(addr);
  if (info) return addr;
  const ix = createAssociatedTokenAccountInstruction(
    payer.publicKey, addr, owner, mint, TOKEN_2022_PROGRAM_ID
  );
  await sendAndConfirmTransaction(connection, new Transaction().add(ix), [payer]);
  await pause();
  return addr;
}

async function createFeeMint(payer: Keypair): Promise<Keypair> {
  const mint = Keypair.generate();
  const mintLen = getMintLen([ExtensionType.TransferFeeConfig]);
  const lamports = await connection.getMinimumBalanceForRentExemption(mintLen);
  const tx = new Transaction().add(
    SystemProgram.createAccount({
      fromPubkey: payer.publicKey,
      newAccountPubkey: mint.publicKey,
      space: mintLen,
      lamports,
      programId: TOKEN_2022_PROGRAM_ID,
    }),
    createInitializeTransferFeeConfigInstruction(
      mint.publicKey, payer.publicKey, payer.publicKey, 100,
      BigInt("18446744073709551615"), TOKEN_2022_PROGRAM_ID
    ),
    createInitializeMintInstruction(mint.publicKey, 9, payer.publicKey, null, TOKEN_2022_PROGRAM_ID)
  );
  await sendAndConfirmTransaction(connection, tx, [payer, mint]);
  await pause();
  return mint;
}

async function createPlainMint(payer: Keypair): Promise<Keypair> {
  const mint = Keypair.generate();
  const mintLen = getMintLen([]);
  const lamports = await connection.getMinimumBalanceForRentExemption(mintLen);
  const tx = new Transaction().add(
    SystemProgram.createAccount({
      fromPubkey: payer.publicKey,
      newAccountPubkey: mint.publicKey,
      space: mintLen,
      lamports,
      programId: TOKEN_2022_PROGRAM_ID,
    }),
    createInitializeMintInstruction(mint.publicKey, 8, payer.publicKey, null, TOKEN_2022_PROGRAM_ID)
  );
  await sendAndConfirmTransaction(connection, tx, [payer, mint]);
  await pause();
  return mint;
}

const idlPath = existsSync(resolve(root, "target/idl/tminus.json"))
  ? resolve(root, "target/idl/tminus.json")
  : resolve(root, "idl/tminus.json");
const idl = JSON.parse(readFileSync(idlPath, "utf8"));
const program = new anchor.Program(idl, provider);

const bal = await connection.getBalance(wallet.publicKey);
if (bal < 0.2 * LAMPORTS_PER_SOL) {
  throw new Error("insufficient_devnet_sol");
}

const srcMint = await createFeeMint(wallet);
const dstMint = await createPlainMint(wallet);
const filler = Keypair.generate();
const rentIx = SystemProgram.transfer({
  fromPubkey: wallet.publicKey,
  toPubkey: filler.publicKey,
  lamports: 80_000_000,
});
await sendAndConfirmTransaction(connection, new Transaction().add(rentIx), [wallet]);
const ownerAta = await ensureAta(wallet, srcMint.publicKey, wallet.publicKey);
const ownerDst = await ensureAta(wallet, dstMint.publicKey, wallet.publicKey);
const fillerSrc = await ensureAta(wallet, srcMint.publicKey, filler.publicKey);
const fillerDst = await ensureAta(wallet, dstMint.publicKey, filler.publicKey);
await sendAndConfirmTransaction(connection, new Transaction().add(
  createMintToInstruction(srcMint.publicKey, ownerAta, wallet.publicKey, 5_000_000_000, [], TOKEN_2022_PROGRAM_ID),
  createMintToInstruction(dstMint.publicKey, fillerDst, wallet.publicKey, 5_000_000_000, [], TOKEN_2022_PROGRAM_ID)
), [wallet]);

function pdaFor(nonce: bigint) {
  const n = Buffer.alloc(8);
  n.writeBigUInt64LE(nonce);
  return PublicKey.findProgramAddressSync([
    Buffer.from("order"), wallet.publicKey.toBuffer(), srcMint.publicKey.toBuffer(), dstMint.publicKey.toBuffer(), n
  ], PROGRAM_ID)[0];
}

const now = Math.floor(Date.now() / 1000);
const sigs: Record<string, string> = {};
const nonce = BigInt(Date.now());
const pda = pdaFor(nonce);
const escrow = ata(srcMint.publicKey, pda);

const placeSig = await program.methods.place(
  new anchor.BN(nonce.toString()),
  new anchor.BN(1_000_000),
  new anchor.BN(1_000_000_000),
  new anchor.BN(100_000_000),
  new anchor.BN(now + 3600),
  new anchor.BN(now + 7200),
  new anchor.BN(1),
  new anchor.BN(1_000_000_000)
).accounts({
  owner: wallet.publicKey,
  order: pda,
  srcMint: srcMint.publicKey,
  dstMint: dstMint.publicKey,
  ownerSrcAta: ownerAta,
  escrowAta: escrow,
  tokenProgram: TOKEN_2022_PROGRAM_ID,
  associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
  systemProgram: SystemProgram.programId,
}).rpc();
  await pause();
sigs.place = placeSig;
const escrowAmt = (await getAccount(connection, escrow, "confirmed", TOKEN_2022_PROGRAM_ID)).amount;
sigs.escrowPostFee = escrowAmt.toString();

const cancelNonce = nonce + 1n;
const cancelPda = pdaFor(cancelNonce);
const cancelEscrow = ata(srcMint.publicKey, cancelPda);
sigs.place2 = await program.methods.place(
  new anchor.BN(cancelNonce.toString()),
  new anchor.BN(1_000_000),
  new anchor.BN(1_000_000_000),
  new anchor.BN(100_000_000),
  new anchor.BN(now + 3600),
  new anchor.BN(now + 7200),
  new anchor.BN(1),
  new anchor.BN(1_000_000_000)
).accounts({
  owner: wallet.publicKey,
  order: cancelPda,
  srcMint: srcMint.publicKey,
  dstMint: dstMint.publicKey,
  ownerSrcAta: ownerAta,
  escrowAta: cancelEscrow,
  tokenProgram: TOKEN_2022_PROGRAM_ID,
  associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
  systemProgram: SystemProgram.programId,
}).rpc();
  await pause();
sigs.cancel = await program.methods.cancel().accounts({
  owner: wallet.publicKey,
  order: cancelPda,
  srcMint: srcMint.publicKey,
  ownerSrcAta: ownerAta,
  escrowAta: cancelEscrow,
  tokenProgram: TOKEN_2022_PROGRAM_ID,
}).rpc();
  await pause();

const remaining = Number(escrowAmt);
const minDst = Math.ceil((remaining * 1_000_000_000) / 1_000_000_000);
sigs.fill = await program.methods.fill(new anchor.BN(remaining), new anchor.BN(minDst)).accounts({
  filler: filler.publicKey,
  owner: wallet.publicKey,
  order: pda,
  srcMint: srcMint.publicKey,
  dstMint: dstMint.publicKey,
  escrowAta: escrow,
  ownerDstAta: ownerDst,
  fillerSrcAta: fillerSrc,
  fillerDstAta: fillerDst,
  tokenProgram: TOKEN_2022_PROGRAM_ID,
  dstTokenProgram: TOKEN_2022_PROGRAM_ID,
}).signers([filler]).rpc();
  await pause();

const expireNonce = nonce + 2n;
const expirePda = pdaFor(expireNonce);
const expireEscrow = ata(srcMint.publicKey, expirePda);
sigs.place3 = await program.methods.place(
  new anchor.BN(expireNonce.toString()),
  new anchor.BN(1_000_000),
  new anchor.BN(1_000_000_000),
  new anchor.BN(100_000_000),
  new anchor.BN(1),
  new anchor.BN(1),
  new anchor.BN(1),
  new anchor.BN(1_000_000_000)
).accounts({
  owner: wallet.publicKey,
  order: expirePda,
  srcMint: srcMint.publicKey,
  dstMint: dstMint.publicKey,
  ownerSrcAta: ownerAta,
  escrowAta: expireEscrow,
  tokenProgram: TOKEN_2022_PROGRAM_ID,
  associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
  systemProgram: SystemProgram.programId,
}).rpc();
  await pause();
sigs.expire = await program.methods.expire().accounts({
  owner: wallet.publicKey,
  crank: wallet.publicKey,
  order: expirePda,
  srcMint: srcMint.publicKey,
  ownerSrcAta: ownerAta,
  escrowAta: expireEscrow,
  tokenProgram: TOKEN_2022_PROGRAM_ID,
}).rpc();
  await pause();

const out = {
  label: "DEVNET",
  programId: PROGRAM_ID.toBase58(),
  mockSrcMint: srcMint.publicKey.toBase58(),
  mockDstMint: dstMint.publicKey.toBase58(),
  payer: wallet.publicKey.toBase58(),
  filler: filler.publicKey.toBase58(),
  orderPda: pda.toBase58(),
  escrowAta: escrow.toBase58(),
  cancelPda: cancelPda.toBase58(),
  expirePda: expirePda.toBase58(),
  signatures: sigs,
  explorer: Object.fromEntries(
    Object.entries(sigs)
      .filter(([, v]) => /^[1-9A-HJ-NP-Za-km-z]{32,88}$/.test(v))
      .map(([k, v]) => [k, `https://explorer.solana.com/tx/${v}?cluster=devnet`])
  ),
};
mkdirSync(resolve(root, "evidence"), { recursive: true });
writeFileSync(resolve(root, "evidence/devnet-e2e.json"), JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 2));
void ownerDst;
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
