import test from "node:test";
import assert from "node:assert/strict";
import { parseIssuerInstruction, resolveDestination } from "./issuer-instruction.ts";

const SPACEX_HTML =
  "SpaceX has gone public! SpaceX PreStocks tokens must be swapped into $SPCXx or any other token before 11:59pm UTC on 12 March 2027, or they will expire worthless.";

const XAI_HTML =
  "xAI was acquired by SpaceX. Each XAI token must be swapped into 0.7165 SPACEX before 11:59pm UTC on 12 September 2026, or it will expire worthless.";

test("parses SPACEX going-public instruction and SPCXx destination", () => {
  const i = parseIssuerInstruction(SPACEX_HTML);
  assert.equal(i.actionType, "GOING_PUBLIC");
  assert.equal(i.deadlineIso, "2027-03-12T23:59:00.000Z");
  assert.equal(i.destinationTicker, "SPCXX");
  assert.equal(i.destinationAllowsAny, true);
  assert.equal(i.statedRatio, null);
  assert.equal(i.expireWorthless, true);
  const dest = resolveDestination(i.destinationTicker);
  assert.equal(dest?.mint, "Xs3oZwbHvqis4NYcf4YKWmEia2eC84wSiVrcYcTqpH8");
  assert.equal(dest?.catalogMember, false);
});

test("parses XAI acquisition instruction with stated ratio", () => {
  const i = parseIssuerInstruction(XAI_HTML);
  assert.equal(i.actionType, "ACQUISITION");
  assert.equal(i.deadlineIso, "2026-09-12T23:59:00.000Z");
  assert.equal(i.destinationTicker, "SPACEX");
  assert.equal(i.statedRatio, 0.7165);
  assert.equal(i.destinationAllowsAny, false);
  assert.ok(i.statement);
  assert.match(i.statement, /acquired by|swapped into|expire worthless/i);
});

test("strips nav chrome and glued decimals from issuer HTML", () => {
  const html =
    "<nav>Website Twitter</nav><p>xAI was acquired by SpaceX.</p><p>Each XAI token must be swapped into 0.<span>7165</span> SPACEX before 11:59pm UTC on 12 September 2026, or it will expire worthless.</p>";
  const i = parseIssuerInstruction(html);
  assert.equal(i.actionType, "ACQUISITION");
  assert.equal(i.statedRatio, 0.7165);
  assert.ok(i.statement);
  assert.doesNotMatch(i.statement, /Website/);
  assert.match(i.statement, /0\.7165 SPACEX/i);
});

test("OPENAI-like page without a banner is NONE", () => {
  const i = parseIssuerInstruction("OpenAI PreStock. Founded 2015. No conversion language.");
  assert.equal(i.actionType, "NONE");
  assert.equal(i.deadlineIso, null);
  assert.equal(i.destinationTicker, null);
});
