import test from "node:test";
import assert from "node:assert/strict";
import { shouldScanProgramAccounts } from "./orders.ts";

test("does not scan program accounts when the program is missing or not executable", () => {
  assert.equal(shouldScanProgramAccounts(null), false);
  assert.equal(shouldScanProgramAccounts({ executable: false }), false);
  assert.equal(shouldScanProgramAccounts({ executable: true }), true);
});
