import test from "node:test";
import assert from "node:assert/strict";
import { PublicKey } from "@solana/web3.js";
import {
  ceilRatio,
  activeFloor,
  quoteRatioE9,
  isFillable,
  orderPda,
  PROGRAM_ID,
  DISPLAY_RAW_SPACEX,
  OPEN_STATUS_MEMCMP_BYTES,
  ORDER_STATUS_OFFSET,
} from "./index.ts";

test("ceil ratio", () => {
  assert.equal(ceilRatio(100n, 1_000_000_000n), 100n);
  assert.equal(ceilRatio(3n, 500_000_000n), 2n);
});

test("active floor", () => {
  assert.equal(activeFloor(10, 20, 900n, 700n), 900n);
  assert.equal(activeFloor(20, 20, 900n, 700n), 700n);
});

test("quote ratio uses floor division", () => {
  assert.equal(quoteRatioE9(76706836n, 200000000n), 383534180n);
  assert.equal(isFillable(383534180n, 383534180n), true);
  assert.equal(isFillable(383534179n, 383534180n), false);
});

test("1 display SPACEX is 200_000_000 raw", () => {
  assert.equal(DISPLAY_RAW_SPACEX, 200_000_000n);
});

test("open-order memcmp bytes are portable base58 for status=0", () => {
  assert.equal(OPEN_STATUS_MEMCMP_BYTES, "1");
  assert.equal(ORDER_STATUS_OFFSET, 210);
});

test("order PDA is stable for the declared program id", () => {
  const owner = new PublicKey("FrwqWhgEhbSnvKXzsG74qkB4ZsRiiheay7LcWBNd5DTj");
  const src = new PublicKey("PreANxuXjsy2pvisWWMNB6YaJNzr7681wJJr2rHsfTh");
  const dst = new PublicKey("Xs3oZwbHvqis4NYcf4YKWmEia2eC84wSiVrcYcTqpH8");
  const [a] = orderPda(owner, src, dst, 1n);
  const [b] = orderPda(owner, src, dst, 1n);
  const [c] = orderPda(owner, src, dst, 2n);
  assert.equal(a.toBase58(), b.toBase58());
  assert.notEqual(a.toBase58(), c.toBase58());
  assert.equal(PROGRAM_ID, "HRLmVcuk6PRcVwB3UVpcbEC3LVVMhdLZfPvHtmL2PUdL");
});
