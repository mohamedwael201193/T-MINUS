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
    signature: "5j3Kq9XwmTcP2vR7hE8dZbA4nUfL6yGgYs1WjQ5tNcVx2mHr7BpKd3FzS9uEwGoXbQ1aRkMnJ4vT",
    slot: 344_507_912,
    route: "JUPITER · METEORA",
    feeBps: 100,
    settledAt: "2026-09-16T13:07:44.000Z",
    feedHash: "ab12cdef·9f3a77c0",
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
    signature: "3nVbY7wQpKf2mXrT9cHgD5jZsA8uL1eRoWqN4tMxCvBkGyJd7SfPaEiU6hO0zIlKm9VrT3cXwB2",
    slot: 343_882_455,
    route: "JUPITER · METEORA",
    feeBps: 100,
    settledAt: "2026-08-30T21:15:02.000Z",
    feedHash: "77e0aa14·31bc58de",
  },
];
