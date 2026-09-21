import {
  Connection,
  PublicKey,
  TransactionMessage,
  VersionedTransaction,
  ComputeBudgetProgram,
} from "@solana/web3.js";
import {
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountIdempotentInstruction,
  TOKEN_2022_PROGRAM_ID,
  getAccount,
} from "@solana/spl-token";
import {
  PROGRAM_ID,
  activeFloor,
  ceilRatio,
  quoteRatioE9,
} from "@tminus/sdk";
import { env, keeperKeypair } from "./config.ts";
import { sql } from "./db.ts";
import { logIssuer, readIssuer } from "./issuer.ts";
import { fillSize, haltFromFeed, haltFromIssuer, isConfiguredPair, chooseFillPlan } from "./policy.ts";
import { buildSwap, loadLookupTables, quoteExactIn, toInstruction } from "./jupiter.ts";
import { tryLease, releaseLease } from "./leases.ts";
import { log } from "./log.ts";
import { loadOpenOrders } from "./orders.ts";
import { persistReceipt } from "./receipts.ts";
import { fillIx, remainingRaw } from "./ix.ts";

export type KeeperState = {
  halted: boolean;
  haltReason: string | null;
  lastPoll: string | null;
  lastFillSig: string | null;
  lastRpcError: string | null;
  lastJupiterError: string | null;
  lastFeedHash: string | null;
  lastFeedAt: string | null;
  composition: "atomic_swap_then_fill" | "two_tx_inventory_fallback";
  lastFeeBps: number | null;
};

export const state: KeeperState = {
  halted: false,
  haltReason: null,
  lastPoll: null,
  lastFillSig: null,
  lastRpcError: null,
  lastJupiterError: null,
  lastFeedHash: null,
  lastFeedAt: null,
  composition: "atomic_swap_then_fill",
  lastFeeBps: null,
};

async function writeHealth(): Promise<void> {
  await sql`
    insert into keeper_health (id, payload, updated_at)
    values (1, ${sql.json(state as never)}, now())
    on conflict (id) do update set payload = excluded.payload, updated_at = now()
  `;
}

async function latestFeed(): Promise<{ hash: string; fetchedAt: Date; stale: boolean } | null> {
  const rows = await sql<{ source_sha256: string; fetched_at: Date }[]>`
    select source_sha256, fetched_at from feed_snapshots order by fetched_at desc limit 1
  `;
  if (!rows[0]) return null;
  const stale = Date.now() - rows[0].fetched_at.getTime() > env.feedStaleMs;
  return { hash: rows[0].source_sha256, fetchedAt: rows[0].fetched_at, stale };
}

