import type { RatioPoint } from "../domain/types";
import { clamp, round } from "../utils";

/**
 * Executable-ratio market state for the design console.
 *
 * INTEGRATION POINT — in production this is the live quote pipeline
 * (Jupiter price API cross-checked against executable delivery),
 * consumed through the MarketSource interface. Everything here is
 * deterministic at construction so server and client render the
 * same first frame.
 */

export const INITIAL_EXEC_RATIO = 0.7672;

/** deterministic seeded walk — ends exactly at INITIAL_EXEC_RATIO */
export function buildInitialHistory(points = 46): RatioPoint[] {
  let s = 42;
  const rnd = () => {
    s = (s * 1_664_525 + 1_013_904_223) >>> 0;
    return s / 4_294_967_296;
  };
  const out: RatioPoint[] = [];
  let v = 0.7639;
  for (let i = 0; i < points; i++) {
    v += (rnd() - 0.5) * 0.0034 + (INITIAL_EXEC_RATIO - v) * 0.16;
    v = clamp(v, 0.7455, 0.7925);
    out.push({ t: (i - points + 1) * 2_500, v: round(v) });
  }
  out[points - 1] = { t: 0, v: INITIAL_EXEC_RATIO };
  return out;
}

/* --------------------------- market walk phases -------------------------- */
/*
 * Session-relative phases that give the console a living market:
 *   quiet  (0–30s)   — mean-reverting noise around 0.7672
 *   climb (30–75s)   — "lockup tranche unlocked": drift up through 0.775
 *   settle (75s–)    — mean-revert around 0.7765
 * Orders resting below the ratio get filled as the climb passes them.
 */

export const MARKET_WALK = {
  quiet: { untilMs: 30_000, anchor: 0.7672, pull: 0.1, noise: 0.0034 },
  climb: {
    untilMs: 75_000,
    anchor: 0.7792,
    pull: 0.14,
    noise: 0.0016,
    event: {
      label: "LOCKUP TRANCHE UNLOCKED",
      detail: "Sep 24 tranche · 328.4M shares — executable ratio climbing",
    },
  },
  settle: { anchor: 0.7765, pull: 0.08, noise: 0.0038 },
  bounds: { min: 0.7455, max: 0.7935 },
  eventClearsAfterMs: 100_000,
} as const;
