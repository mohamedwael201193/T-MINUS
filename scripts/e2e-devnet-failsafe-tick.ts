/**
 * DEVNET failsafe-path fill through the real keeper tick().
 * Control order (min_ratio 2e9, failsafe in the future) must reject a 1:1 fill.
 * Failsafe order (same min_ratio, failsafe already reached, floor 1e9) is filled
 * by tick() using inventory without a Jupiter quote.
 * Fixture mints are not SPACEX. KEEPER_SEND_ENABLED stays false on Render.
 */
import { config } from "dotenv";
import { spawn } from "node:child_process";
import { mkdtempSync, writeFileSync, mkdirSync, readFileSync, existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
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
import { decodeOrder, OPEN_STATUS_MEMCMP_BYTES, ORDER_STATUS_OFFSET, PROGRAM_ID as DECLARED } from "@tminus/sdk";
import { fillIx } from "../apps/keeper/src/ix.ts";

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

  const leftover = await connection.getProgramAccounts(PROGRAM_ID, {
    filters: [{ memcmp: { offset: ORDER_STATUS_OFFSET, bytes: OPEN_STATUS_MEMCMP_BYTES } }],
  });
  for (const acc of leftover) {
    try {
      const order = decodeOrder(Buffer.from(acc.account.data));
      if (!order.owner.equals(wallet.publicKey)) continue;
      await program.methods
        .cancel()
        .accounts({
          owner: wallet.publicKey,
          order: acc.pubkey,
          srcMint: order.srcMint,
          ownerSrcAta: ata(order.srcMint, wallet.publicKey),
          escrowAta: order.escrowAta,
          tokenProgram: TOKEN_2022_PROGRAM_ID,
        })
        .rpc();
      await pause();
    } catch {
      /* leftover from a prior interrupted run; continue */
    }
  }

  const bal = await connection.getBalance(wallet.publicKey);
  if (bal < 0.3 * LAMPORTS_PER_SOL) throw new Error("insufficient_devnet_sol");

  async function ensureAta(payer: Keypair, mint: PublicKey, owner: PublicKey) {
    const addr = ata(mint, owner);
    if (await connection.getAccountInfo(addr)) return addr;
    await sendAndConfirmTransaction(
      connection,
      new Transaction().add(
        createAssociatedTokenAccountInstruction(
          payer.publicKey,
          addr,
          owner,
          mint,
          TOKEN_2022_PROGRAM_ID
        )
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
  const filler = Keypair.generate();
  await sendAndConfirmTransaction(
    connection,
    new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: wallet.publicKey,
        toPubkey: filler.publicKey,
        lamports: 90_000_000,
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
        1_200_000,
        [],
        TOKEN_2022_PROGRAM_ID
      )
    ),
    [wallet]
  );
  await pause();

  function pdaFor(nonce: bigint) {
    const n = Buffer.alloc(8);
    n.writeBigUInt64LE(nonce);
    return PublicKey.findProgramAddressSync(
      [
        Buffer.from("order"),
        wallet.publicKey.toBuffer(),
        srcMint.publicKey.toBuffer(),
        dstMint.publicKey.toBuffer(),
        n,
      ],
      PROGRAM_ID
    )[0];
  }

  async function place(nonce: bigint, failsafeTs: number, hardExpiryTs: number) {
    const pda = pdaFor(nonce);
    const escrow = ata(srcMint.publicKey, pda);
    const sig = await program.methods
      .place(
        new anchor.BN(nonce.toString()),
        new anchor.BN(1_000_000),
        new anchor.BN(2_000_000_000),
        new anchor.BN(1_000_000_000),
        new anchor.BN(failsafeTs),
        new anchor.BN(hardExpiryTs),
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
    return { pda, escrow, sig };
  }

  const now = Math.floor(Date.now() / 1000);
  const nonceFs = BigInt(Date.now());
  const failsafe = await place(nonceFs, now - 60, now + 7200);
  const control = await place(nonceFs + 1n, now + 3600, now + 7200);

  const illegalIx = fillIx({
    programId: PROGRAM_ID,
    filler: filler.publicKey,
    owner: wallet.publicKey,
    order: control.pda,
    srcMint: srcMint.publicKey,
    dstMint: dstMint.publicKey,
    escrowAta: control.escrow,
    ownerDstAta: ownerDst,
    fillerSrcAta: fillerSrc,
    fillerDstAta: fillerDst,
    fillSrcRaw: 400_000n,
    dstRaw: 400_000n,
  });
  const { blockhash } = await connection.getLatestBlockhash("confirmed");
  const illegalTx = new VersionedTransaction(
    new TransactionMessage({
      payerKey: filler.publicKey,
      recentBlockhash: blockhash,
      instructions: [ComputeBudgetProgram.setComputeUnitLimit({ units: 400_000 }), illegalIx],
    }).compileToV0Message()
  );
  const illegalSim = await connection.simulateTransaction(illegalTx, {
    sigVerify: false,
    replaceRecentBlockhash: true,
  });

  const openBefore = await connection.getProgramAccounts(PROGRAM_ID, {
    filters: [{ memcmp: { offset: ORDER_STATUS_OFFSET, bytes: OPEN_STATUS_MEMCMP_BYTES } }],
  });
  const ourOpen = openBefore.filter(
    (a) => a.pubkey.equals(failsafe.pda) || a.pubkey.equals(control.pda)
  ).length;

  await fetch(`${API}/v1/feed/refresh`).catch(() => null);

  const tmp = mkdtempSync(join(tmpdir(), "tminus-"));
  const fillerPath = join(tmp, "filler.json");
  writeFileSync(fillerPath, JSON.stringify(Array.from(filler.secretKey)));

  const { loadRenderDbUrls } = await import("./live-sql.ts");
  const db = await loadRenderDbUrls();
  if (!db) throw new Error("missing_render_db_urls");

  const tickResult = await new Promise<{ code: number | null; out: string }>((resolve) => {
    const child = spawn(
      process.execPath,
      ["--import", "tsx", "scripts/keeper-tick-once.ts"],
      {
        cwd: root,
        env: {
          ...process.env,
          DATABASE_URL: db.databaseUrl,
          DIRECT_URL: db.directUrl,
          SOLANA_RPC_URL: RPC,
          SOLANA_NETWORK: "devnet",
          PROGRAM_ID: PROGRAM_ID.toBase58(),
          SPACEX_MINT: srcMint.publicKey.toBase58(),
          SPCXX_MINT: dstMint.publicKey.toBase58(),
          KEEPER_KEYPAIR_PATH: fillerPath,
          KEEPER_KEYPAIR_JSON: "",
          KEEPER_SEND_ENABLED: "true",
          KEEPER_INVENTORY_WITHOUT_QUOTE: "true",
          KEEPER_SPEND_CAP_RAW: "200000000",
          KEEPER_WORKER_ID: "devnet-failsafe-tick-1",
          FEED_STALE_MS: "900000",
        },
        stdio: ["ignore", "pipe", "pipe"],
      }
    );
    let out = "";
    child.stdout.on("data", (d) => {
      out += d.toString();
    });
    child.stderr.on("data", (d) => {
      out += d.toString();
    });
    child.on("close", (code) => resolve({ code, out }));
  });

  const tickLines = tickResult.out
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  let tickJson: Record<string, unknown> | null = null;
  for (const line of tickLines) {
    try {
      const parsed = JSON.parse(line) as Record<string, unknown>;
      if (parsed.label === "KEEPER_TICK_ONCE") tickJson = parsed;
    } catch {
      /* skip non-json log lines */
    }
  }
  if (!tickJson?.lastFillSig) {
    throw new Error(`tick_did_not_fill code=${tickResult.code} out=${tickResult.out.slice(-1500)}`);
  }
  rmSync(tmp, { recursive: true, force: true });

  const fillSig = String(tickJson.lastFillSig);
  await pause(1500);
  const fsAfter = await connection.getAccountInfo(failsafe.pda);
  const controlAfter = await connection.getAccountInfo(control.pda);
  const ownerDstAmt = (await getAccount(connection, ownerDst, "confirmed", TOKEN_2022_PROGRAM_ID)).amount;

  const cancelSig = await program.methods
    .cancel()
    .accounts({
      owner: wallet.publicKey,
      order: control.pda,
      srcMint: srcMint.publicKey,
      ownerSrcAta: ownerAta,
      escrowAta: control.escrow,
      tokenProgram: TOKEN_2022_PROGRAM_ID,
    })
    .rpc();
  await pause();

  const parsedFill = await connection.getTransaction(fillSig, {
    maxSupportedTransactionVersion: 0,
    commitment: "confirmed",
  });
  const evidence = {
    label: "DEVNET_FAILSAFE_KEEPER_TICK",
    notSpacex: true,
    programId: PROGRAM_ID.toBase58(),
    payer: wallet.publicKey.toBase58(),
    filler: filler.publicKey.toBase58(),
    mockSrcMint: srcMint.publicKey.toBase58(),
    mockDstMint: dstMint.publicKey.toBase58(),
    failsafePda: failsafe.pda.toBase58(),
    controlPda: control.pda.toBase58(),
    memcmpOpenCountOurs: ourOpen,
    illegalOneToOneOnControl: {
      err: illegalSim.value.err,
      logsPreview: (illegalSim.value.logs ?? []).slice(-8),
    },
    tick: {
      exitCode: tickResult.code,
      lastFillSig: fillSig,
      halted: tickJson.halted,
      haltReason: tickJson.haltReason,
      composition: tickJson.composition,
      lastJupiterError: tickJson.lastJupiterError ?? null,
    },
    failsafeAccountAfterTick: fsAfter ? "present" : "closed",
    controlAccountAfterTick: controlAfter ? "present" : "closed",
    ownerDestinationAfter: ownerDstAmt.toString(),
    signatures: {
      placeFailsafe: failsafe.sig,
      placeControl: control.sig,
      keeperFill: fillSig,
      cancelControl: cancelSig,
    },
    explorer: {
      keeperFill: `https://explorer.solana.com/tx/${fillSig}?cluster=devnet`,
      placeFailsafe: `https://explorer.solana.com/tx/${failsafe.sig}?cluster=devnet`,
      cancelControl: `https://explorer.solana.com/tx/${cancelSig}?cluster=devnet`,
    },
    fillSlot: parsedFill?.slot ?? null,
  };
  mkdirSync(resolve(root, "evidence"), { recursive: true });
  writeFileSync(resolve(root, "evidence/devnet-failsafe-tick.json"), JSON.stringify(evidence, null, 2));

  if (db && parsedFill) {
    const postgres = (await import("postgres")).default;
    const sql = postgres(db.directUrl, { prepare: false, max: 1 });
    const payload = {
      orderPda: failsafe.pda.toBase58(),
      sig: fillSig,
      slot: parsedFill.slot,
      sourceAmount: "990000",
      destinationAmount: ownerDstAmt.toString(),
      ratio: "1000000000",
      failsafeFlag: true,
      route: { composition: tickJson.composition, keeperTick: true },
      timestamp: new Date((parsedFill.blockTime ?? 0) * 1000).toISOString(),
      network: "DEVNET",
      kind: "fill",
      explorer: evidence.explorer.keeperFill,
      programId: PROGRAM_ID.toBase58(),
    };
    await sql`
      insert into receipts (order_pda, sig, slot, payload)
      values (${failsafe.pda.toBase58()}, ${fillSig}, ${parsedFill.slot}, ${sql.json(payload as never)})
      on conflict (sig) do update set payload = excluded.payload, slot = excluded.slot
    `;
    await sql.end({ timeout: 5 });
  }

  console.log(
    JSON.stringify({
      label: evidence.label,
      failsafePda: evidence.failsafePda,
      keeperFill: fillSig,
      illegalErr: evidence.illegalOneToOneOnControl.err,
      failsafeAccountAfterTick: evidence.failsafeAccountAfterTick,
      ownerDestinationAfter: evidence.ownerDestinationAfter,
      memcmpOpenCountOurs: ourOpen,
      composition: tickJson.composition,
    })
  );
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.stack ?? err.message : err);
  process.exit(1);
});
