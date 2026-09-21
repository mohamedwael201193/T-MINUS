"use client";

import { useTMinus, useTMinusVersion } from "@/lib/tminus/adapters/context";
import { fmtDate } from "@/lib/tminus/utils";
import { SPACEX_ASSET_ID } from "@/lib/tminus/data/lifecycleData";
import { Eyebrow, Label, Panel } from "@/components/tminus/system/primitives";
import { Countdown, useElapsedFraction } from "@/components/tminus/system/Countdown";
import { Reveal } from "@/components/tminus/system/Reveal";

/**
 * The lifecycle transit map — SPACEX on a rail. Station positions:
 * ACQUIRED → WINDOW OPENS → (YOU ARE HERE) → DEADLINE → EXPIRY.
 * The "now" marker position is computed live from the window clock.
 */
export function LifecycleMap() {
  useTMinusVersion();
  const src = useTMinus();
  const asset = src.getAsset(SPACEX_ASSET_ID)!;
  const elapsed = useElapsedFraction(asset.windowOpenedAt, asset.windowClosesAt);
  const nowPos = elapsed == null ? 37 : 12 + elapsed * 74; // 12%..86%

  const stations = [
    { pos: 0, label: "Acquired", sub: "2025", tone: "done" as const, up: true },
    {
      pos: 12,
      label: "Window opens",
      sub: asset.windowOpenedAt ? fmtDate(asset.windowOpenedAt) : "—",
      tone: "done" as const,
      up: false,
    },
    { pos: nowPos, label: "You are here", sub: "CONVERSION WINDOW", tone: "now" as const, up: true },
    {
      pos: 88,
      label: "Deadline",
      sub: asset.windowClosesAt ? fmtDate(asset.windowClosesAt) : "—",
      tone: "warn" as const,
      up: false,
    },
    { pos: 100, label: "Expiry", sub: "WORTHLESS", tone: "dead" as const, up: true },
  ];

  return (
    <section id="lifecycle" aria-label="Lifecycle example" className="scroll-mt-20 border-b-2 border-ink">
      <div className="mx-auto max-w-6xl px-4 py-16 md:px-6 md:py-24">
        <Reveal>
          <Eyebrow>Lifecycle</Eyebrow>
          <h2 className="mt-5 font-display text-[clamp(2.2rem,5.4vw,4.2rem)] uppercase leading-[0.95] text-ink">
            Every asset is on a rail.
          </h2>
          <p className="mt-5 max-w-2xl text-[16.5px] leading-relaxed text-fog">
            Where {asset.symbol} is, right now — between the window that
            opened and the deadline that ends it.
          </p>
        </Reveal>

        <Reveal delay={120}>
          <Panel tone="paper" shadow="lg" className="mt-12 p-6 md:p-9">
            {/* the rail */}
            <div className="relative mt-14 mb-24 h-1 md:mt-10" aria-hidden>
              {/* base track */}
              <div className="absolute inset-x-0 top-0 h-[3px] -translate-y-1/2 rounded-full bg-ink/20" />
              {/* traveled segment */}
              <div
                className="absolute top-0 h-[3px] -translate-y-1/2 rounded-full bg-ink transition-all duration-1000"
                style={{ width: `${nowPos}%` }}
              />
              {/* remaining segment — flowing dashes */}
              <div
                className="absolute top-0 h-0 -translate-y-1/2"
                style={{ left: `${nowPos}%`, right: "0%" }}
              >
                <svg className="h-3 w-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 3">
                  <line
                    x1="0"
                    y1="1.5"
                    x2="100"
                    y2="1.5"
                    stroke="var(--color-lime)"
                    strokeWidth="3"
                    strokeDasharray="5 5"
                    className="animate-dash-flow"
                    vectorEffect="non-scaling-stroke"
                  />
                </svg>
              </div>
              {/* stations */}
              {stations.map((s) => (
                <div
                  key={s.label}
                  className="absolute top-0 -translate-x-1/2"
                  style={{ left: `${s.pos}%` }}
                >
                  {s.tone === "now" ? (
                    <span className="absolute -top-2 left-1/2 flex h-5 w-5 -translate-x-1/2 items-center justify-center">
                      <span className="absolute h-5 w-5 rounded-full animate-pulse-ring" />
                      <span className="h-4 w-4 rounded-full border-[3px] border-ink bg-lime" />
                    </span>
                  ) : s.tone === "done" ? (
                    <span className="absolute -top-[7px] left-1/2 h-3.5 w-3.5 -translate-x-1/2 rounded-full border-[3px] border-ink bg-ink" />
                  ) : s.tone === "warn" ? (
                    <span className="absolute -top-[9px] left-1/2 h-4 w-4 -translate-x-1/2 rotate-45 border-[3px] border-ink bg-amber" />
                  ) : (
                    <span className="absolute -top-[7px] left-1/2 h-3.5 w-3.5 -translate-x-1/2 rounded-full border-[3px] border-coral bg-bone" />
                  )}
                  {/* labels */}
                  <span
                    className={`absolute w-24 text-center ${
                      s.up ? "bottom-5" : "top-6"
                    } ${
                      s.pos === 0
                        ? "left-0 translate-x-0 text-left"
                        : s.pos >= 100
                          ? "right-0 left-auto translate-x-0 text-right"
                          : "left-1/2 -translate-x-1/2"
                    }`}
                  >
                    <span
                      className={`block font-mono text-[10px] font-bold uppercase tracking-[0.12em] leading-tight ${
                        s.tone === "now"
                          ? "text-ink"
                          : s.tone === "warn"
                            ? "text-ink"
                            : s.tone === "dead"
                              ? "text-coral"
                              : "text-fog"
                      }`}
                    >
                      {s.label}
                    </span>
                    <span className="mt-0.5 block font-mono text-[10px] tabular tracking-[0.06em] text-fog">
                      {s.sub}
                    </span>
                  </span>
                </div>
              ))}
            </div>

            {/* rail stats */}
            <div className="grid gap-6 border-t-2 border-dashed border-ink/15 pt-6 sm:grid-cols-3">
              <div>
                <Label>Time to deadline</Label>
                <Countdown
                  to={asset.windowClosesAt ?? ""}
                  className="mt-2 block text-[19px] text-ink"
                />
              </div>
              <div>
                <Label>Upcoming tranches</Label>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {asset.tranches.slice(0, 3).map((t) => (
                    <span
                      key={t.label}
                      title={t.detail}
                      className="rounded-full border-2 border-ink/25 bg-bone px-2.5 py-1 font-mono text-[9px] font-bold uppercase tracking-[0.1em] text-fog"
                    >
                      {t.label}
                    </span>
                  ))}
                  <span className="rounded-full border-2 border-ink/25 bg-bone px-2.5 py-1 font-mono text-[9px] font-bold uppercase tracking-[0.1em] text-fog">
                    DEC 08 · FULL
                  </span>
                </div>
              </div>
              <div>
                <Label>What the issuer promises</Label>
                <p className="mt-2 text-[12.5px] leading-relaxed text-fog">
                  Convert into {asset.destinationSymbol} at the market ratio
                  before{" "}
                  <span className="font-semibold text-ink">
                    {asset.windowClosesAt ? fmtDate(asset.windowClosesAt) : "—"}
                  </span>
                  . After the deadline, tokens expire worthless.
                </p>
              </div>
            </div>
          </Panel>
        </Reveal>
      </div>
    </section>
  );
}