export async function tick(connection: Connection): Promise<void> {
  state.lastPoll = new Date().toISOString();
  try {
    const issuer = await readIssuer(connection, env.spacexMint);
    logIssuer(issuer);
    const halt = haltFromIssuer(issuer, state.lastFeeBps);
    if (issuer.transferFeeBps !== null && halt !== "issuer_fee_changed") {
      state.lastFeeBps = issuer.transferFeeBps;
    }
    const feed = await latestFeed();
    if (feed) {
      state.lastFeedHash = feed.hash;
      state.lastFeedAt = feed.fetchedAt.toISOString();
    }
    const feedHalt = haltFromFeed(
      feed ? feed.fetchedAt.getTime() : null,
      Date.now(),
      env.feedStaleMs
    );
    if (feedHalt) {
      state.halted = true;
      state.haltReason = feedHalt;
      await writeHealth();
      log("halt", { reason: state.haltReason });
      return;
    }
    if (!feed) {
      return;
    }
    if (halt) {
      state.halted = true;
      state.haltReason = halt;
      await writeHealth();
      log("halt", { reason: halt });
      return;
    }
    state.halted = false;
    state.haltReason = null;

    const orders = await loadOpenOrders(connection);
    log("orders_loaded", { count: orders.length });
    const now = Math.floor(Date.now() / 1000);

    for (const item of orders) {
      if (
        !isConfiguredPair(
          item.order.srcMint.toBase58(),
          item.order.dstMint.toBase58(),
          env.spacexMint,
          env.spcxxMint
        )
      ) {
        log("skip_non_bounty_pair", { pda: item.pda.toBase58() });
        continue;
      }
      const remaining = remainingRaw(item.order);
      if (remaining <= 0n) continue;
      if (now >= Number(item.order.hardExpiryTs)) continue;
      const floor = activeFloor(
        now,
        Number(item.order.failsafeTs),
        item.order.minRatioE9,
        item.order.failsafeFloorE9
      );
      const fillSrcGuess = fillSize(remaining, env.spendCapRaw, item.order.minFillRaw);
      if (fillSrcGuess === null) continue;

      const fillerDstPeek = getAssociatedTokenAddressSync(
        item.order.dstMint,
        keeperKeypair.publicKey,
        true,
        TOKEN_2022_PROGRAM_ID
      );
      let inventoryDst = 0n;
      try {
        inventoryDst = (await getAccount(connection, fillerDstPeek, "confirmed", TOKEN_2022_PROGRAM_ID)).amount;
      } catch {
        inventoryDst = 0n;
      }

      let quote: { inAmount: string; outAmount: string; routePlan?: unknown } | null = null;
      try {
        quote = await quoteExactIn(
          env.spacexMint,
          env.spcxxMint,
          fillSrcGuess.toString(),
          keeperKeypair.publicKey.toBase58()
        );
        state.lastJupiterError = null;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "quote_fail";
        state.lastJupiterError = msg;
        log("quote_fail", { error: msg, pda: item.pda.toBase58() });
        if (msg === "jupiter_429") {
          await new Promise((r) => setTimeout(r, 8_000));
        }
      }

      const plan = chooseFillPlan({
        remaining,
        cap: env.spendCapRaw,
        minFill: item.order.minFillRaw,
        floorE9: floor,
        inventoryDst,
        quoteIn: quote ? BigInt(quote.inAmount) : null,
        quoteOut: quote ? BigInt(quote.outAmount) : null,
        allowInventoryWithoutQuote: env.inventoryWithoutQuote,
      });
      if (plan.action === "skip") {
        log("not_fillable", { pda: item.pda.toBase58(), reason: plan.reason });
        continue;
      }

      const leased = await tryLease(item.pda.toBase58(), item.order.filledRaw.toString());
      if (!leased) {
        log("lease_miss", { pda: item.pda.toBase58() });
        continue;
      }

      try {
        await attemptFill(
          connection,
          item.pda,
          item.order,
          plan.fillSrc,
          plan.dstRaw,
          quote ?? {
            inAmount: plan.fillSrc.toString(),
            outAmount: plan.dstRaw.toString(),
            routePlan: { composition: plan.action },
          },
          feed.hash,
          now >= Number(item.order.failsafeTs),
          plan.action
        );
      } finally {
        await releaseLease(item.pda.toBase58());
      }
    }
  } catch (err) {
    state.lastRpcError = (err instanceof Error ? err.message : "tick_fail").slice(0, 240);
    log("tick_fail", { error: state.lastRpcError });
  } finally {
    await writeHealth();
  }
}

async function attemptFill(
  connection: Connection,
  pda: PublicKey,
  order: OpenOrderOrder,
  fillSrc: bigint,
  dstRaw: bigint,
  quote: { routePlan?: unknown; outAmount: string; inAmount: string },
  feedHash: string,
  failsafeUsed: boolean,
  mode: "inventory" | "atomic_swap"
): Promise<void> {
  const minDst = ceilRatio(fillSrc, activeFloor(
    Math.floor(Date.now() / 1000),
    Number(order.failsafeTs),
    order.minRatioE9,
    order.failsafeFloorE9
  ));
  if (dstRaw < minDst) {
    log("under_quote", { pda: pda.toBase58() });
    return;
  }

  const filler = keeperKeypair.publicKey;
  const srcMint = order.srcMint;
  const dstMint = order.dstMint;
  const fillerDstAta = getAssociatedTokenAddressSync(dstMint, filler, true, TOKEN_2022_PROGRAM_ID);
  const ownerDstAta = getAssociatedTokenAddressSync(dstMint, order.owner, true, TOKEN_2022_PROGRAM_ID);
  const fillerSrcAta = getAssociatedTokenAddressSync(srcMint, filler, true, TOKEN_2022_PROGRAM_ID);

  let dstBal = 0n;
  try {
    dstBal = (await getAccount(connection, fillerDstAta, "confirmed", TOKEN_2022_PROGRAM_ID)).amount;
  } catch {
    dstBal = 0n;
  }

  const ixs = [
    ComputeBudgetProgram.setComputeUnitLimit({ units: 1_200_000 }),
    createAssociatedTokenAccountIdempotentInstruction(
      filler,
      ownerDstAta,
      order.owner,
      dstMint,
      TOKEN_2022_PROGRAM_ID
    ),
    createAssociatedTokenAccountIdempotentInstruction(
      filler,
      fillerSrcAta,
      filler,
      srcMint,
      TOKEN_2022_PROGRAM_ID
    ),
    createAssociatedTokenAccountIdempotentInstruction(
      filler,
      fillerDstAta,
      filler,
      dstMint,
      TOKEN_2022_PROGRAM_ID
    ),
  ];

  if (mode === "inventory" && dstBal < dstRaw) {
    log("inventory_short", { pda: pda.toBase58(), have: dstBal.toString(), need: dstRaw.toString() });
    return;
  }

  let usedAtomicSwap = false;
  let alts: import("@solana/web3.js").AddressLookupTableAccount[] = [];
  if (mode === "atomic_swap") {
    const build = await buildSwap({
      inputMint: srcMint.toBase58(),
      outputMint: dstMint.toBase58(),
      amount: fillSrc.toString(),
      taker: filler.toBase58(),
    });
    ixs.push(...build.setupInstructions.map(toInstruction));
    ixs.push(toInstruction(build.swapInstruction));
    if (build.cleanupInstruction) ixs.push(toInstruction(build.cleanupInstruction));
    usedAtomicSwap = true;
    state.composition = "atomic_swap_then_fill";
    alts = await loadLookupTables(connection, build);
  } else {
    state.composition = "two_tx_inventory_fallback";
  }

  ixs.push(
    fillIx({
      programId: new PublicKey(env.programId || PROGRAM_ID),
      filler,
      owner: order.owner,
      order: pda,
      srcMint,
      dstMint,
      escrowAta: order.escrowAta,
      ownerDstAta,
      fillerSrcAta,
      fillerDstAta,
      fillSrcRaw: fillSrc,
      dstRaw,
    })
  );
  await simulateAndMaybeSend({
    connection,
    ixs,
    alts,
    pda,
    fillSrc,
    dstRaw,
    quote,
    feedHash,
    failsafeUsed,
    usedAtomicSwap,
  });
}

