"use client";

import { useTMinus, useTMinusVersion } from "@/lib/tminus/adapters/context";
import { fmtDate, fmtUsd } from "@/lib/tminus/utils";
import { SPACEX_ASSET_ID } from "@/lib/tminus/data/lifecycleData";
import { Eyebrow, Label, Panel } from "@/components/tminus/system/primitives";
import { Reveal } from "@/components/tminus/system/Reveal";

export function Problem() {
  useTMinusVersion();
  const src = useTMinus();
  const asset = src.getAsset(SPACEX_ASSET_ID);
  const spacex = src.getAction("spacex");
  const xai = src.getAction("xai");

  return (
    <section id="product" aria-label="The problem" className="scroll-mt-20 border-b-2 border-ink">
      <div className="mx-auto max-w-6xl px-4 py-16 md:px-6 md:py-24">
        <Reveal>
          <Eyebrow>The problem</Eyebrow>
          <h2 className="mt-5 max-w-3xl font-display text-[clamp(2.2rem,5.4vw,4.2rem)] uppercase leading-[0.95] text-ink">
            PreStocks are not static tokens.
          </h2>
          <p className="mt-5 max-w-xl text-[17px] leading-relaxed text-fog">
            The issuer can change the asset’s state. A DEX will still quote the swap.
            It will not tell you the instruction moved.
          </p>
        </Reveal>

        <div className="mt-12 grid gap-6 lg:grid-cols-2">
          <Reveal delay={80}>
            <Panel tone="paper" shadow="lg" className="h-full p-6 md:p-7">
              <Label>SPACEX · going public</Label>
              <p className="mt-4 font-display text-[clamp(1.8rem,3vw,2.4rem)] uppercase leading-none text-ink">
                Action live
              </p>
              <dl className="mt-6 grid grid-cols-2 gap-4">
                <div>
                  <dt className="mlabel text-fog">Deadline</dt>
                  <dd className="mt-1 font-mono text-lg font-bold text-ink">
                    {asset?.windowClosesAt ? fmtDate(asset.windowClosesAt) : "MAR 12 2027"}
                  </dd>
                </div>
                <div>
                  <dt className="mlabel text-fog">Destination</dt>
                  <dd className="mt-1 font-mono text-lg font-bold text-ink">SPCXx</dd>
                </div>
                <div>
                  <dt className="mlabel text-fog">Price</dt>
                  <dd className="mt-1 font-mono text-lg font-bold text-ink">
                    {asset ? fmtUsd(asset.price) : "—"}
                  </dd>
                </div>
                <div>
                  <dt className="mlabel text-fog">Gate</dt>
                  <dd className="mt-1 font-mono text-lg font-bold uppercase text-lime">
                    {spacex?.stage === "CONVERSION_WINDOW" ? "Executable" : spacex?.stage ?? "…"}
                  </dd>
                </div>
              </dl>
              <p className="mt-6 border-t-2 border-dashed border-ink/15 pt-4 font-mono text-[10px] uppercase tracking-[0.1em] text-fog">
                Holder signs a Jupiter TRADE. Not a 1:1 rollover.
              </p>
            </Panel>
          </Reveal>

          <Reveal delay={140}>
            <Panel tone="paper" shadow="lg" className="h-full p-6 md:p-7">
              <Label>XAI · acquired</Label>
              <p className="mt-4 font-display text-[clamp(1.8rem,3vw,2.4rem)] uppercase leading-none text-ink">
                Action expired
              </p>
              <dl className="mt-6 grid grid-cols-2 gap-4">
                <div>
                  <dt className="mlabel text-fog">Deadline</dt>
                  <dd className="mt-1 font-mono text-lg font-bold text-ink">SEP 12 2026</dd>
                </div>
                <div>
                  <dt className="mlabel text-fog">Stated ratio</dt>
                  <dd className="mt-1 font-mono text-lg font-bold text-ink">0.7165 SPACEX</dd>
                </div>
                <div>
                  <dt className="mlabel text-fog">Instruction</dt>
                  <dd className="mt-1 font-mono text-lg font-bold uppercase text-ink">Expire worthless</dd>
                </div>
                <div>
                  <dt className="mlabel text-fog">Gate</dt>
                  <dd className="mt-1 font-mono text-lg font-bold uppercase text-coral-ink">
                    {xai?.refusals[0] ?? "Signing halted"}
                  </dd>
                </div>
              </dl>
              <p className="mt-6 border-t-2 border-dashed border-ink/15 pt-4 font-mono text-[10px] uppercase tracking-[0.1em] text-fog">
                T-MINUS will not request a signature. On-chain burn is not assumed.
              </p>
            </Panel>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
