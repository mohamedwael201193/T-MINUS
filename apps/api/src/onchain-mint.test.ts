import test from "node:test";
import assert from "node:assert/strict";
import { parseMintExtensions } from "./onchain-mint.ts";

test("reads 100 bps fee, no hook, not paused", () => {
  const state = parseMintExtensions({
    mint: "PreANxuXjsy2pvisWWMNB6YaJNzr7681wJJr2rHsfTh",
    tokenProgram: "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb",
    decimals: 9,
    extensions: [
      { extension: "transferFeeConfig", state: { newerTransferFee: { transferFeeBasisPoints: 100 } } },
      { extension: "pausableConfig", state: { paused: false } },
      { extension: "transferHook", state: { programId: null } },
    ],
  });
  assert.equal(state.rpcOk, true);
  assert.equal(state.transferFeeBps, 100);
  assert.equal(state.paused, false);
  assert.equal(state.hookProgramId, null);
});

test("treats system-program hook id as absent", () => {
  const state = parseMintExtensions({
    mint: "PreANxuXjsy2pvisWWMNB6YaJNzr7681wJJr2rHsfTh",
    extensions: [{ extension: "transferHook", state: { programId: "11111111111111111111111111111111" } }],
  });
  assert.equal(state.hookProgramId, null);
});
