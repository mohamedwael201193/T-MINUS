import test from "node:test";
import assert from "node:assert/strict";
import { haltFromIssuer, haltFromFeed, fillSize, isConfiguredPair, chooseFillPlan } from "./policy.ts";
import type { IssuerSnapshot } from "./issuer.ts";

function snap(over: Partial<IssuerSnapshot> = {}): IssuerSnapshot {
  return {
    paused: false,
    hookProgramId: null,
    transferFeeBps: 100,
    feeEpoch: 1039,
    multiplier: "1",
    permanentDelegate: "x",
    mintAuthority: "x",
    freezeAuthority: "x",
    ...over,
  };
}

test("halts on pause and transfer hook", () => {
  assert.equal(haltFromIssuer(snap({ paused: true }), 100), "issuer_paused");
  assert.equal(
    haltFromIssuer(snap({ hookProgramId: "Hook11111111111111111111111111111111111111" }), 100),
    "transfer_hook_attached"
  );
  assert.equal(haltFromIssuer(snap(), 100), null);
});

test("halts when transfer fee bps changes after a baseline", () => {
  assert.equal(haltFromIssuer(snap({ transferFeeBps: 100 }), null), null);
  assert.equal(haltFromIssuer(snap({ transferFeeBps: 200 }), 100), "issuer_fee_changed");
});

test("spend cap never exceeds remaining and skips illegal partials", () => {
  assert.equal(fillSize(500n, 200n, 1n), 200n);
  assert.equal(fillSize(50n, 200n, 1n), 50n);
  assert.equal(fillSize(30n, 20n, 50n), null);
  assert.equal(fillSize(30n, 200n, 50n), 30n);
});

test("halts on missing or stale feed", () => {
  assert.equal(haltFromFeed(null, 1_000, 300), "feed_missing");
  assert.equal(haltFromFeed(0, 400, 300), "feed_stale");
  assert.equal(haltFromFeed(200, 400, 300), null);
});

test("inventory fill pays the floor when dest is already held", () => {
  const plan = chooseFillPlan({
    remaining: 990_000n,
    cap: 200_000_000n,
    minFill: 1n,
    floorE9: 1_000_000_000n,
    inventoryDst: 990_000n,
    quoteIn: 990_000n,
    quoteOut: 1_200_000n,
    allowInventoryWithoutQuote: false,
  });
  assert.deepEqual(plan, { action: "inventory", fillSrc: 990_000n, dstRaw: 990_000n });
});

test("atomic swap is used when inventory cannot cover the floor", () => {
  const plan = chooseFillPlan({
    remaining: 990_000n,
    cap: 200_000_000n,
    minFill: 1n,
    floorE9: 1_000_000_000n,
    inventoryDst: 1n,
    quoteIn: 990_000n,
    quoteOut: 990_000n,
    allowInventoryWithoutQuote: false,
  });
  assert.deepEqual(plan, { action: "atomic_swap", fillSrc: 990_000n, dstRaw: 990_000n });
});

test("skips unfillable quotes even if inventory exists", () => {
  const plan = chooseFillPlan({
    remaining: 990_000n,
    cap: 200_000_000n,
    minFill: 1n,
    floorE9: 1_000_000_000n,
    inventoryDst: 990_000n,
    quoteIn: 990_000n,
    quoteOut: 1n,
    allowInventoryWithoutQuote: false,
  });
  assert.deepEqual(plan, { action: "skip", reason: "not_fillable" });
});

test("inventory without quote is opt-in only", () => {
  const blocked = chooseFillPlan({
    remaining: 990_000n,
    cap: 200_000_000n,
    minFill: 1n,
    floorE9: 1_000_000_000n,
    inventoryDst: 990_000n,
    quoteIn: null,
    quoteOut: null,
    allowInventoryWithoutQuote: false,
  });
  assert.deepEqual(blocked, { action: "skip", reason: "quote_required" });
  const allowed = chooseFillPlan({
    remaining: 990_000n,
    cap: 200_000_000n,
    minFill: 1n,
    floorE9: 1_000_000_000n,
    inventoryDst: 990_000n,
    quoteIn: null,
    quoteOut: null,
    allowInventoryWithoutQuote: true,
  });
  assert.deepEqual(allowed, { action: "inventory", fillSrc: 990_000n, dstRaw: 990_000n });
});

test("ignores orders that are not the configured SPACEX/SPCXx pair", () => {
  assert.equal(
    isConfiguredPair(
      "PreANxuXjsy2pvisWWMNB6YaJNzr7681wJJr2rHsfTh",
      "Xs3oZwbHvqis4NYcf4YKWmEia2eC84wSiVrcYcTqpH8",
      "PreANxuXjsy2pvisWWMNB6YaJNzr7681wJJr2rHsfTh",
      "Xs3oZwbHvqis4NYcf4YKWmEia2eC84wSiVrcYcTqpH8"
    ),
    true
  );
  assert.equal(
    isConfiguredPair(
      "So11111111111111111111111111111111111111112",
      "Xs3oZwbHvqis4NYcf4YKWmEia2eC84wSiVrcYcTqpH8",
      "PreANxuXjsy2pvisWWMNB6YaJNzr7681wJJr2rHsfTh",
      "Xs3oZwbHvqis4NYcf4YKWmEia2eC84wSiVrcYcTqpH8"
    ),
    false
  );
});
