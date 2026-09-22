import { Connection } from "@solana/web3.js";
import { env } from "./config.ts";
import { getCorporateAction, type CorporateAction } from "./corporate-action.ts";
import { displayRawForMint } from "./issuer-instruction.ts";
import { jupiterExecute, jupiterOrder, jupiterQuoteLite, type JupiterOrderResult } from "./jupiter-swap.ts";
import { readMintState } from "./onchain-mint.ts";
import { evaluateSafety, type SafetyRefusal } from "./safety-gate.ts";
import { sql } from "./db.ts";
import { readOwnerBalances } from "./balances.ts";
import { maxSafeInputRaw, MIN_SOL_LAMPORTS, rawToDisplayString } from "./safe-amount.ts";
import {
  compareExecutionSnapshot,
  readExecutionSnapshot,
  type ExecutionSnapshot,
} from "./execution-snapshot.ts";

export const QUOTE_STALE_MS = 15_000;

export type HolderPosition = {
  owner: string | null;
  spacexRaw: string | null;
  spacexDisplay: string | null;
  solLamports: number | null;
  maxSafeRaw: string | null;
};

export type ExecutableResponse = {
  network: "MAINNET";
  assetId: string;
  allowed: boolean;
  refusals: SafetyRefusal[];
  path: "order_execute" | "none";
  transaction: string | null;
  requestId: string | null;
  taker: string | null;
  position: HolderPosition;
  quote: {
    inAmount: string | null;
    outAmount: string | null;
    executableRatio: number | null;
    router: string | null;
    fetchedAt: string | null;
    staleMs: number;
    error: string | null;
  };
  action: {
    symbol: string;
    sourceMint: string;
    stage: string;
    actionType: string;
    deadline: string | null;
    destinationSymbol: string | null;
    destinationMint: string | null;
    settlementKind: string;
    transferFeeBps: number | null;
    issuerStatement: string | null;
  };
  evidence: CorporateAction["evidence"];
  executionSnapshot: ExecutionSnapshot;
};

function ratioOf(inAmount: string | null, outAmount: string | null, srcMint: string, dstMint: string): number | null {
  if (!inAmount || !outAmount) return null;
  const inn = Number(inAmount);
  const out = Number(outAmount);
  const inDiv = displayRawForMint(srcMint);
  const outDiv = displayRawForMint(dstMint);
  if (!(inn > 0) || !(out > 0) || !inDiv || !outDiv) return null;
  return out / outDiv / (inn / inDiv);
}

async function holderPosition(taker: string | null): Promise<HolderPosition> {
  const empty: HolderPosition = {
    owner: taker,
    spacexRaw: null,
    spacexDisplay: null,
    solLamports: null,
    maxSafeRaw: null,
  };
  if (!taker) return empty;
  try {
    const bal = await readOwnerBalances(env.solanaRpc, taker);
    const walletRaw = BigInt(bal.SPACEX.raw);
    const maxSafe = maxSafeInputRaw({ walletRaw });
    return {
      owner: taker,
      spacexRaw: walletRaw.toString(),
      spacexDisplay: rawToDisplayString(walletRaw),
      solLamports: bal.solLamports,
      maxSafeRaw: maxSafe.toString(),
    };
  } catch {
    return empty;
  }
}

