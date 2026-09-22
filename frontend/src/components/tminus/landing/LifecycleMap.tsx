"use client";

import { useTMinus, useTMinusVersion } from "@/lib/tminus/adapters/context";
import { fmtDate } from "@/lib/tminus/utils";
import { SPACEX_ASSET_ID } from "@/lib/tminus/data/lifecycleData";
import { Eyebrow, Label, Panel } from "@/components/tminus/system/primitives";
import { Countdown, useElapsedFraction } from "@/components/tminus/system/Countdown";
import { Reveal } from "@/components/tminus/system/Reveal";

export function LifecycleMap() {
  useTMinusVersion();
  const src = useTMinus();
  const asset = src.getAsset(SPACEX_ASSET_ID);
  const elapsed = useElapsedFraction(asset?.windowOpenedAt ?? null, asset?.windowClosesAt ?? null);
  const nowPos = elapsed == null ? 37 : 12 + elapsed * 74;

  const stations = [
    { pos: 0, label: "Terms pending", sub: "No window yet", tone: "done" as const, up: true },
    {
      pos: 12,
      label: "Window open",
      sub: asset?.windowOpenedAt ? fmtDate(asset.windowOpenedAt) : "Live",
      tone: "done" as const,
      up: false,
    },
    { pos: nowPos, label: "You are here", sub: "CONVERSION WINDOW", tone: "now" as const, up: true },
    {
      pos: 88,
      label: "Deadline",
      sub: asset?.windowClosesAt ? fmtDate(asset.windowClosesAt) : "—",
      tone: "warn" as const,
      up: false,
    },
    { pos: 100, label: "Expired", sub: "SIGNING HALTED", tone: "dead" as const, up: true },
  ];

  return (
    <section id="lifecycle" aria-label="Lifecycle" className="scroll-mt-20 border-b-2 border-ink">
      <div className="mx-auto max-w-6xl px-4 py-16 md:px-6 md:py-24">
        <Reveal>
          <Eyebrow>Lifecycle</Eyebrow>
          <h2 className="mt-5 font-display text-[clamp(2.2rem,5.4vw,4.2rem)] uppercase leading-[0.95] text-ink">
            Terms. Window. Event. Halt.
          </h2>
          <p className="mt-5 max-w-xl text-[16.5px] leading-relaxed text-fog">
            Stages T-MINUS actually uses: TERMS PENDING, CONVERSION WINDOW, EXPIRED.
            SPACEX is in the window. XAI is expired.
          </p>
        </Reveal>

        <Reveal delay={120}>
          <Panel tone="paper" shadow="lg" className="mt-12 p-6 md:p-9">
            <div className="relative mt-14 mb-24 h-1 md:mt-10" aria-hidden>
              <div className="absolute inset-x-0 top-0 h-[3px] -translate-y-1/2 rounded-full bg-ink/20" />
              <div
                className="absolute top-0 h-[3px] -translate-y-1/2 rounded-full bg-ink transition-all duration-1000"
                style={{ width: `${nowPos}%` }}
              />
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

            <div className="grid gap-6 border-t-2 border-dashed border-ink/15 pt-6 sm:grid-cols-3">
              <div>
                <Label>Time to deadline</Label>
                <Countdown to={asset?.windowClosesAt ?? ""} className="mt-2 block text-[19px] text-ink" />
              </div>
              <div>
                <Label>Issuer event</Label>
                <p className="mt-2 font-mono text-[13px] font-bold uppercase text-ink">Going public</p>
              </div>
              <div>
                <Label>If the instruction moves</Label>
                <p className="mt-2 text-[12.5px] leading-relaxed text-fog">
                  Old fingerprint dies. Old Jupiter transaction cannot sign. The desk re-fetches issuer, chain, and market first.
                </p>
              </div>
            </div>
          </Panel>
        </Reveal>
      </div>
    </section>
  );
}
