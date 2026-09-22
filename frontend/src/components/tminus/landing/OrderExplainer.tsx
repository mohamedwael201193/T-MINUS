"use client";

import { useTMinus, useTMinusVersion } from "@/lib/tminus/adapters/context";
import { navigate } from "@/lib/tminus/router";
import { fmtDate, fmtRatio } from "@/lib/tminus/utils";
import { SPACEX_ASSET_ID } from "@/lib/tminus/data/lifecycleData";
import { Button, Eyebrow, Label } from "@/components/tminus/system/primitives";
import { Reveal } from "@/components/tminus/system/Reveal";

export function OrderExplainer() {
  useTMinusVersion();
  const src = useTMinus();
  const asset = src.getAsset(SPACEX_ASSET_ID);
  const market = src.getMarket(SPACEX_ASSET_ID);
  const ratio = market.executableRatio;

  return (
    <section id="how" aria-label="The action desk" className="scroll-mt-20 border-b-2 border-ink">
      <div className="mx-auto max-w-6xl px-4 py-16 md:px-6 md:py-24">
        <Reveal>
          <Eyebrow>The desk</Eyebrow>
          <h2 className="mt-5 font-display text-[clamp(2.2rem,5.4vw,4.2rem)] uppercase leading-[0.95] text-ink">
            Safe → sign. Unsafe → refuse.
          </h2>
          <p className="mt-5 max-w-xl text-[16.5px] leading-relaxed text-fog">
            The Conversion Desk is the consumer. The engine decides. You stay present for the signature.
          </p>
        </Reveal>

        <div className="mt-12 grid gap-6 lg:grid-cols-2">
          <Reveal delay={80}>
            <div className="rounded-2xl border-2 border-ink bg-paper p-6 shadow-[6px_6px_0_0_var(--color-ink)]">
              <div className="flex items-center justify-between">
                <Label>SPACEX conversion</Label>
                <span className="rounded-full border-2 border-ink bg-lime px-2.5 py-1 font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-ink">
                  Window open
                </span>
              </div>
              <div className="mt-4 flex items-center justify-between rounded-xl border-2 border-ink bg-ink px-4 py-3">
                <span className="mlabel text-bone-dim">Live post-fee ratio</span>
                <span className="font-mono text-lg font-bold tabular text-lime">
                  {ratio != null ? fmtRatio(ratio) : "—"}
                </span>
              </div>
              <dl className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-xl border-2 border-ink bg-bone/60 p-3.5">
                  <Label>Floor</Label>
                  <p className="mt-1.5 font-mono text-xl font-bold text-ink">0.700</p>
                </div>
                <div className="rounded-xl border-2 border-ink bg-bone/60 p-3.5">
                  <Label>Deadline</Label>
                  <p className="mt-1.5 font-mono text-xl font-bold text-ink">
                    {asset?.windowClosesAt ? fmtDate(asset.windowClosesAt) : "—"}
                  </p>
                </div>
              </dl>
              <Button variant="lime" className="mt-5 w-full" onClick={() => navigate("#/app")}>
                Open the desk
                <span aria-hidden>→</span>
              </Button>
            </div>
          </Reveal>

          <div className="flex flex-col gap-5">
            <Reveal delay={120}>
              <div className="rounded-2xl border-2 border-ink bg-paper p-6">
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-fog">If gates pass</p>
                <p className="mt-3 font-display text-[1.7rem] uppercase leading-none text-ink">Ask the holder to sign</p>
                <p className="mt-3 text-[14px] text-fog">
                  Jupiter Swap V2 builds the trade. Phantom authorizes it. Solana confirms. T-MINUS stores a receipt only after confirmation.
                </p>
              </div>
            </Reveal>
            <Reveal delay={180}>
              <div className="rounded-2xl border-2 border-ink bg-paper p-6">
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-fog">If the issuer moved</p>
                <p className="mt-3 font-display text-[1.7rem] uppercase leading-none text-ink">Old tx is stale</p>
                <p className="mt-3 text-[14px] text-fog">
                  Deadline, destination, ratio, or action type change invalidates the bound snapshot. Signing stays halted until a new fetch passes.
                </p>
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
