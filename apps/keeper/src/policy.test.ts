import test from "node:test";
import assert from "node:assert/strict";
import { haltFromIssuer, fillSize, isConfiguredPair } from "./policy.ts";
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