export async function buildExecutable(opts: {
  assetId: string;
  amountRaw: string | null;
  taker: string | null;
  floorRatio: number | null;
  assembleTx?: boolean;
  quoteStaleMs?: number;
}): Promise<{ status: number; body: ExecutableResponse | { error: string } }> {
  const action = await getCorporateAction(opts.assetId);
  if (!action) return { status: 404, body: { error: "unknown_asset" } };

  const amountRaw = opts.amountRaw && /^[1-9][0-9]*$/.test(opts.amountRaw) ? opts.amountRaw : null;
  const assembleTx = opts.assembleTx !== false;
  const now = Date.now();
  const deadlineMs = action.deadline ? Date.parse(action.deadline) : null;
  const position = await holderPosition(opts.taker);

  const needsRoute =
    action.stage === "CONVERSION_WINDOW" && action.destinationVerified && action.destination != null;

  let mint = action.onchain;
  if (needsRoute) mint = await readMintState(action.sourceMint);

  let quote: JupiterOrderResult | null = null;
  if (needsRoute && amountRaw && action.destination) {
    if (assembleTx) {
      quote = await jupiterOrder({
        inputMint: action.sourceMint,
        outputMint: action.destination.mint,
        amount: amountRaw,
        taker: opts.taker ?? undefined,
      });
    } else {
      quote = await jupiterQuoteLite({
        inputMint: action.sourceMint,
        outputMint: action.destination.mint,
        amount: amountRaw,
      });
    }
  }

  const executableRatio = quote
    ? ratioOf(quote.inAmount, quote.outAmount, action.sourceMint, action.destination?.mint ?? "")
    : null;
  const routeOk = Boolean(quote?.ok && quote.outAmount);
  const feeBps = mint.transferFeeBps ?? action.transferFeeBps;
  const safety = evaluateSafety({
    stage: action.stage,
    forSigning: true,
    nowMs: now,
    deadlineMs: Number.isFinite(deadlineMs) ? deadlineMs : null,
    evidencePresent: Boolean(action.evidence.issuerPageUrl || action.evidence.sourceHash),
    quoteFetchedAtMs: quote?.fetchedAt ? Date.parse(quote.fetchedAt) : null,
    quoteStaleMs: opts.quoteStaleMs ?? QUOTE_STALE_MS,
    mintPaused: mint.paused,
    hookProgramId: mint.hookProgramId,
    tokenProgram: mint.tokenProgram,
    rpcOk: needsRoute ? mint.rpcOk : true,
    feeBpsObserved: feeBps,
    feeBpsBaseline: action.transferFeeBps,
    destinationVerified: action.destinationVerified,
    routeOk,
    jupiterError: quote?.error ?? null,
    executableRatio,
    floorRatio: opts.floorRatio,
    amountRaw,
    taker: opts.taker,
    txTaker: opts.taker,
    transferFeeModeled: Boolean(quote?.ok),
    walletRaw: position.spacexRaw,
    solLamports: position.solLamports,
    minSolLamports: Number(MIN_SOL_LAMPORTS),
  });

  const refusals = [...safety.refusals];
  if (assembleTx && safety.allowed && !quote?.transaction) refusals.push("NO_ROUTE");

  action.truth.jupiter = {
    available: quote ? quote.ok : null,
    inAmount: quote?.inAmount ?? null,
    outAmount: quote?.outAmount ?? null,
    router: quote?.router ?? null,
    fetchedAt: quote?.fetchedAt ?? null,
    error: quote?.error ?? null,
  };
  action.truth.tminus = {
    allowSign: false,
    refusals,
    settlementKind: action.settlementKind,
  };

  const unique = [...new Set(refusals)];
  const canSign =
    unique.length === 0 &&
    Boolean(quote?.ok) &&
    (!assembleTx || (Boolean(quote?.transaction) && Boolean(quote?.requestId)));
  action.truth.tminus.allowSign = canSign;

  return {
    status: 200,
    body: {
      network: "MAINNET",
      assetId: action.assetId,
      allowed: canSign,
      refusals: unique,
      path: canSign && assembleTx ? "order_execute" : canSign ? "order_execute" : "none",
      transaction: assembleTx && canSign ? quote?.transaction ?? null : null,
      requestId: assembleTx && canSign ? quote?.requestId ?? null : null,
      taker: opts.taker,
      position,
      quote: {
        inAmount: quote?.inAmount ?? null,
        outAmount: quote?.outAmount ?? null,
        executableRatio,
        router: quote?.router ?? null,
        fetchedAt: quote?.fetchedAt ?? null,
        staleMs: opts.quoteStaleMs ?? QUOTE_STALE_MS,
        error: quote?.error ?? null,
      },
      action: {
        symbol: action.symbol,
        sourceMint: action.sourceMint,
        stage: action.stage,
        actionType: action.actionType,
        deadline: action.deadline,
        destinationSymbol: action.destination?.symbol ?? null,
        destinationMint: action.destination?.mint ?? null,
        settlementKind: action.settlementKind,
        transferFeeBps: feeBps,
        issuerStatement: action.issuer.statement,
      },
      evidence: action.evidence,
      executionSnapshot: {
        actionFingerprint: action.fingerprint,
        quoteFetchedAt: quote?.fetchedAt ?? null,
        taker: opts.taker,
        amountRaw,
        destinationMint: action.destination?.mint ?? null,
        paused: mint.paused,
        hookProgramId: mint.hookProgramId,
        transferFeeBps: feeBps,
      },
    },
  };
}

