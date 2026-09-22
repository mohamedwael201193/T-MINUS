import assert from "node:assert/strict";
import { test } from "node:test";
import { compareExecutionSnapshot, readExecutionSnapshot, type ExecutionSnapshot } from "./execution-snapshot.ts";

const live: ExecutionSnapshot = {
  actionFingerprint: "aaa",
  quoteFetchedAt: "2026-09-22T00:00:00.000Z",
  taker: "CpTxsgPjvaaPSaBKkijvB1h3hzgJmPiTsWNhuS7tRkgX",
  amountRaw: "1827211",
  destinationMint: "Xs3oZwbHvqis4NYcf4YKWmEia2eC84wSiVrcYcTqpH8",
  paused: false,
  hookProgramId: null,
  transferFeeBps: 100,
};

test("matching snapshot is ok", () => {
  const r = compareExecutionSnapshot({ ...live }, live);
  assert.equal(r.ok, true);
  assert.equal(r.refusal, null);
});

test("fingerprint mismatch is ACTION_CHANGED_REVERIFY_REQUIRED", () => {
  const r = compareExecutionSnapshot({ ...live, actionFingerprint: "bbb" }, live);
  assert.equal(r.ok, false);
  assert.equal(r.refusal, "ACTION_CHANGED_REVERIFY_REQUIRED");
});

test("destination or amount mismatch is EXECUTION_SNAPSHOT_STALE", () => {
  const dest = compareExecutionSnapshot({ ...live, destinationMint: "other" }, live);
  assert.equal(dest.refusal, "EXECUTION_SNAPSHOT_STALE");
  const amt = compareExecutionSnapshot({ ...live, amountRaw: "1" }, live);
  assert.equal(amt.refusal, "EXECUTION_SNAPSHOT_STALE");
  const fee = compareExecutionSnapshot({ ...live, transferFeeBps: 50 }, live);
  assert.equal(fee.refusal, "EXECUTION_SNAPSHOT_STALE");
});

test("missing bound snapshot is stale — do not sign", () => {
  const r = compareExecutionSnapshot(null, live);
  assert.equal(r.ok, false);
  assert.equal(r.refusal, "EXECUTION_SNAPSHOT_STALE");
});

test("readExecutionSnapshot rejects incomplete bodies", () => {
  assert.equal(readExecutionSnapshot({ taker: "x" }), null);
  assert.equal(readExecutionSnapshot({ actionFingerprint: "aaa" })?.actionFingerprint, "aaa");
});
