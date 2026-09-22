import assert from "node:assert/strict";
import { test } from "node:test";
import { displayToRaw, isWalletRejected, maxSafeInputRaw, rawToDisplayString } from "./safeAmount.ts";

test("wallet dust is the default, not 0.01", () => {
  const wallet = 1_827_211n;
  assert.equal(maxSafeInputRaw(wallet), wallet);
  assert.equal(rawToDisplayString(wallet), "0.009136055");
  assert.ok(displayToRaw("0.01") > wallet);
});

test("user reject is detected from Phantom codes", () => {
  assert.equal(isWalletRejected({ code: 4001, message: "User rejected the request." }), true);
  assert.equal(isWalletRejected({ message: "ok" }), false);
});
