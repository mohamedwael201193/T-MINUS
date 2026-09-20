import test from "node:test";
import assert from "node:assert/strict";
import { parseEventType, parseLockup, parsePageDeadlineIso } from "./feed-parse.ts";

test("extracts PreStocks conversion deadline from live page wording", () => {
  const html =
    "<p>SpaceX PreStocks tokens must be swapped into $SPCXx or any other token before 11:59pm UTC on 12 March 2027, or they will expire worthless.</p>";
  assert.equal(parsePageDeadlineIso(html), "2027-03-12T23:59:00.000Z");
  assert.equal(parseEventType(html), "prestock_expiry_warning");
  assert.equal(parseLockup(html), null);
});

test("returns null when the page has no deadline", () => {
  assert.equal(parsePageDeadlineIso("no dates here"), null);
});
