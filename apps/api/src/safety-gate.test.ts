import test from "node:test";
import assert from "node:assert/strict";
import { evaluateSafety, type SafetyInput } from "./safety-gate.ts";

function base(over: Partial<SafetyInput> = {}): SafetyInput {
  return {
    stage: "CONVERSION_WINDOW",
    forSigning: true,
    nowMs: Date.parse("2026-09-22T00:00:00.000Z"),
    deadlineMs: Date.parse("2027-03-12T23:59:00.000Z"),
    evidencePresent: true,
    quoteFetchedAtMs: Date.parse("2026-09-22T00:00:00.000Z"),
    quoteStaleMs: 15_000,
    mintPaused: false,
    hookProgramId: null,
    tokenProgram: "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb",
    rpcOk: true,
    feeBpsObserved: 100,
    feeBpsBaseline: 100,
    destinationVerified: true,
    routeOk: true,
    jupiterError: null,
    executableRatio: 0.757,
    floorRatio: 0.7,
    amountRaw: "200000000",
    taker: "CpTxsgPjvaaPSaBKkijvB1h3hzgJmPiTsWNhuS7tRkgX",
    txTaker: "CpTxsgPjvaaPSaBKkijvB1h3hzgJmPiTsWNhuS7tRkgX",
    transferFeeModeled: true,
    walletRaw: "200000000",
    solLamports: 32_000_000,
    minSolLamports: 3_000_000,
    ...over,
  };
}

test("clean conversion window is allowed", () => {
  const r = evaluateSafety(base());
  assert.equal(r.allowed, true);
  assert.deepEqual(r.refusals, []);
});

test("XAI expired refuses only EXPIRED", () => {
  const r = evaluateSafety(
    base({
      stage: "EXPIRED",
      deadlineMs: Date.parse("2026-09-12T23:59:00.000Z"),
      routeOk: false,
      quoteFetchedAtMs: null,
      taker: null,
    }),
  );
  assert.equal(r.allowed, false);
  assert.deepEqual(r.refusals, ["EXPIRED"]);
});

test("terms pending does not request a signature", () => {
  const r = evaluateSafety(base({ stage: "TERMS_PENDING", destinationVerified: false }));
  assert.equal(r.allowed, false);
  assert.ok(r.refusals.includes("TERMS_PENDING"));
  assert.ok(r.refusals.includes("DESTINATION_UNVERIFIED"));
});

test("below floor", () => {
  const r = evaluateSafety(base({ executableRatio: 0.65, floorRatio: 0.7 }));
  assert.equal(r.allowed, false);
  assert.ok(r.refusals.includes("BELOW_FLOOR"));
});

test("stale quote", () => {
  const r = evaluateSafety(base({ quoteFetchedAtMs: Date.parse("2026-09-21T00:00:00.000Z") }));
  assert.ok(r.refusals.includes("STALE"));
});

test("paused mint", () => {
  assert.ok(evaluateSafety(base({ mintPaused: true })).refusals.includes("PAUSED"));
});

test("transfer hook", () => {
  assert.ok(evaluateSafety(base({ hookProgramId: "Hook111111111111111111111111111111111111111" })).refusals.includes("HOOK_PRESENT"));
});

test("fee changed vs baseline", () => {
  assert.ok(evaluateSafety(base({ feeBpsObserved: 200 })).refusals.includes("FEE_CHANGED"));
});

test("missing wallet", () => {
  assert.ok(evaluateSafety(base({ taker: null })).refusals.includes("USER_WALLET_REQUIRED"));
});

test("listing (not signing) does not require a wallet", () => {
  const r = evaluateSafety(base({ forSigning: false, taker: null, quoteFetchedAtMs: null, routeOk: false }));
  assert.equal(r.allowed, true);
});

test("amount above wallet is INSUFFICIENT_BALANCE", () => {
  const r = evaluateSafety(base({ amountRaw: "2000001", walletRaw: "2000000" }));
  assert.ok(r.refusals.includes("INSUFFICIENT_BALANCE"));
});

test("dust SOL is INSUFFICIENT_SOL", () => {
  const r = evaluateSafety(base({ solLamports: 100_000, minSolLamports: 3_000_000 }));
  assert.ok(r.refusals.includes("INSUFFICIENT_SOL"));
});
