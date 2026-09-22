import test from "node:test";
import assert from "node:assert/strict";
import {
  OWNER_RE,
  isOnChainOrderPda,
  ownerActivityFromRows,
  receiptMatchesOwner,
  toActivityItem,
  type ReceiptStoreRow,
} from "./activity.ts";

const WALLET = "CpTxsgPjvaaPSaBKkijvB1h3hzgJmPiTsWNhuS7tRkgX";
const OTHER = "FrwqWhgEhbSnvKXzsG74qkB4ZsRiiheay7LcWBNd5DTj";
const SIG = "2RfXRieEW3HRZBVU4qHqnzRSvoV9KcEX5kYBzAjVW7VTkv2ig4u5frozAinumDnUApjWHLwcbsZEh3BSjsSWRNBW";

function conversion(overrides: Partial<ReceiptStoreRow> = {}): ReceiptStoreRow {
  return {
    order_pda: `conversion:spacex:${WALLET}`,
    sig: SIG,
    slot: 449215609,
    created_at: "2026-09-22T00:22:59.597Z",
    payload: {
      kind: "mainnet_jupiter_conversion",
      network: "MAINNET",
      taker: WALLET,
      wallet: WALLET,
      assetId: "spacex",
      sourceAmount: "1827211",
      destinationAmount: "702134",
      sourceDisplay: 0.009136055,
      destinationDisplay: 0.00702134,
      destinationSymbol: "SPCXx",
      ratio: "768530837",
      route: { composition: "Meteora DLMM", path: "order_execute" },
      explorer: `https://explorer.solana.com/tx/${SIG}`,
      verifiedOnchain: true,
      timestamp: "2026-09-22T00:22:59.293Z",
      corporateActionId: "spacex:GOING_PUBLIC",
      settlementKind: "TRADE",
    },
    ...overrides,
  };
}

function protocol(): ReceiptStoreRow {
  return {
    order_pda: "EpMA1LWpJXU67WBTF2LhhTX6ucYRsbf7z7sAaC8fikgC",
    sig: "26YLJiQh51AeQH2XNXqGgruM3L5KthHNNk83z1iSsNL4WiLnDYbmPD4ffaZX997sibXvc8doRZZKDJSARcc9mv7x",
    slot: 501637575,
    created_at: "2026-09-21T00:21:43.058Z",
    payload: {
      kind: "fill",
      network: "DEVNET",
      sourceAmount: "990000",
      destinationAmount: "990000",
      explorer:
        "https://explorer.solana.com/tx/26YLJiQh51AeQH2XNXqGgruM3L5KthHNNk83z1iSsNL4WiLnDYbmPD4ffaZX997sibXvc8doRZZKDJSARcc9mv7x?cluster=devnet",
    },
  };
}

test("verified Mainnet receipt appears for the correct wallet", () => {
  const items = ownerActivityFromRows([conversion(), protocol()], WALLET);
  assert.equal(items.length, 1);
  assert.equal(items[0].kind, "CONVERSION");
  assert.equal(items[0].network, "MAINNET");
  assert.equal(items[0].signature, SIG);
  assert.equal(items[0].verifiedOnchain, true);
  assert.equal(items[0].pda, null);
  assert.equal(items[0].sourceAmount, 0.009136055);
  assert.equal(items[0].destinationAmount, 0.00702134);
  assert.ok(Math.abs((items[0].ratio ?? 0) - 0.768530837) < 1e-9);
  assert.equal(items[0].route, "Meteora DLMM");
  assert.doesNotMatch(items[0].explorerUrl, /cluster=devnet/);
});

test("wrong wallet receives zero Mainnet results", () => {
  const items = ownerActivityFromRows([conversion(), protocol()], OTHER);
  assert.equal(items.length, 0);
});

test("Devnet protocol records remain labeled DEVNET", () => {
  const item = toActivityItem(protocol());
  assert.ok(item);
  assert.equal(item.kind, "PROTOCOL_ORDER");
  assert.equal(item.network, "DEVNET");
  assert.match(item.explorerUrl, /cluster=devnet/);
  assert.equal(item.event, "fill");
  assert.equal(item.pda, "EpMA1LWpJXU67WBTF2LhhTX6ucYRsbf7z7sAaC8fikgC");
});

test("Mainnet trade never requests PDA inspection", () => {
  const item = toActivityItem(conversion());
  assert.equal(item?.pda, null);
  assert.equal(isOnChainOrderPda("conversion:spacex:" + WALLET), false);
  assert.equal(isOnChainOrderPda(SIG), false);
});

test("synthetic conversion ID is never used as a Devnet PDA", () => {
  assert.equal(isOnChainOrderPda("conversion:spacex:CpTxsgPj"), false);
  const item = toActivityItem(conversion());
  assert.equal(item?.kind, "CONVERSION");
  assert.equal(item?.pda, null);
});

test("empty wallet shows no activity only when truly empty", () => {
  assert.equal(ownerActivityFromRows([], WALLET).length, 0);
  assert.equal(ownerActivityFromRows([protocol()], WALLET).length, 0);
  assert.equal(ownerActivityFromRows([conversion()], WALLET).length, 1);
});

test("verifiedOnchain=false does not display VERIFIED", () => {
  const row = conversion({
    payload: { ...(conversion().payload ?? {}), verifiedOnchain: false },
  });
  const item = toActivityItem(row);
  assert.equal(item?.verifiedOnchain, false);
});

test("multiple Mainnet conversions sort newest-first", () => {
  const older = conversion();
  const newer = conversion({
    sig: "BjrpESCGk4mom5mL854LDgzj4ec9sbVEm3w69NVa5ei2NnqPyF954sBShdv42MbkUmWNBBbG2N9fNZzE6DfCsxt",
    slot: 449273588,
    created_at: "2026-09-22T04:41:17.721Z",
    payload: {
      ...(conversion().payload ?? {}),
      timestamp: "2026-09-22T04:41:17.664Z",
      explorer:
        "https://explorer.solana.com/tx/BjrpESCGk4mom5mL854LDgzj4ec9sbVEm3w69NVa5ei2NnqPyF954sBShdv42MbkUmWNBBbG2N9fNZzE6DfCsxt",
    },
  });
  const items = ownerActivityFromRows([older, newer], WALLET);
  assert.equal(items.length, 2);
  assert.equal(items[0].signature, newer.sig);
  assert.equal(items[1].signature, SIG);
});

test("owner regex rejects invalid wallets", () => {
  assert.equal(OWNER_RE.test("not-a-key"), false);
  assert.equal(OWNER_RE.test(WALLET), true);
});

test("network separation remains correct", () => {
  const mixed = ownerActivityFromRows(
    [
      conversion(),
      protocol(),
      {
        ...protocol(),
        payload: { ...(protocol().payload ?? {}), owner: WALLET, network: "DEVNET", kind: "place" },
      },
    ],
    WALLET,
  );
  assert.equal(mixed.filter((i) => i.kind === "CONVERSION").every((i) => i.network === "MAINNET"), true);
  assert.equal(mixed.filter((i) => i.kind === "PROTOCOL_ORDER").every((i) => i.network === "DEVNET"), true);
  assert.equal(
    mixed.some((i) => i.kind === "CONVERSION" && i.explorerUrl.includes("cluster=devnet")),
    false,
  );
});

test("owner match uses persisted taker, not a shortened label", () => {
  assert.equal(receiptMatchesOwner(conversion(), "CpTxsgPj"), false);
  assert.equal(receiptMatchesOwner(conversion(), WALLET), true);
});
