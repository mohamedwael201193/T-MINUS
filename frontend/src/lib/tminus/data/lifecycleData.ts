import type { LifecycleAsset } from "../domain/types";

/**
 * Lifecycle reference data for the assets shown in this console.
 *
 * INTEGRATION POINT — replace with the signed lifecycle feed
 * (destinations, ratios, deadlines, tranche calendar, issuer-power
 * snapshots). The UI never imports this file directly; it flows
 * through the TMinusSource adapter.
 */

export const SPACEX_ASSET_ID = "spacex";
export const OPENAI_ASSET_ID = "openai";

export const LIFECYCLE_ASSETS: LifecycleAsset[] = [
  {
    id: SPACEX_ASSET_ID,
    symbol: "SPACEX",
    name: "SpaceX PreStock",
    kind: "PRESTOCK",
    tokenStandard: "TOKEN-2022",
    destinationSymbol: "SPCXx",
    destinationName: "SpaceX xStock",
    destinationPrice: 153.88,
    price: 117.74,
    markPrice: 153.49,
    prescribedRatio: 1.0,
    transferFeeBps: 100,
    holders: 10_111,
    supplyDisplay: 43_712.5,
    stage: "CONVERSION_WINDOW",
    stageNote: "Issuer conversion window open — escrow-and-convert permitted",
    windowOpenedAt: "2026-06-12T00:00:00.000Z",
    windowClosesAt: "2027-03-12T23:59:00.000Z",
    tranches: [
      {
        date: "2026-09-24T00:00:00.000Z",
        label: "SEP 24",
        detail: "Day-105 tranche · 328.4M shares",
      },
      {
        date: "2026-10-09T00:00:00.000Z",
        label: "OCT 09",
        detail: "Rolling tranche unlock",
      },
      {
        date: "2026-10-24T00:00:00.000Z",
        label: "OCT 24",
        detail: "Rolling tranche unlock",
      },
      {
        date: "2026-11-05T00:00:00.000Z",
        label: "Q3 +2D",
        detail: "Q3 earnings +2d · 1.3B shares",
      },
      {
        date: "2026-12-08T00:00:00.000Z",
        label: "DEC 08",
        detail: "Full lockup expiry",
      },
    ],
    rawMultiplier: 5,
  },
  {
    id: OPENAI_ASSET_ID,
    symbol: "OPENAI",
    name: "OpenAI PreStock",
    kind: "PRESTOCK",
    tokenStandard: "TOKEN-2022",
    destinationSymbol: "TBD",
    destinationName: "Terms pending",
    destinationPrice: null,
    price: 28.62,
    markPrice: 36.15,
    prescribedRatio: 1.0,
    transferFeeBps: 100,
    holders: 31_204,
    supplyDisplay: 128_940.0,
    stage: "TERMS_PENDING",
    stageNote: "Pre-IPO — 9-month conversion window opens at IPO. No terms published yet.",
    windowOpenedAt: null,
    windowClosesAt: null,
    tranches: [],
    rawMultiplier: 6,
  },
];

export function findAsset(id: string): LifecycleAsset | undefined {
  return LIFECYCLE_ASSETS.find((a) => a.id === id);
}
