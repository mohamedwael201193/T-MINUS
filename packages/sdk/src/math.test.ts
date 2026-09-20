import test from "node:test";
import assert from "node:assert/strict";
import { ceilRatio, activeFloor, quoteRatioE9, isFillable } from "./index.ts";

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
