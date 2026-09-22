import test from "node:test";
import assert from "node:assert/strict";
import { displayToRaw, maxSafeInputRaw, rawToDisplayString } from "./safe-amount.ts";

test("maxSafeInput never exceeds the wallet", () => {
  const wallet = 1_827_211n;
  const safe = maxSafeInputRaw({ walletRaw: wallet });
  assert.equal(safe, wallet);
  assert.ok(safe < 2_000_000n); // 0.01 display would be 2_000_000
});

test("maxSafeInput respects ui and route caps", () => {
  assert.equal(
    maxSafeInputRaw({ walletRaw: 5_000_000n, uiLimitRaw: 1_000_000n, routeMaxRaw: 4_000_000n }),
    1_000_000n,
  );
  assert.equal(maxSafeInputRaw({ walletRaw: 0n }), 0n);
});

test("dust wallet round-trips through display without rounding up past the wallet", () => {
  const raw = 1_827_211n;
  const display = rawToDisplayString(raw);
  assert.equal(display, "0.009136055");
  assert.equal(displayToRaw(display), raw);
  assert.ok(displayToRaw("0.01") > raw);
});