type OpenOrderOrder = Awaited<ReturnType<typeof loadOpenOrders>>[number]["order"];

async function simulateAndMaybeSend(args: {
  connection: Connection;
  ixs: import("@solana/web3.js").TransactionInstruction[];
  alts: import("@solana/web3.js").AddressLookupTableAccount[];
  pda: PublicKey;
  fillSrc: bigint;
  dstRaw: bigint;
  quote: { routePlan?: unknown; outAmount: string; inAmount: string };
  feedHash: string;
  failsafeUsed: boolean;
  usedAtomicSwap: boolean;
}): Promise<void> {
  const { blockhash, lastValidBlockHeight } = await args.connection.getLatestBlockhash("confirmed");
  const msg = new TransactionMessage({
    payerKey: keeperKeypair.publicKey,
    recentBlockhash: blockhash,
    instructions: args.ixs,
  }).compileToV0Message(args.alts);
  const tx = new VersionedTransaction(msg);
  const sim = await args.connection.simulateTransaction(tx, { sigVerify: false, replaceRecentBlockhash: true });
  log("simulate_fill", {
    pda: args.pda.toBase58(),
    err: sim.value.err,
    units: sim.value.unitsConsumed,
    atomic: args.usedAtomicSwap,
    send_enabled: env.sendEnabled,
  });
  if (sim.value.err) {
    log("simulate_fail", { pda: args.pda.toBase58(), err: sim.value.err });
    return;
  }
  if (!env.sendEnabled) {
    log("send_skipped_disabled", { pda: args.pda.toBase58() });
    return;
  }
  tx.sign([keeperKeypair]);
  const sig = await args.connection.sendTransaction(tx, { skipPreflight: false });
  const conf = await args.connection.confirmTransaction(
    { signature: sig, blockhash, lastValidBlockHeight },
    "confirmed"
  );
  if (conf.value.err) {
    log("confirm_err", { sig, err: conf.value.err });
    return;
  }
  const parsed = await args.connection.getTransaction(sig, {
    maxSupportedTransactionVersion: 0,
    commitment: "confirmed",
  });
  const slot = parsed?.slot ?? 0;
  state.lastFillSig = sig;
  await persistReceipt({
    orderPda: args.pda.toBase58(),
    sig,
    slot,
    sourceAmount: args.fillSrc.toString(),
    destinationAmount: args.dstRaw.toString(),
    ratio: quoteRatioE9(args.dstRaw, args.fillSrc).toString(),
    failsafeFlag: args.failsafeUsed,
    route: args.quote.routePlan ?? null,
    feedHash: args.feedHash,
    timestamp: new Date().toISOString(),
    network: env.solanaNetwork === "devnet" ? "DEVNET" : "MAINNET",
  });
  log("fill_confirmed", { sig, pda: args.pda.toBase58(), slot });
}
