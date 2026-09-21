import test from "node:test";
import assert from "node:assert/strict";
import { PublicKey } from "@solana/web3.js";
import { orderPda } from "@tminus/sdk";
import { deriveOrderPda } from "./pda.ts";

const OWNER = "FrwqWhgEhbSnvKXzsG74qkB4ZsRiiheay7LcWBNd5DTj";
const SRC = "PreANxuXjsy2pvisWWMNB6YaJNzr7681wJJr2rHsfTh";
const DST = "Xs3oZwbHvqis4NYcf4YKWmEia2eC84wSiVrcYcTqpH8";

test("derives the same PDA as the SDK for nonce 1", () => {
  const expected = orderPda(new PublicKey(OWNER), new PublicKey(SRC), new PublicKey(DST), 1n)[0].toBase58();
  const got = deriveOrderPda({ owner: OWNER, src: SRC, dst: DST, nonce: "1" });
  assert.equal("error" in got, false);
  if ("error" in got) return;
  assert.equal(got.pda, expected);
  assert.equal(got.seeds[0], "order");
  assert.equal(got.seeds[4], "nonce_le");
});

test("rejects invalid pubkeys and nonces", () => {
  const badKey = deriveOrderPda({ owner: "not-a-key", src: SRC, dst: DST, nonce: "0" });
  const badNeg = deriveOrderPda({ owner: OWNER, src: SRC, dst: DST, nonce: "-1" });
  const badFloat = deriveOrderPda({ owner: OWNER, src: SRC, dst: DST, nonce: "1.5" });
  assert.equal("error" in badKey ? badKey.error : null, "invalid_pubkey");
  assert.equal("error" in badNeg ? badNeg.error : null, "invalid_nonce");
  assert.equal("error" in badFloat ? badFloat.error : null, "invalid_nonce");
});
