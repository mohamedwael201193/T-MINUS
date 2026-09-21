import test from "node:test";
import assert from "node:assert/strict";
import { asTokenList, mintOf } from "./prestocks-catalog.ts";

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
