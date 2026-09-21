/**
 * DEVNET: one fill drains escrow; a second fill must fail.
 * Two concurrent full fills: exactly one confirms.
 * Fixture mints are not SPACEX.
 */
import { config } from "dotenv";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import * as anchor from "@coral-xyz/anchor";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  createInitializeMintInstruction,
  createInitializeTransferFeeConfigInstruction,
  createMintToInstruction,
  ExtensionType,
  getAccount,
  getAssociatedTokenAddressSync,
  getMintLen,
} from "@solana/spl-token";
import {
  ComputeBudgetProgram,
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionMessage,
  VersionedTransaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import { PROGRAM_ID as DECLARED } from "@tminus/sdk";
import { fillIx } from "../apps/keeper/src/ix.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
config({ path: resolve(root, ".env") });
const PROGRAM_ID = new PublicKey(process.env.PROGRAM_ID ?? DECLARED);

function loadKeypair(path: string): Keypair {
  return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(readFileSync(path, "utf8")) as number[]));
}
async function pause(ms = 1200) {
  await new Promise((r) => setTimeout(r, ms));
}
function ata(mint: PublicKey, owner: PublicKey) {
  return getAssociatedTokenAddressSync(mint, owner, true, TOKEN_2022_PROGRAM_ID);
}

