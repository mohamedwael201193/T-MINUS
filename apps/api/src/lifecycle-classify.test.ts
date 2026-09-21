import test from "node:test";
import assert from "node:assert/strict";
import {
  assetIdFromSymbol,
  classifyExecution,
  classifyStage,
  isPrestocksMint,
} from "./lifecycle-classify.ts";

test("SPACEX conversion deadline in the future is CONVERSION_WINDOW", () => {
  const stage = classifyStage({
    deadline: "2027-03-12T23:59:00.000Z",
    eventType: "prestock_conversion_deadline",
    now: new Date("2026-09-21T00:00:00.000Z"),
  });
  assert.equal(stage, "CONVERSION_WINDOW");
  assert.equal(classifyExecution(stage, true), "AVAILABLE");
});

test("XAI deadline that has passed is EXPIRED and HALTED", () => {
  const stage = classifyStage({
    deadline: "2026-09-12T23:59:00.000Z",
    eventType: "prestock_conversion_deadline",
    now: new Date("2026-09-21T00:00:00.000Z"),
  });
  assert.equal(stage, "EXPIRED");
  assert.equal(classifyExecution(stage, true), "HALTED");
});

test("no deadline and no conversion event is TERMS_PENDING", () => {
  const stage = classifyStage({
    deadline: null,
    eventType: "prestock_lifecycle",
    now: new Date("2026-09-21T00:00:00.000Z"),
  });
  assert.equal(stage, "TERMS_PENDING");
  assert.equal(classifyExecution(stage, false), "LIMITED");
});

test("eligibility helper only accepts Pre* mints", () => {
  assert.equal(isPrestocksMint("PreANxuXjsy2pvisWWMNB6YaJNzr7681wJJr2rHsfTh"), true);
  assert.equal(isPrestocksMint("So11111111111111111111111111111111111111112"), false);
  assert.equal(assetIdFromSymbol("SPACEX"), "spacex");
});
