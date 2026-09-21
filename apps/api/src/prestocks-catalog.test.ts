import test from "node:test";
import assert from "node:assert/strict";
import { asTokenList, issuerSlugsFromTokens, mintOf } from "./prestocks-catalog.ts";

test("official PreStocks API is a root array with contract_address", () => {
  const list = asTokenList([
    {
      symbol: "SPACEX",
      name: "SpaceX PreStocks",
      contract_address: "PreANxuXjsy2pvisWWMNB6YaJNzr7681wJJr2rHsfTh",
      markPrice: 153.88,
      tokenPrice: 120.69,
    },
  ]);
  assert.equal(list.length, 1);
  assert.equal(mintOf(list[0]), "PreANxuXjsy2pvisWWMNB6YaJNzr7681wJJr2rHsfTh");
});

test("wrapped {tokens} payloads still parse", () => {
  const list = asTokenList({
    tokens: [{ symbol: "OPENAI", splMint: "PreweJ1111111111111111111111111111111111111" }],
  });
  assert.equal(mintOf(list[0]), "PreweJ1111111111111111111111111111111111111");
});

test("issuer slugs include known pages plus every catalog symbol", () => {
  const slugs = issuerSlugsFromTokens([
    { symbol: "ANDURIL", contract_address: "PreAnd111111111111111111111111111111111111" },
    { symbol: "SPACEX", contract_address: "PreANxuXjsy2pvisWWMNB6YaJNzr7681wJJr2rHsfTh" },
  ]);
  assert.ok(slugs.includes("anduril"));
  assert.ok(slugs.includes("spacex"));
  assert.ok(slugs.includes("xai"));
  assert.ok(slugs.includes("openai"));
});
