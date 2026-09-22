import assert from "node:assert/strict";
import { test } from "node:test";
import { parseIssuerInstruction } from "./issuer-instruction.ts";
import { eventFromInstruction, fingerprintActionable } from "./event-fingerprint.ts";
import { classifyIssuerChange } from "./event-change.ts";
import { compareExecutionSnapshot, type ExecutionSnapshot } from "./execution-snapshot.ts";
import { evaluateSafety, type SafetyInput } from "./safety-gate.ts";

const STATE_A =
  "SpaceX has gone public! SpaceX PreStocks tokens must be swapped into $SPCXx or any other token before 11:59pm UTC on 12 March 2027, or they will expire worthless.";
const STATE_B =
  "SpaceX has gone public! SpaceX PreStocks tokens must be swapped into $SPCXx or any other token before 11:59pm UTC on 15 March 2027, or they will expire worthless.";
const SOURCE = "https://prestocks.com/spacex";

function fp(html: string): string {
  return fingerprintActionable(eventFromInstruction(parseIssuerInstruction(html), SOURCE));
}

function snap(fingerprint: string, over: Partial<ExecutionSnapshot> = {}): ExecutionSnapshot {
  return {
    actionFingerprint: fingerprint,
    quoteFetchedAt: "2026-09-22T01:00:00.000Z",
    taker: "CpTxsgPjvaaPSaBKkijvB1h3hzgJmPiTsWNhuS7tRkgX",
    amountRaw: "1827211",
    destinationMint: "Xs3oZwbHvqis4NYcf4YKWmEia2eC84wSiVrcYcTqpH8",
    paused: false,
    hookProgramId: null,
    transferFeeBps: 100,
    ...over,
  };
}

function safety(over: Partial<SafetyInput> = {}): SafetyInput {
  return {
    stage: "CONVERSION_WINDOW",
    forSigning: true,
    nowMs: Date.parse("2026-09-22T01:00:00.000Z"),
    deadlineMs: Date.parse("2027-03-12T23:59:00.000Z"),
    evidencePresent: true,
    quoteFetchedAtMs: Date.parse("2026-09-22T01:00:00.000Z"),
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
    executableRatio: 0.76,
    floorRatio: 0.7,
    amountRaw: "1827211",
    taker: "CpTxsgPjvaaPSaBKkijvB1h3hzgJmPiTsWNhuS7tRkgX",
    txTaker: "CpTxsgPjvaaPSaBKkijvB1h3hzgJmPiTsWNhuS7tRkgX",
    transferFeeModeled: true,
    walletRaw: "1827211",
    solLamports: 32_000_000,
    minSolLamports: 3_000_000,
    ...over,
  };
}

test("test-mode issuer change: deadline A → B invalidates the old sign request", () => {
  const a = fp(STATE_A);
  const b = fp(STATE_B);
  assert.notEqual(a, b);
  const oldSign = compareExecutionSnapshot(snap(a), snap(b));
  assert.equal(oldSign.ok, false);
  assert.equal(oldSign.refusal, "ACTION_CHANGED_REVERIFY_REQUIRED");
});

test("test-mode issuer change: new fetch + new snapshot can sign when gates pass", () => {
  const b = fp(STATE_B);
  const fresh = compareExecutionSnapshot(snap(b), snap(b));
  assert.equal(fresh.ok, true);
  const gate = evaluateSafety(
    safety({
      boundActionFingerprint: b,
      liveActionFingerprint: b,
      deadlineMs: Date.parse("2027-03-15T23:59:00.000Z"),
    }),
  );
  assert.equal(gate.allowed, true);
});

test("stale destination on an otherwise matching fingerprint cannot sign", () => {
  const a = fp(STATE_A);
  const mismatch = compareExecutionSnapshot(
    snap(a, { destinationMint: "PreANxuXjsy2pvisWWMNB6YaJNzr7681wJJr2rHsfTh" }),
    snap(a),
  );
  assert.equal(mismatch.refusal, "EXECUTION_SNAPSHOT_STALE");
  const gate = evaluateSafety(safety({ executionSnapshotStale: true }));
  assert.equal(gate.allowed, false);
  assert.ok(gate.refusals.includes("EXECUTION_SNAPSHOT_STALE"));
});

test("signing stays blocked after an actionable change until fingerprints match", () => {
  const prev = eventFromInstruction(parseIssuerInstruction(STATE_A), SOURCE);
  const next = eventFromInstruction(parseIssuerInstruction(STATE_B), SOURCE);
  const change = classifyIssuerChange({
    previous: prev,
    current: next,
    sourceOk: true,
    currentStatement: STATE_B,
  });
  assert.equal(change.actionable, true);
  const gate = evaluateSafety(
    safety({
      boundActionFingerprint: fingerprintActionable(prev),
      liveActionFingerprint: fingerprintActionable(next),
    }),
  );
  assert.equal(gate.allowed, false);
  assert.ok(gate.refusals.includes("ACTION_CHANGED_REVERIFY_REQUIRED"));
});

test("PARSE_CHANGED when a going-public statement becomes unparseable", () => {
  const prev = eventFromInstruction(parseIssuerInstruction(STATE_A), SOURCE);
  const next = eventFromInstruction(parseIssuerInstruction("No conversion terms on this page."), SOURCE);
  const change = classifyIssuerChange({
    previous: prev,
    current: next,
    sourceOk: true,
    currentStatement: "No conversion terms on this page.",
  });
  assert.ok(change.kinds.includes("ACTION_CHANGED") || change.kinds.includes("PARSE_CHANGED"));
  assert.equal(change.actionable, true);
});
