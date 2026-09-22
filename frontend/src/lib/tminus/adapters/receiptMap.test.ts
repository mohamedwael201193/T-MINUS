import assert from "node:assert/strict";
import { test } from "node:test";
import { isOnChainOrderPda, mapReceipt } from "./receiptMap.ts";
import type { ReceiptRow } from "./api.ts";

function row(kind: string, extra: Partial<ReceiptRow["payload"]> = {}): ReceiptRow {
  return {
    order_pda: "EpMA1LWpJXU67WBTF2LhhTX6ucYRsbf7z7sAaC8fikgC",
    sig: "5cZurXQRKMZGWoLhpyamUjGQ9dZn61UgckDf7osoVwk34U6kVMNJ6XuAGiSH7GDoiWaTa2BKV9EXjFHHvVKAuwXw",
    slot: 501649888,
    created_at: "2026-09-21T00:51:00.000Z",
    payload: {
      kind,
      network: "DEVNET",
      sourceAmount: "990000",
      destinationAmount: kind === "fill" ? "990000" : "0",
      failsafeFlag: kind === "fill" && extra.failsafeFlag === true,
      ...extra,
    },
  };
}

test("fill with failsafe is FAILSAFE, not TARGET MET", () => {
  const r = mapReceipt(row("fill", { failsafeFlag: true, destinationAmount: "990000" }), 0);
  assert.equal(r.eventKind, "fill");
  assert.equal(r.path, "FAILSAFE");
  assert.match(r.explorerUrl ?? "", /cluster=devnet/);
  assert.equal(r.network, "DEVNET");
  assert.equal(r.sourceSymbol, "DEVNET-SRC");
});

test("cancel is cancel even when destination is zero", () => {
  const r = mapReceipt(row("cancel"), 1);
  assert.equal(r.eventKind, "cancel");
  assert.equal(r.route, "DEVNET · cancel · unknown");
});

test("expire is expire", () => {
  const r = mapReceipt(row("expire"), 2);
  assert.equal(r.eventKind, "expire");
});

test("place is place", () => {
  const r = mapReceipt(row("place"), 3);
  assert.equal(r.eventKind, "place");
});

test("missing kind with destination defaults to fill", () => {
  const r = mapReceipt(
    {
      order_pda: "EpMA1LWpJXU67WBTF2LhhTX6ucYRsbf7z7sAaC8fikgC",
      sig: "3Hjih2B1D932mKZfBC2WTXM9feET7hjESDom3XoGWC2PFz1SgMBcygCWn6xjeRMexrrR71PJwmRc8JBpc6pSRDDq",
      slot: 1,
      created_at: "2026-09-21T00:00:00.000Z",
      payload: { network: "DEVNET", destinationAmount: "400000", sourceAmount: "400000" },
    },
    4,
  );
  assert.equal(r.eventKind, "fill");
});

test("mainnet jupiter conversion is labeled conversion not protocol fill", () => {
  const r = mapReceipt(
    {
      order_pda: "conversion:spacex:CpTxsgPj",
      sig: "1111111111111111111111111111111111111111111111111111111111111111",
      slot: 9,
      created_at: "2026-09-22T00:00:00.000Z",
      payload: {
        kind: "mainnet_jupiter_conversion",
        network: "MAINNET",
        sourceAmount: "200000000",
        destinationAmount: "75722514",
        ratio: "757225140",
        destinationSymbol: "SPCXx",
        assetId: "spacex",
        taker: "CpTxsgPjvaaPSaBKkijvB1h3hzgJmPiTsWNhuS7tRkgX",
        verifiedOnchain: true,
        explorer: "https://explorer.solana.com/tx/1111111111111111111111111111111111111111111111111111111111111111",
      },
    },
    5,
  );
  assert.equal(r.eventKind, "conversion");
  assert.equal(r.network, "MAINNET");
  assert.equal(r.size, 1);
  assert.ok(Math.abs(r.filled - 0.75722514) < 1e-9);
  assert.equal(r.programId, "jupiter-swap-v2");
  assert.doesNotMatch(r.explorerUrl ?? "", /cluster=devnet/);
  assert.equal(r.feeBps, 100);
  assert.equal(r.verifiedOnchain, true);
  assert.equal(r.taker, "CpTxsgPjvaaPSaBKkijvB1h3hzgJmPiTsWNhuS7tRkgX");
});

test("unverified conversion does not set verifiedOnchain", () => {
  const r = mapReceipt(
    {
      order_pda: "conversion:spacex:CpTxsgPjvaaPSaBKkijvB1h3hzgJmPiTsWNhuS7tRkgX",
      sig: "1111111111111111111111111111111111111111111111111111111111111111",
      slot: 9,
      created_at: "2026-09-22T00:00:00.000Z",
      payload: {
        kind: "mainnet_jupiter_conversion",
        network: "MAINNET",
        sourceAmount: "1827211",
        destinationAmount: "702134",
        sourceDisplay: 0.009136055,
        destinationDisplay: 0.00702134,
        verifiedOnchain: false,
      },
    },
    6,
  );
  assert.equal(r.eventKind, "conversion");
  assert.equal(r.verifiedOnchain, false);
});

test("conversion: order ids are not on-chain PDAs", () => {
  assert.equal(isOnChainOrderPda("conversion:spacex:CpTxsgPj"), false);
  assert.equal(isOnChainOrderPda("EpMA1LWpJXU67WBTF2LhhTX6ucYRsbf7z7sAaC8fikgC"), true);
  assert.equal(isOnChainOrderPda(""), false);
});
