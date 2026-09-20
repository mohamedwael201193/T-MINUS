import test from "node:test";
import assert from "node:assert/strict";
import { activeFloor, ceilRatio, isFillable, quoteRatioE9 } from "@tminus/sdk";

test("fillability matches on-chain ceil floor", () => {
  const src = 990_000n;
  const floor = 500_000_000n;
  const minDst = ceilRatio(src, floor);
  const quoteOut = minDst;
  assert.equal(isFillable(quoteRatioE9(quoteOut, src), floor), true);
  assert.equal(isFillable(quoteRatioE9(minDst - 1n, src), floor), false);
});

test("failsafe switches floor", () => {
  assert.equal(activeFloor(1, 10, 9n, 7n), 9n);
  assert.equal(activeFloor(10, 10, 9n, 7n), 7n);
});