type TokenBal = {
  mint: string;
  owner?: string;
  uiTokenAmount?: { amount?: string };
};

function tokenDelta(
  pre: TokenBal[] | undefined,
  post: TokenBal[] | undefined,
  owner: string,
  mint: string,
): bigint | null {
  if (!pre || !post) return null;
  const a = pre.find((r) => r.mint === mint && r.owner === owner);
  const b = post.find((r) => r.mint === mint && r.owner === owner);
  if (!a && !b) return null;
  const before = BigInt(a?.uiTokenAmount?.amount ?? "0");
  const after = BigInt(b?.uiTokenAmount?.amount ?? "0");
  return after - before;
}

async function confirmAndMeasure(
  signature: string,
  taker: string,
  sourceMint: string,
  destMint: string | null,
): Promise<{
  slot: number;
  err: unknown;
  inSpent: string | null;
  outReceived: string | null;
} | null> {
  const connection = new Connection(env.solanaRpc, "confirmed");
  for (let i = 0; i < 24; i++) {
    const tx = await connection.getTransaction(signature, {
      maxSupportedTransactionVersion: 0,
      commitment: "confirmed",
    });
    if (tx) {
      const pre = tx.meta?.preTokenBalances as TokenBal[] | undefined;
      const post = tx.meta?.postTokenBalances as TokenBal[] | undefined;
      const inDelta = tokenDelta(pre, post, taker, sourceMint);
      const outDelta = destMint ? tokenDelta(pre, post, taker, destMint) : null;
      return {
        slot: tx.slot,
        err: tx.meta?.err ?? null,
        inSpent: inDelta != null && inDelta < 0n ? (-inDelta).toString() : null,
        outReceived: outDelta != null && outDelta > 0n ? outDelta.toString() : null,
      };
    }
    await new Promise((r) => setTimeout(r, 1_250));
  }
  return null;
}

