import type { ConversionOrder } from "../domain/types";

/**
 * Orders held by this console's design holder.
 *
 * INTEGRATION POINT — replace with the on-chain order accounts
 * (owner-scoped program accounts) via the OrderSource interface.
 * Timestamps are fixed ISO values so the first frame is identical
 * on server and client.
 *
 * The four orders deliberately cover the live-state spectrum:
 *   TM-2481 — WATCHING (target 0.7750, just above the live ratio;
 *             fills when the market climbs)
 *   TM-2477 — SETTLED via the TARGET path (has receipt RC-1042)
 *   TM-2406 — SETTLED via the FAILSAFE path (has receipt RC-0917)
 *   TM-2398 — CANCELLED by the owner before anything fired
 */

export const INITIAL_ORDERS: ConversionOrder[] = [
  {
    id: "TM-2481",
    assetId: "spacex",
    amount: 1.0,
    targetRatio: 0.775,
    floorRatio: 0.7,
    failsafeAt: "2027-03-01T00:00:00.000Z",
    status: "WATCHING",
    createdAt: "2026-09-19T10:12:05.000Z",
    events: [
      { status: "PLACED", at: "2026-09-19T10:12:05.000Z", note: "escrow funded · 1.00 SPACEX" },
      { status: "ARMED", at: "2026-09-19T10:12:07.000Z", note: "policy locked on order account" },
      {
        status: "WATCHING",
        at: "2026-09-19T10:12:09.000Z",
        note: "keeper watching executable ratio vs 0.7750",
      },
    ],
  },
  {
    id: "TM-2477",
    assetId: "spacex",
    amount: 2.5,
    targetRatio: 0.74,
    floorRatio: 0.7,
    failsafeAt: "2027-02-20T00:00:00.000Z",
    status: "SETTLED",
    createdAt: "2026-09-15T09:41:12.000Z",
    fillPath: "TARGET",
    executedRatio: 0.7412,
    filledAmount: 1.853,
    receiptId: "RC-1042",
    events: [
      { status: "PLACED", at: "2026-09-15T09:41:12.000Z", note: "escrow funded · 2.50 SPACEX" },
      { status: "ARMED", at: "2026-09-15T09:41:14.000Z" },
      { status: "WATCHING", at: "2026-09-15T09:41:16.000Z" },
      {
        status: "TARGET_REACHED",
        at: "2026-09-16T13:07:40.000Z",
        note: "executable ratio 0.7412 ≥ target 0.7400",
      },
      { status: "EXECUTING", at: "2026-09-16T13:07:42.000Z", note: "atomic fill · Jupiter + program" },
      { status: "SETTLED", at: "2026-09-16T13:07:44.000Z", note: "1.8530 SPCXx delivered" },
    ],
  },
  {
    id: "TM-2406",
    assetId: "spacex",
    amount: 4.0,
    targetRatio: 0.78,
    floorRatio: 0.7,
    failsafeAt: "2026-08-30T21:00:00.000Z",
    status: "SETTLED",
    createdAt: "2026-08-25T16:03:33.000Z",
    fillPath: "FAILSAFE",
    executedRatio: 0.7041,
    filledAmount: 2.8164,
    receiptId: "RC-0917",
    events: [
      { status: "PLACED", at: "2026-08-25T16:03:33.000Z", note: "escrow funded · 4.00 SPACEX" },
      { status: "ARMED", at: "2026-08-25T16:03:35.000Z" },
      { status: "WATCHING", at: "2026-08-25T16:03:37.000Z" },
      {
        status: "EXECUTING",
        at: "2026-08-30T21:15:00.000Z",
        note: "failsafe reached — attempting at floor 0.7000",
      },
      { status: "SETTLED", at: "2026-08-30T21:15:02.000Z", note: "2.8164 SPCXx delivered at 0.7041" },
    ],
  },
  {
    id: "TM-2398",
    assetId: "spacex",
    amount: 0.8,
    targetRatio: 0.79,
    floorRatio: 0.72,
    failsafeAt: "2027-02-15T00:00:00.000Z",
    status: "CANCELLED",
    createdAt: "2026-09-08T11:22:46.000Z",
    events: [
      { status: "PLACED", at: "2026-09-08T11:22:46.000Z" },
      { status: "ARMED", at: "2026-09-08T11:22:48.000Z" },
      { status: "WATCHING", at: "2026-09-08T11:22:50.000Z" },
      {
        status: "CANCELLED",
        at: "2026-09-12T18:40:21.000Z",
        note: "cancelled by owner · escrow returned (1% fee on return leg)",
      },
    ],
  },
];

export const ORDER_ID_PREFIX = "TM-";
export const RECEIPT_ID_PREFIX = "RC-";
