"use client";

import { useTMinus, useTMinusVersion } from "@/lib/tminus/adapters/context";
import { navigate } from "@/lib/tminus/router";
import { fmtDate } from "@/lib/tminus/utils";
import { SPACEX_ASSET_ID } from "@/lib/tminus/data/lifecycleData";
import { MAINNET_SPACEX_PROOF } from "@/lib/tminus/data/mainnetProof";
import { Button, Eyebrow } from "@/components/tminus/system/primitives";
import { Countdown } from "@/components/tminus/system/Countdown";
import { Reveal } from "@/components/tminus/system/Reveal";
import { HeroMachine } from "./HeroMachine";

export function Hero() {
  useTMinusVersion();
  const src = useTMinus();
  const env = src.getEnvironment();
  const asset = src.getAsset(SPACEX_ASSET_ID);
  const market = src.getMarket(SPACEX_ASSET_ID);
  const loading = !asset;

  return (
    <section className="dot-grid relative overflow-hidden border-b-2 border-ink" aria-label="T-MINUS hero">
      <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-10 px-4 pb-14 pt-14 md:px-6 lg:grid-cols-[1.02fr_0.98fr] lg:gap-6 lg:pb-20 lg:pt-20">
        <div className="relative z-10">
          <Reveal>
            <div className="flex flex-wrap items-center gap-2.5">
              <Eyebrow>PreStocks · Asset Lifecycle Engine</Eyebrow>
              <span className="inline-flex items-center gap-2 rounded-full border-2 border-ink bg-ink px-3 py-1.5 font-mono text-[10.5px] font-bold uppercase tracking-[0.16em] text-lime">
                <span className="h-1.5 w-1.5 rounded-full bg-lime animate-pulse-ring" aria-hidden />
                Watching issuer events
              </span>
            </div>
          </Reveal>

          <Reveal delay={90}>
            <h1 className="mt-7 font-display uppercase leading-[0.9] text-ink">
              <span className="block text-[clamp(2.6rem,7.4vw,5.6rem)]">When the issuer</span>
              <span className="block text-[clamp(2.6rem,7.4vw,5.6rem)]">changes the asset,</span>
              <span className="mt-2 inline-block -rotate-1">
                <span className="inline-block border-2 border-ink bg-lime px-4 pb-1 text-[clamp(2.6rem,7.4vw,5.6rem)] shadow-[6px_6px_0_0_var(--color-ink)]">
                  T-MINUS re-verifies.
                </span>
              </span>
            </h1>
          </Reveal>

          <Reveal delay={180}>
            <p className="mt-8 max-w-lg text-[17px] leading-relaxed text-fog">
              Issuer. Chain. Market. Then a signature — or a halt.
            </p>
          </Reveal>

          <Reveal delay={240}>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Button size="lg" onClick={() => navigate("#/app")}>
                Open App
                <span aria-hidden>→</span>
              </Button>
              <a
                href={MAINNET_SPACEX_PROOF.explorer}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-full border-2 border-ink bg-paper px-4 py-2 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-ink"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-lime" aria-hidden />
                Real Mainnet conversion · verified
              </a>
            </div>
          </Reveal>
        </div>

        <Reveal delay={140} className="relative">
          {asset ? (
            <HeroMachine asset={asset} market={market} />
          ) : (
            <div className="flex min-h-[280px] items-center justify-center rounded-2xl border-2 border-ink bg-paper font-mono text-[11px] uppercase tracking-[0.16em] text-fog">
              Loading live PreStocks feed…
            </div>
          )}
        </Reveal>
      </div>

      <div className="relative z-10 border-t-2 border-ink bg-paper">
        <div className="mx-auto grid max-w-6xl grid-cols-2 px-4 md:grid-cols-4 md:divide-x-2 md:divide-ink/10 md:px-6 [&>*:nth-child(odd)]:border-r-2 [&>*:nth-child(odd)]:border-ink/10 md:[&>*:nth-child(odd)]:border-r-0">
          <div className="flex flex-col gap-1 border-b-2 border-ink/10 py-3.5 pr-3 md:border-b-0 md:pr-0">
            <span className="mlabel text-fog">Data cluster</span>
            <span className="flex items-center gap-2 font-mono text-[12.5px] font-bold uppercase tracking-[0.08em] text-ink">
              <span className="h-1.5 w-1.5 rounded-full bg-lime animate-pulse-ring" aria-hidden />
              {loading ? "Loading" : env.dataCluster}
            </span>
          </div>
          <div className="flex flex-col gap-1 border-b-2 border-ink/10 py-3.5 pl-3 md:border-b-0 md:pl-6">
            <span className="mlabel text-fog">SPACEX window</span>
            <span className="font-mono text-[13px] font-bold tabular text-ink">
              {asset?.windowClosesAt ? fmtDate(asset.windowClosesAt) : loading ? "…" : "—"}
            </span>
          </div>
          <div className="flex flex-col gap-1 py-3.5 pr-3 pl-3 md:pl-6 md:pr-0">
            <span className="mlabel text-fog">Time left</span>
            <Countdown to={asset?.windowClosesAt ?? ""} className="text-[13px] text-ink" />
          </div>
          <div className="flex flex-col gap-1 py-3.5 pl-3 md:pl-6">
            <span className="mlabel text-fog">XAI</span>
            <span className="font-mono text-[13px] font-bold uppercase tracking-[0.08em] text-coral-ink">
              Window closed
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