async function main() {
  const RPC = process.env.DEVNET_RPC_URL ?? "https://api.devnet.solana.com";
  const wallet = loadKeypair(
    process.env.ANCHOR_WALLET ?? `${process.env.USERPROFILE}\\.tminus\\keys\\user-fund.json`
  );
  const connection = new Connection(RPC, "confirmed");
  const provider = new anchor.AnchorProvider(connection, new anchor.Wallet(wallet), {
    commitment: "confirmed",
  });
  anchor.setProvider(provider);
  const idlPath = existsSync(resolve(root, "target/idl/tminus.json"))
    ? resolve(root, "target/idl/tminus.json")
    : resolve(root, "idl/tminus.json");
  const program = new anchor.Program(JSON.parse(readFileSync(idlPath, "utf8")), provider);
  if ((await connection.getBalance(wallet.publicKey)) < 0.35 * LAMPORTS_PER_SOL) {
    throw new Error("insufficient_devnet_sol");
  }

  async function ensureAta(payer: Keypair, mint: PublicKey, owner: PublicKey) {
    const addr = ata(mint, owner);
    if (await connection.getAccountInfo(addr)) return addr;
    await sendAndConfirmTransaction(
      connection,
      new Transaction().add(
        createAssociatedTokenAccountInstruction(payer.publicKey, addr, owner, mint, TOKEN_2022_PROGRAM_ID)
      ),
      [payer]
    );
    await pause();
    return addr;
  }
  async function createFeeMint(payer: Keypair) {
    const mint = Keypair.generate();
    const mintLen = getMintLen([ExtensionType.TransferFeeConfig]);
    const lamports = await connection.getMinimumBalanceForRentExemption(mintLen);
    await sendAndConfirmTransaction(
      connection,
      new Transaction().add(
        SystemProgram.createAccount({
          fromPubkey: payer.publicKey,
          newAccountPubkey: mint.publicKey,
          space: mintLen,
          lamports,
          programId: TOKEN_2022_PROGRAM_ID,
        }),
        createInitializeTransferFeeConfigInstruction(
          mint.publicKey,
          payer.publicKey,
          payer.publicKey,
          100,
          BigInt("18446744073709551615"),
          TOKEN_2022_PROGRAM_ID
        ),
        createInitializeMintInstruction(mint.publicKey, 9, payer.publicKey, null, TOKEN_2022_PROGRAM_ID)
      ),
      [payer, mint]
    );
    await pause();
    return mint;
  }
  async function createPlainMint(payer: Keypair) {
    const mint = Keypair.generate();
    const mintLen = getMintLen([]);
    const lamports = await connection.getMinimumBalanceForRentExemption(mintLen);
    await sendAndConfirmTransaction(
      connection,
      new Transaction().add(
        SystemProgram.createAccount({
          fromPubkey: payer.publicKey,
          newAccountPubkey: mint.publicKey,
          space: mintLen,
          lamports,
          programId: TOKEN_2022_PROGRAM_ID,
        }),
        createInitializeMintInstruction(mint.publicKey, 8, payer.publicKey, null, TOKEN_2022_PROGRAM_ID)
      ),
      [payer, mint]
    );
    await pause();
    return mint;
  }

  const srcMint = await createFeeMint(wallet);
  const dstMint = await createPlainMint(wallet);
  const a = Keypair.generate();
  const b = Keypair.generate();
  await sendAndConfirmTransaction(
    connection,
    new Transaction().add(
      SystemProgram.transfer({ fromPubkey: wallet.publicKey, toPubkey: a.publicKey, lamports: 80_000_000 }),
      SystemProgram.transfer({ fromPubkey: wallet.publicKey, toPubkey: b.publicKey, lamports: 80_000_000 })
    ),
    [wallet]
  );
  await pause();
  const ownerAta = await ensureAta(wallet, srcMint.publicKey, wallet.publicKey);
  const ownerDst = await ensureAta(wallet, dstMint.publicKey, wallet.publicKey);
  const aSrc = await ensureAta(wallet, srcMint.publicKey, a.publicKey);
  const aDst = await ensureAta(wallet, dstMint.publicKey, a.publicKey);
  const bSrc = await ensureAta(wallet, srcMint.publicKey, b.publicKey);
  const bDst = await ensureAta(wallet, dstMint.publicKey, b.publicKey);
  await sendAndConfirmTransaction(
    connection,
    new Transaction().add(
      createMintToInstruction(srcMint.publicKey, ownerAta, wallet.publicKey, 5_000_000_000, [], TOKEN_2022_PROGRAM_ID),
      createMintToInstruction(dstMint.publicKey, aDst, wallet.publicKey, 5_000_000_000, [], TOKEN_2022_PROGRAM_ID),
      createMintToInstruction(dstMint.publicKey, bDst, wallet.publicKey, 5_000_000_000, [], TOKEN_2022_PROGRAM_ID)
    ),
    [wallet]
  );
  await pause();

  function pdaFor(nonce: bigint) {
    const n = Buffer.alloc(8);
    n.writeBigUInt64LE(nonce);
    return PublicKey.findProgramAddressSync(
      [Buffer.from("order"), wallet.publicKey.toBuffer(), srcMint.publicKey.toBuffer(), dstMint.publicKey.toBuffer(), n],
      PROGRAM_ID
    )[0];
  }
  async function place(nonce: bigint) {
    const pda = pdaFor(nonce);
    const escrow = ata(srcMint.publicKey, pda);
    const now = Math.floor(Date.now() / 1000);
    const sig = await program.methods
      .place(
        new anchor.BN(nonce.toString()),
        new anchor.BN(1_000_000),
        new anchor.BN(1_000_000_000),
        new anchor.BN(1_000_000_000),
        new anchor.BN(now + 3600),
        new anchor.BN(now + 7200),
        new anchor.BN(1),
        new anchor.BN(1_000_000_000)
      )
      .accounts({
        owner: wallet.publicKey,
        order: pda,
        srcMint: srcMint.publicKey,
        dstMint: dstMint.publicKey,
        ownerSrcAta: ownerAta,
        escrowAta: escrow,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
    await pause();
    const remaining = (await getAccount(connection, escrow, "confirmed", TOKEN_2022_PROGRAM_ID)).amount;
    return { pda, escrow, sig, remaining };
  }

  async function sendFill(filler: Keypair, fillerSrc: PublicKey, fillerDst: PublicKey, pda: PublicKey, escrow: PublicKey, fillSrc: bigint, skipPreflight: boolean) {
    const ix = fillIx({
      programId: PROGRAM_ID,
      filler: filler.publicKey,
      owner: wallet.publicKey,
      order: pda,
      srcMint: srcMint.publicKey,
      dstMint: dstMint.publicKey,
      escrowAta: escrow,
      ownerDstAta: ownerDst,
      fillerSrcAta: fillerSrc,
      fillerDstAta: fillerDst,
      fillSrcRaw: fillSrc,
      dstRaw: fillSrc,
    });
    const latest = await connection.getLatestBlockhash("confirmed");
    const tx = new VersionedTransaction(
      new TransactionMessage({
        payerKey: filler.publicKey,
        recentBlockhash: latest.blockhash,
        instructions: [ComputeBudgetProgram.setComputeUnitLimit({ units: 400_000 }), ix],
      }).compileToV0Message()
    );
    tx.sign([filler]);
    const sig = await connection.sendTransaction(tx, { skipPreflight });
    const conf = await connection.confirmTransaction(
      { signature: sig, blockhash: latest.blockhash, lastValidBlockHeight: latest.lastValidBlockHeight },
      "confirmed"
    );
    return { sig, err: conf.value.err };
  }

  const race = await place(BigInt(Date.now()));
  const [r1, r2] = await Promise.all([
    sendFill(a, aSrc, aDst, race.pda, race.escrow, race.remaining, true).catch((e) => ({
      sig: null,
      err: e instanceof Error ? e.message : "send_fail",
    })),
    sendFill(b, bSrc, bDst, race.pda, race.escrow, race.remaining, true).catch((e) => ({
      sig: null,
      err: e instanceof Error ? e.message : "send_fail",
    })),
  ]);
  const raceWins = [r1, r2].filter((r) => r.sig && !r.err).length;
  const raceFails = [r1, r2].filter((r) => !r.sig || r.err).length;

  const seq = await place(BigInt(Date.now() + 7));
  const first = await sendFill(a, aSrc, aDst, seq.pda, seq.escrow, seq.remaining, false);
  await pause();
  const second = await sendFill(b, bSrc, bDst, seq.pda, seq.escrow, seq.remaining, true).catch((e) => ({
    sig: null,
    err: e instanceof Error ? e.message : "send_fail",
  }));
  const seqAccount = await connection.getAccountInfo(seq.pda);

  const evidence = {
    label: "DEVNET_DOUBLE_FILL",
    notSpacex: true,
    programId: PROGRAM_ID.toBase58(),
    race: {
      pda: race.pda.toBase58(),
      remaining: race.remaining.toString(),
      wins: raceWins,
      fails: raceFails,
      a: r1,
      b: r2,
    },
    sequential: {
      pda: seq.pda.toBase58(),
      first,
      second,
      orderAccountAfter: seqAccount ? "present" : "closed",
    },
    explorer: {
      raceA: r1.sig ? `https://explorer.solana.com/tx/${r1.sig}?cluster=devnet` : null,
      raceB: r2.sig ? `https://explorer.solana.com/tx/${r2.sig}?cluster=devnet` : null,
      seqFirst: first.sig ? `https://explorer.solana.com/tx/${first.sig}?cluster=devnet` : null,
    },
  };
  if (raceWins !== 1 || first.err || !second.err) {
    throw new Error(`double_fill_invariant_failed ${JSON.stringify(evidence)}`);
  }
  mkdirSync(resolve(root, "evidence"), { recursive: true });
  writeFileSync(resolve(root, "evidence/devnet-double-fill.json"), JSON.stringify(evidence, null, 2));
  console.log(JSON.stringify({
    label: evidence.label,
    raceWins,
    raceFails,
    sequentialFirstErr: first.err,
    sequentialSecondErr: second.err,
    sequentialOrderAfter: evidence.sequential.orderAccountAfter,
  }));
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
