"use client";

import { useTMinus, useTMinusVersion } from "@/lib/tminus/adapters/context";
import { navigate } from "@/lib/tminus/router";
import { fmtDate, fmtRatio } from "@/lib/tminus/utils";
import { SPACEX_ASSET_ID } from "@/lib/tminus/data/lifecycleData";
import { Button, Eyebrow, Label } from "@/components/tminus/system/primitives";
import { RatioBand } from "@/components/tminus/system/RatioBand";
import { Reveal } from "@/components/tminus/system/Reveal";

/**
 * "How the order works" — a static, annotated preview of the real
 * order ticket plus the two IF/THEN rules in plain English.
 */
export function OrderExplainer() {
  useTMinusVersion();
  const src = useTMinus();
  const asset = src.getAsset(SPACEX_ASSET_ID)!;
  const market = src.getMarket(SPACEX_ASSET_ID);
  const ratio = market.executableRatio;

  return (
    <section id="how" aria-label="How the order works" className="scroll-mt-20 border-b-2 border-ink">
      <div className="mx-auto max-w-6xl px-4 py-16 md:px-6 md:py-24">
        <Reveal>
          <Eyebrow>The order</Eyebrow>
          <h2 className="mt-5 font-display text-[clamp(2.2rem,5.4vw,4.2rem)] uppercase leading-[0.95] text-ink">
            Two rules. That’s the whole order.
          </h2>
          <p className="mt-5 max-w-2xl text-[16.5px] leading-relaxed text-fog">
            No terminal. No stack of indicators. You write two conditions —
            the conversion you want, and the worst you’ll accept — and the
            clock does the rest.
          </p>
        </Reveal>

        <div className="mt-12 grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          {/* ticket preview */}
          <Reveal delay={80} className="relative">
            <div className="relative rounded-2xl border-2 border-ink bg-paper p-6 shadow-[6px_6px_0_0_var(--color-ink)]">
              <div className="flex items-center justify-between">
                <Label>Set your rule</Label>
                <span className="rounded-full border-2 border-ink bg-ink px-2.5 py-1 font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-bone">
                  {asset.symbol} → {asset.destinationSymbol}
                </span>
              </div>

              <div className="mt-4 flex items-center justify-between rounded-xl border-2 border-ink bg-ink px-4 py-3">
                <span className="mlabel text-bone-dim">Executable now</span>
                <span className="font-mono text-lg font-bold tabular text-lime">
                  {ratio != null ? fmtRatio(ratio) : "—"}
                </span>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3.5">
                <div className="rounded-xl border-2 border-ink bg-bone/60 p-3.5">
                  <Label>Target</Label>
                  <p className="mt-1.5 font-mono text-xl font-bold tabular text-ink">0.820</p>
                </div>
                <div className="rounded-xl border-2 border-ink bg-bone/60 p-3.5">
                  <Label>Failsafe date</Label>
                  <p className="mt-1.5 font-mono text-xl font-bold tabular text-ink">MAR 01 2027</p>
                </div>
                <div className="rounded-xl border-2 border-ink bg-bone/60 p-3.5">
                  <Label>Floor</Label>
                  <p className="mt-1.5 font-mono text-xl font-bold tabular text-ink">0.700</p>
                </div>
                <div className="rounded-xl border-2 border-ink bg-bone/60 p-3.5">
                  <Label>Amount</Label>
                  <p className="mt-1.5 font-mono text-xl font-bold tabular text-ink">1.00 SPACEX</p>
                </div>
              </div>

              <div className="mt-5">
                <RatioBand floor={0.7} target={0.82} current={ratio} compact />
              </div>

              <Button
                variant="lime"
                className="mt-5 w-full"
                onClick={() => navigate("#/app")}
              >
                Try it live
                <span aria-hidden>→</span>
              </Button>
            </div>

            {/* callouts (xl) — leader lines tie chips to their fields */}
            <div className="pointer-events-none absolute -right-4 top-4 hidden rotate-2 xl:block">
              <span className="inline-block rounded-full border-2 border-ink bg-lime px-3.5 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-ink shadow-[3px_3px_0_0_var(--color-ink)]">
                Target — the ratio you want
              </span>
              <span aria-hidden className="absolute left-6 top-full h-4 w-[2px] border-l-2 border-dashed border-ink/40" />
            </div>
            <div className="pointer-events-none absolute -left-5 top-[42%] hidden -rotate-2 xl:block">
              <span
                aria-hidden
                className="absolute right-6 top-1/2 h-[2px] w-5 border-t-2 border-dashed border-ink/40"
              />
              <span className="relative inline-block rounded-full border-2 border-ink bg-amber px-3.5 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-ink shadow-[3px_3px_0_0_var(--color-ink)]">
                Failsafe — your deadline
              </span>
            </div>
            <div className="pointer-events-none absolute -right-4 bottom-24 hidden rotate-1 xl:block">
              <span aria-hidden className="absolute left-8 bottom-full h-4 w-[2px] border-l-2 border-dashed border-ink/40" />
              <span className="inline-block rounded-full border-2 border-coral bg-paper px-3.5 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-coral-ink shadow-[3px_3px_0_0_var(--color-ink)]">
                Floor — the worst you accept
              </span>
            </div>
          </Reveal>

          {/* the two rules */}
          <div className="flex flex-col gap-5">
            <Reveal delay={140}>
              <div className="h-full rounded-2xl border-2 border-ink bg-paper p-6 shadow-[4px_4px_0_0_var(--color-ink)]">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-ink bg-lime font-mono text-[10px] font-bold text-ink">
                    1
                  </span>
                  <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-fog">
                    Rule 01 — the target
                  </p>
                </div>
                <p className="mt-4 font-mono text-[15px] font-bold uppercase leading-snug tracking-[0.02em] text-ink">
                  IF the executable ratio reaches{" "}
                  <span className="rounded bg-lime px-1.5">0.820</span>
                </p>
                <p className="mt-2 flex items-center gap-2 text-[14px] text-fog">
                  <span aria-hidden className="font-bold text-ink">→</span>
                  Convert your SPACEX into {asset.destinationSymbol} at 0.820
                  or better.
                </p>
              </div>
            </Reveal>

            <Reveal delay={200}>
              <div className="h-full rounded-2xl border-2 border-ink bg-paper p-6 shadow-[4px_4px_0_0_var(--color-ink)]">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-ink bg-amber font-mono text-[10px] font-bold text-ink">
                    2
                  </span>
                  <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-fog">
                    Rule 02 — the failsafe
                  </p>
                </div>
                <p className="mt-4 font-mono text-[15px] font-bold uppercase leading-snug tracking-[0.02em] text-ink">
                  IF{" "}
                  <span className="rounded bg-amber px-1.5">MAR 01 2027</span>{" "}
                  arrives first
                </p>
                <p className="mt-2 flex items-center gap-2 text-[14px] text-fog">
                  <span aria-hidden className="font-bold text-ink">→</span>
                  Attempt the conversion at your floor — 0.700 or better. No
                  worse, no surprises.
                </p>
              </div>
            </Reveal>

            <Reveal delay={260}>
              <div className="rounded-2xl border-2 border-dashed border-ink/40 bg-bone/50 p-5">
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-ink">
                  Executable = after fees
                </p>
                <p className="mt-2.5 text-[13.5px] leading-relaxed text-fog">
                  The ratio you set is the ratio you’d receive. The 1%
                  Token-2022 transfer fee is priced in before the condition
                  is ever checked — so the trigger you see is the fill you
                  get.
                </p>
                <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.1em] text-fog">
                  Failsafe can be set any day up to{" "}
                  {asset.windowClosesAt ? fmtDate(asset.windowClosesAt) : "—"}{" "}
                  — the hard deadline.
                </p>
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
