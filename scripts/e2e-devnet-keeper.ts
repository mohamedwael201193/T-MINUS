/**
 * DEVNET keeper-path proof: place, two inventory fills via keeper fillIx, close.
 * Label: DEVNET. Fixture mints are not SPACEX. Spends a little of the user-fund SOL.
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
  TransactionMessage,
  VersionedTransaction,
  sendAndConfirmTransaction,
  PublicKey,
  LAMPORTS_PER_SOL,
  ComputeBudgetProgram,
} from "@solana/web3.js";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { ceilRatio, PROGRAM_ID as DECLARED } from "@tminus/sdk";
import { fillIx } from "../apps/keeper/src/ix.ts";
import { chooseFillPlan } from "../apps/keeper/src/policy.ts";
import postgres from "postgres";
import { loadRenderDbUrls } from "./live-sql.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
config({ path: resolve(root, ".env") });

const API = "https://tminus-api-k2d2.onrender.com";
const PROGRAM_ID = new PublicKey(process.env.PROGRAM_ID ?? DECLARED);

function loadKeypair(path: string): Keypair {
  return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(readFileSync(path, "utf8")) as number[]));
}

async function pause(ms = 1200) {
  await new Promise((r) => setTimeout(r, ms));
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

  function ata(mint: PublicKey, owner: PublicKey) {
    return getAssociatedTokenAddressSync(mint, owner, true, TOKEN_2022_PROGRAM_ID);
  }

  async function ensureAta(payer: Keypair, mint: PublicKey, owner: PublicKey) {
    const addr = ata(mint, owner);
    const info = await connection.getAccountInfo(addr);
    if (info) return addr;
    const ix = createAssociatedTokenAccountInstruction(
      payer.publicKey,
      addr,
      owner,
      mint,
      TOKEN_2022_PROGRAM_ID
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
        mint.publicKey,
        payer.publicKey,
        payer.publicKey,
        100,
        BigInt("18446744073709551615"),
        TOKEN_2022_PROGRAM_ID
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
  if (bal < 0.25 * LAMPORTS_PER_SOL) {
    throw new Error("insufficient_devnet_sol");
  }

  const srcMint = await createFeeMint(wallet);
  const dstMint = await createPlainMint(wallet);
  const filler = Keypair.generate();
  await sendAndConfirmTransaction(
    connection,
    new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: wallet.publicKey,
        toPubkey: filler.publicKey,
        lamports: 80_000_000,
      })
    ),
    [wallet]
  );
  await pause();
  const ownerAta = await ensureAta(wallet, srcMint.publicKey, wallet.publicKey);
  const ownerDst = await ensureAta(wallet, dstMint.publicKey, wallet.publicKey);
  const fillerSrc = await ensureAta(wallet, srcMint.publicKey, filler.publicKey);
  const fillerDst = await ensureAta(wallet, dstMint.publicKey, filler.publicKey);
  await sendAndConfirmTransaction(
    connection,
    new Transaction().add(
      createMintToInstruction(
        srcMint.publicKey,
        ownerAta,
        wallet.publicKey,
        5_000_000_000,
        [],
        TOKEN_2022_PROGRAM_ID
      ),
      createMintToInstruction(
        dstMint.publicKey,
        fillerDst,
        wallet.publicKey,
        5_000_000_000,
        [],
        TOKEN_2022_PROGRAM_ID
      )
    ),
    [wallet]
  );
  await pause();

  const nonce = BigInt(Date.now());
  const nbuf = Buffer.alloc(8);
  nbuf.writeBigUInt64LE(nonce);
  const pda = PublicKey.findProgramAddressSync(
    [
      Buffer.from("order"),
      wallet.publicKey.toBuffer(),
      srcMint.publicKey.toBuffer(),
      dstMint.publicKey.toBuffer(),
      nbuf,
    ],
    PROGRAM_ID
  )[0];
  const escrow = ata(srcMint.publicKey, pda);
  const now = Math.floor(Date.now() / 1000);
  const minRatio = 1_000_000_000n;

  const placeSig = await program.methods
    .place(
      new anchor.BN(nonce.toString()),
      new anchor.BN(1_000_000),
      new anchor.BN(minRatio.toString()),
      new anchor.BN(100_000_000),
      new anchor.BN(now + 3600),
      new anchor.BN(now + 7200),
      new anchor.BN(300_000),
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
  const escrowPostFee = (await getAccount(connection, escrow, "confirmed", TOKEN_2022_PROGRAM_ID)).amount;

  async function probeOrder() {
    const res = await fetch(`${API}/v1/orders/${pda.toBase58()}?cluster=devnet`);
    const body = await res.json();
    return { status: res.status, body };
  }

  const afterPlace = await probeOrder();

  async function sendFill(fillSrc: bigint, inventory: bigint) {
    const plan = chooseFillPlan({
      remaining: (await getAccount(connection, escrow, "confirmed", TOKEN_2022_PROGRAM_ID)).amount,
      cap: fillSrc,
      minFill: 300_000n,
      floorE9: minRatio,
      inventoryDst: inventory,
      quoteIn: null,
      quoteOut: null,
      allowInventoryWithoutQuote: true,
    });
    if (plan.action !== "inventory") {
      throw new Error(`unexpected_plan_${plan.action}_${"reason" in plan ? plan.reason : ""}`);
    }
    const dstRaw = ceilRatio(fillSrc, minRatio);
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
      dstRaw,
    });
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");
    const msg = new TransactionMessage({
      payerKey: filler.publicKey,
      recentBlockhash: blockhash,
      instructions: [ComputeBudgetProgram.setComputeUnitLimit({ units: 400_000 }), ix],
    }).compileToV0Message();
    const tx = new VersionedTransaction(msg);
    tx.sign([filler]);
    const sig = await connection.sendTransaction(tx, { skipPreflight: false });
    const conf = await connection.confirmTransaction(
      { signature: sig, blockhash, lastValidBlockHeight },
      "confirmed"
    );
    if (conf.value.err) throw new Error(`fill_err_${JSON.stringify(conf.value.err)}`);
    await pause();
    return { sig, dstRaw: dstRaw.toString(), fillSrc: fillSrc.toString(), plan };
  }

  const firstSrc = 400_000n;
  const first = await sendFill(
    firstSrc,
    (await getAccount(connection, fillerDst, "confirmed", TOKEN_2022_PROGRAM_ID)).amount
  );
  const afterFirst = await probeOrder();
  const remainingAfterFirst = (await getAccount(connection, escrow, "confirmed", TOKEN_2022_PROGRAM_ID)).amount;
  const second = await sendFill(
    remainingAfterFirst,
    (await getAccount(connection, fillerDst, "confirmed", TOKEN_2022_PROGRAM_ID)).amount
  );
  const afterSecond = await probeOrder();
  const ownerDstAmt = (await getAccount(connection, ownerDst, "confirmed", TOKEN_2022_PROGRAM_ID)).amount;

  const evidence = {
    label: "DEVNET_KEEPER_FILL",
    notSpacex: true,
    programId: PROGRAM_ID.toBase58(),
    payer: wallet.publicKey.toBase58(),
    filler: filler.publicKey.toBase58(),
    mockSrcMint: srcMint.publicKey.toBase58(),
    mockDstMint: dstMint.publicKey.toBase58(),
    orderPda: pda.toBase58(),
    escrowPostFeeRaw: escrowPostFee.toString(),
    composition: "two_tx_inventory_fallback",
    fillIxUsed: true,
    signatures: {
      place: placeSig,
      fillPartial: first.sig,
      fillClose: second.sig,
    },
    explorer: {
      place: `https://explorer.solana.com/tx/${placeSig}?cluster=devnet`,
      fillPartial: `https://explorer.solana.com/tx/${first.sig}?cluster=devnet`,
      fillClose: `https://explorer.solana.com/tx/${second.sig}?cluster=devnet`,
      order: `https://explorer.solana.com/address/${pda.toBase58()}?cluster=devnet`,
    },
    liveOrders: {
      afterPlace: afterPlace,
      afterFirst: afterFirst,
      afterSecond: afterSecond,
    },
    ownerDestinationAfter: ownerDstAmt.toString(),
    remainingAfterFirst: remainingAfterFirst.toString(),
  };

  mkdirSync(resolve(root, "evidence"), { recursive: true });
  writeFileSync(resolve(root, "evidence/devnet-keeper-fill.json"), JSON.stringify(evidence, null, 2));

  const db = await loadRenderDbUrls();
  if (db) {
    const sql = postgres(db.directUrl, { prepare: false, max: 1 });
    for (const [kind, sig] of [
      ["place", placeSig],
      ["fill", first.sig],
      ["fill", second.sig],
    ] as const) {
      const parsed = await connection.getTransaction(sig, {
        maxSupportedTransactionVersion: 0,
        commitment: "confirmed",
      });
      const slot = parsed?.slot ?? 0;
      const payload = {
        orderPda: pda.toBase58(),
        sig,
        slot,
        sourceAmount: kind === "place" ? escrowPostFee.toString() : kind === "fill" ? (sig === first.sig ? first.fillSrc : second.fillSrc) : "0",
        destinationAmount: kind === "fill" ? (sig === first.sig ? first.dstRaw : second.dstRaw) : "0",
        ratio: kind === "fill" ? minRatio.toString() : null,
        failsafeFlag: false,
        route: { composition: "two_tx_inventory_fallback", fillIxUsed: true },
        feedHash: null,
        timestamp: new Date((parsed?.blockTime ?? 0) * 1000).toISOString(),
        network: "DEVNET",
        kind,
        explorer: `https://explorer.solana.com/tx/${sig}?cluster=devnet`,
        programId: PROGRAM_ID.toBase58(),
      };
      await sql`
        insert into receipts (order_pda, sig, slot, payload)
        values (${pda.toBase58()}, ${sig}, ${slot}, ${sql.json(payload as never)})
        on conflict (sig) do update set payload = excluded.payload, slot = excluded.slot
      `;
    }
    await sql.end({ timeout: 5 });
  }

  console.log(
    JSON.stringify({
      label: evidence.label,
      orderPda: evidence.orderPda,
      escrowPostFeeRaw: evidence.escrowPostFeeRaw,
      remainingAfterFirst: evidence.remainingAfterFirst,
      ownerDestinationAfter: evidence.ownerDestinationAfter,
      liveAfterPlace: afterPlace.status,
      liveAfterFirst: afterFirst.status,
      liveAfterSecond: afterSecond.status,
      fillPartial: first.sig,
      fillClose: second.sig,
    })
  );
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.stack ?? err.message : err);
  process.exit(1);
});
