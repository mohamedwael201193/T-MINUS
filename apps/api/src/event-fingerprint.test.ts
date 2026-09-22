import assert from "node:assert/strict";
import { test } from "node:test";
import { parseIssuerInstruction } from "./issuer-instruction.ts";
import { eventFromInstruction, fingerprintActionable, fingerprintStatement } from "./event-fingerprint.ts";
import { classifyIssuerChange } from "./event-change.ts";

const SPACEX =
  "SpaceX has gone public! SpaceX PreStocks tokens must be swapped into $SPCXx or any other token before 11:59pm UTC on 12 March 2027, or they will expire worthless.";
const SPACEX_DEADLINE_B =
  "SpaceX has gone public! SpaceX PreStocks tokens must be swapped into $SPCXx or any other token before 11:59pm UTC on 15 March 2027, or they will expire worthless.";
const SPACEX_COSMETIC =
  "SpaceX has gone public! SpaceX PreStocks tokens must be swapped into $SPCXx or any other token before 11:59pm UTC on 12 March 2027, or they will expire worthless immediately.";
const XAI =
  "xAI was acquired by SpaceX. Each XAI token must be swapped into 0.7165 SPACEX before 11:59pm UTC on 12 September 2026, or it will expire worthless.";
const XAI_RATIO =
  "xAI was acquired by SpaceX. Each XAI token must be swapped into 0.80 SPACEX before 11:59pm UTC on 12 September 2026, or it will expire worthless.";
const SPACEX_DEST =
  "SpaceX has gone public! SpaceX PreStocks tokens must be swapped into $SPACEX before 11:59pm UTC on 12 March 2027, or they will expire worthless.";

function ev(html: string, url = "https://prestocks.com/spacex") {
  const i = parseIssuerInstruction(html);
  return { i, e: eventFromInstruction(i, url) };
}

test("fingerprint is stable for the same actionable instruction", () => {
  const a = fingerprintActionable(ev(SPACEX).e);
  const b = fingerprintActionable(ev(SPACEX).e);
  assert.equal(a, b);
  assert.equal(a.length, 64);
});

test("cosmetic extra sentence does not change the action fingerprint", () => {
  const a = fingerprintActionable(ev(SPACEX).e);
  const b = fingerprintActionable(ev(SPACEX_COSMETIC).e);
  assert.equal(a, b);
  assert.notEqual(fingerprintStatement(ev(SPACEX).i.statement), fingerprintStatement(ev(SPACEX_COSMETIC).i.statement));
});

test("deadline change is DEADLINE_CHANGED and actionable", () => {
  const prev = ev(SPACEX);
  const next = ev(SPACEX_DEADLINE_B);
  const r = classifyIssuerChange({
    previous: prev.e,
    current: next.e,
    previousStatementHash: fingerprintStatement(prev.i.statement),
    currentStatement: next.i.statement,
    sourceOk: true,
  });
  assert.ok(r.kinds.includes("DEADLINE_CHANGED"));
  assert.equal(r.actionable, true);
  assert.notEqual(r.fingerprint, fingerprintActionable(prev.e));
});

test("destination change is DESTINATION_CHANGED", () => {
  const prev = ev(SPACEX);
  const next = ev(SPACEX_DEST);
  const r = classifyIssuerChange({
    previous: prev.e,
    current: next.e,
    sourceOk: true,
    currentStatement: next.i.statement,
  });
  assert.ok(r.kinds.includes("DESTINATION_CHANGED"));
  assert.equal(r.actionable, true);
});

test("ratio change is RATIO_CHANGED", () => {
  const prev = ev(XAI, "https://prestocks.com/xai");
  const next = ev(XAI_RATIO, "https://prestocks.com/xai");
  const r = classifyIssuerChange({
    previous: prev.e,
    current: next.e,
    sourceOk: true,
    currentStatement: next.i.statement,
  });
  assert.ok(r.kinds.includes("RATIO_CHANGED"));
  assert.equal(r.actionable, true);
});

test("going-public to acquisition is ACTION_CHANGED", () => {
  const prev = ev(SPACEX);
  const next = ev(XAI, "https://prestocks.com/spacex");
  const r = classifyIssuerChange({
    previous: prev.e,
    current: next.e,
    sourceOk: true,
    currentStatement: next.i.statement,
  });
  assert.ok(r.kinds.includes("ACTION_CHANGED"));
  assert.equal(r.actionable, true);
});

test("source unavailable is actionable halt", () => {
  const prev = ev(SPACEX);
  const r = classifyIssuerChange({
    previous: prev.e,
    current: null,
    sourceOk: false,
  });
  assert.equal(r.primary, "SOURCE_UNAVAILABLE");
  assert.equal(r.actionable, true);
});

test("statement-only change is TEXT_CHANGED_NON_ACTIONABLE", () => {
  const prev = ev(SPACEX);
  const next = ev(SPACEX_COSMETIC);
  const r = classifyIssuerChange({
    previous: prev.e,
    current: next.e,
    previousStatementHash: fingerprintStatement(prev.i.statement),
    currentStatement: next.i.statement,
    sourceOk: true,
  });
  assert.equal(r.primary, "TEXT_CHANGED_NON_ACTIONABLE");
  assert.equal(r.actionable, false);
  assert.equal(r.fingerprint, fingerprintActionable(prev.e));
});

test("identical instruction is NO_CHANGE", () => {
  const prev = ev(SPACEX);
  const r = classifyIssuerChange({
    previous: prev.e,
    current: prev.e,
    previousStatementHash: fingerprintStatement(prev.i.statement),
    currentStatement: prev.i.statement,
    sourceOk: true,
  });
  assert.equal(r.primary, "NO_CHANGE");
  assert.equal(r.actionable, false);
});