export async function executeSignedConversion(body: unknown): Promise<{ status: number; body: unknown }> {
  if (!body || typeof body !== "object") return { status: 400, body: { error: "invalid_body" } };
  const rec = body as Record<string, unknown>;
  const signedTransaction = typeof rec.signedTransaction === "string" ? rec.signedTransaction : "";
  const requestId = typeof rec.requestId === "string" ? rec.requestId : "";
  const assetId = typeof rec.assetId === "string" ? rec.assetId : "";
  const taker = typeof rec.taker === "string" ? rec.taker : "";
  const amountRaw = typeof rec.amountRaw === "string" ? rec.amountRaw : null;
  const floorRatio = typeof rec.floorRatio === "number" ? rec.floorRatio : Number(rec.floorRatio ?? NaN);
  if (!signedTransaction || !requestId || !assetId || !taker) {
    return { status: 400, body: { error: "missing_fields" } };
  }
  if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(taker)) {
    return { status: 400, body: { error: "invalid_taker" } };
  }

  const gate = await buildExecutable({
    assetId,
    amountRaw,
    taker,
    floorRatio: Number.isFinite(floorRatio) ? floorRatio : null,
    assembleTx: false,
    quoteStaleMs: 60_000,
  });
  if (gate.status !== 200 || !("allowed" in gate.body)) return gate;
  const bound = readExecutionSnapshot(rec.executionSnapshot);
  const live = gate.body.executionSnapshot;
  const snap = compareExecutionSnapshot(bound, live);
  if (!snap.ok) {
    return {
      status: 409,
      body: {
        error: "not_executable",
        refusals: [snap.refusal],
        network: "MAINNET",
      },
    };
  }
  if (!gate.body.allowed) {
    return {
      status: 409,
      body: { error: "not_executable", refusals: gate.body.refusals, network: "MAINNET" },
    };
  }

  const executed = await jupiterExecute({ signedTransaction, requestId });
  if (!executed.ok || !executed.signature) {
    return {
      status: 502,
      body: {
        error: "jupiter_execute_failed",
        detail: executed.error,
        network: "MAINNET",
        settled: false,
      },
    };
  }

  const confirmed = await confirmAndMeasure(
    executed.signature,
    taker,
    gate.body.action.sourceMint,
    gate.body.action.destinationMint,
  );
  if (!confirmed) {
    return {
      status: 202,
      body: {
        status: "PENDING",
        settled: false,
        signature: executed.signature,
        explorer: `https://explorer.solana.com/tx/${executed.signature}`,
        note: "Jupiter returned a signature but the RPC has not confirmed it yet. No receipt stored.",
      },
    };
  }
  if (confirmed.err) {
    return {
      status: 502,
      body: {
        error: "FAILED_ONCHAIN",
        signature: executed.signature,
        explorer: `https://explorer.solana.com/tx/${executed.signature}`,
        settled: false,
      },
    };
  }

  const inAmount = confirmed.inSpent ?? executed.inAmount ?? gate.body.quote.inAmount ?? amountRaw ?? "0";
  const outAmount = confirmed.outReceived ?? executed.outAmount ?? gate.body.quote.outAmount ?? "0";
  const srcMint = gate.body.action.sourceMint;
  const dstMint = gate.body.action.destinationMint ?? "";
  const ratio = ratioOf(inAmount, outAmount, srcMint, dstMint) ?? gate.body.quote.executableRatio;
  const ratioE9 = ratio != null ? String(Math.round(ratio * 1e9)) : "0";
  const inDisplay = displayRawForMint(srcMint);
  const outDisplay = displayRawForMint(dstMint);
  const payload = {
    kind: "mainnet_jupiter_conversion",
    network: "MAINNET",
    cluster: "MAINNET",
    status: "SETTLED",
    verifiedOnchain: true,
    assetId,
    sourceMint: srcMint,
    destinationMint: gate.body.action.destinationMint,
    destinationSymbol: gate.body.action.destinationSymbol,
    sourceAmount: inAmount,
    destinationAmount: outAmount,
    sourceDisplay: inDisplay ? Number(inAmount) / inDisplay : null,
    destinationDisplay: outDisplay ? Number(outAmount) / outDisplay : null,
    ratio: ratioE9,
    route: { composition: gate.body.quote.router ?? "jupiter_swap_v2", path: "order_execute" },
    explorer: `https://explorer.solana.com/tx/${executed.signature}`,
    feedHash: gate.body.evidence.sourceHash,
    issuerPageUrl: gate.body.evidence.issuerPageUrl,
    quoteTimestamp: gate.body.quote.fetchedAt,
    timestamp: new Date().toISOString(),
    programId: null,
    jupiterRequestId: requestId,
    taker,
    wallet: taker,
    settlementKind: "TRADE",
    corporateActionId: `${assetId}:${gate.body.action.actionType}`,
    transferFeeBps: gate.body.action.transferFeeBps,
  };
  const orderPda = `conversion:${assetId}:${taker}`;
  await sql`
    insert into receipts (order_pda, sig, slot, payload)
    values (${orderPda}, ${executed.signature}, ${confirmed.slot}, ${sql.json(payload as never)})
    on conflict (sig) do nothing
  `;
  return {
    status: 200,
    body: {
      settled: true,
      network: "MAINNET",
      signature: executed.signature,
      slot: confirmed.slot,
      explorer: payload.explorer,
      inAmount,
      outAmount,
      executableRatio: ratio,
      kind: "mainnet_jupiter_conversion",
      verifiedOnchain: true,
    },
  };
}
