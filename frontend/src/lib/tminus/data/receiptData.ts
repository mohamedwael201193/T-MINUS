import type { ExecutionReceipt } from "../domain/types";

/**
 * Execution receipts — the proof layer.
 *
 * INTEGRATION POINT — in production, receipts are block-hashed
 * records written by the keeper to the public receipt ledger and
 * read back through the ReceiptSource interface. The values below
 * are design-state representations of that ledger (same shape,
 * same fields) for the two historical settled orders.
 */

export const INITIAL_RECEIPTS: ExecutionReceipt[] = [
  {
    id: "RC-1042",
    orderId: "TM-2477",
    assetId: "spacex",
    path: "TARGET",
    targetRatio: 0.74,
    floorRatio: 0.7,
    executedRatio: 0.7412,
    size: 2.5,
    filled: 1.853,
    signature: "SIMULATION-NOT-A-CHAIN-SIGNATURE",
    slot: 0,
    route: "SIMULATION · example ticket",
    feeBps: 100,
    settledAt: "2026-09-16T13:07:44.000Z",
    feedHash: "design-fixture",
    network: "SIMULATION",
    eventKind: "fill",
    sourceSymbol: "SPACEX",
    destinationSymbol: "SPCXx",
  },
  {
    id: "RC-0917",
    orderId: "TM-2406",
    assetId: "spacex",
    path: "FAILSAFE",
    targetRatio: 0.78,
    floorRatio: 0.7,
    executedRatio: 0.7041,
    size: 4.0,
    filled: 2.8164,
    signature: "SIMULATION-NOT-A-CHAIN-SIGNATURE",
    slot: 0,
    route: "SIMULATION · example ticket",
    feeBps: 100,
    settledAt: "2026-08-30T21:15:02.000Z",
    feedHash: "design-fixture",
    network: "SIMULATION",
    eventKind: "fill",
    sourceSymbol: "SPACEX",
    destinationSymbol: "SPCXx",
  },
];
