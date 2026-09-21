"use client";

import { useTMinus, useTMinusVersion } from "@/lib/tminus/adapters/context";
import { navigate } from "@/lib/tminus/router";
import { fmtRatio, fmtDate } from "@/lib/tminus/utils";
import { SPACEX_ASSET_ID } from "@/lib/tminus/data/lifecycleData";
import { Button, Eyebrow } from "@/components/tminus/system/primitives";
import { Countdown } from "@/components/tminus/system/Countdown";
import { Reveal } from "@/components/tminus/system/Reveal";
import { HeroMachine } from "./HeroMachine";

export function Hero() {
  useTMinusVersion(); // live ratio + countdown re-renders
  const src = useTMinus();
  const env = src.getEnvironment();
  const asset = src.getAsset(SPACEX_ASSET_ID);
  const market = src.getMarket(SPACEX_ASSET_ID);
  const loading = !asset;

  return (
    <section className="dot-grid relative overflow-hidden border-b-2 border-ink" aria-label="T-MINUS hero">
      <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-10 px-4 pb-14 pt-14 md:px-6 lg:grid-cols-[1.02fr_0.98fr] lg:gap-6 lg:pb-20 lg:pt-20">
        {/* copy column */}
        <div className="relative z-10">
          <Reveal>
            <div className="flex flex-wrap items-center gap-2.5">
              <Eyebrow>PreStocks · Corporate Action Layer</Eyebrow>
              <span className="inline-flex items-center gap-2 rounded-full border-2 border-ink bg-ink px-3 py-1.5 font-mono text-[10.5px] font-bold uppercase tracking-[0.16em] text-lime">
                <span className="h-1.5 w-1.5 rounded-full bg-lime animate-pulse-ring" aria-hidden />
                System watching
              </span>
            </div>
          </Reveal>

          <Reveal delay={90}>
            <h1 className="mt-7 font-display uppercase leading-[0.92] text-ink">
              <span className="block text-[clamp(3.1rem,8.2vw,6.4rem)]">Your token</span>
              <span className="block text-[clamp(3.1rem,8.2vw,6.4rem)]">has a</span>
              <span className="mt-1 inline-block -rotate-1">
                <span className="inline-block -rotate-1 border-2 border-ink bg-lime px-4 pb-1 text-[clamp(3.1rem,8.2vw,6.4rem)] shadow-[6px_6px_0_0_var(--color-ink)]">
                  clock.
                </span>
              </span>
            </h1>
          </Reveal>

          <Reveal delay={180}>
            <p className="mt-8 max-w-md text-[17px] leading-relaxed text-fog">
              PreStocks tokens carry issuer events: IPO, acquisition, expiry.
              Generic DEX UIs will still swap them after they are scheduled to
              expire worthless. T-MINUS reads the issuer instruction, checks
              the mint, prices a fee-aware route, then asks the holder to sign
              a real trade — or refuses.{" "}
              <span className="font-semibold text-ink">
                Not a 1:1 rollover. Not unattended Mainnet custody. A corporate-action desk.
              </span>
            </p>
          </Reveal>

          <Reveal delay={260}>
            <div className="mt-9 flex flex-wrap items-center gap-4">
              <Button size="lg" onClick={() => navigate("#/app")}>
                Open T-MINUS
                <span aria-hidden>→</span>
              </Button>
              <Button size="lg" variant="outline" href="#how">
                See how it works
                <span aria-hidden>↓</span>
              </Button>
            </div>
          </Reveal>
        </div>

        {/* machine column */}
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

      {/* live status strip */}
      <div className="relative z-10 border-t-2 border-ink bg-paper">
        <div className="mx-auto grid max-w-6xl grid-cols-2 px-4 md:grid-cols-4 md:divide-x-2 md:divide-ink/10 md:px-6 [&>*:nth-child(odd)]:border-r-2 [&>*:nth-child(odd)]:border-ink/10 md:[&>*:nth-child(odd)]:border-r-0">
          <div className="flex flex-col gap-1 border-b-2 border-ink/10 py-3.5 pr-3 md:border-b-0 md:pr-0 md:pl-0">
            <span className="mlabel text-fog">Lifecycle feed</span>
            <span className="flex items-center gap-2 font-mono text-[12.5px] font-bold uppercase tracking-[0.08em] text-ink">
              <span className="h-1.5 w-1.5 rounded-full bg-lime animate-pulse-ring" aria-hidden />
              {loading ? "Loading" : env.dataCluster}
            </span>
          </div>
          <div className="flex flex-col gap-1 border-b-2 border-ink/10 py-3.5 pl-3 md:border-b-0 md:pl-6">
            <span className="mlabel text-fog">SPACEX exec ratio</span>
            <span className="font-mono text-[13px] font-bold tabular text-ink">
              {market.executableRatio != null ? fmtRatio(market.executableRatio) : loading ? "…" : "—"}
            </span>
          </div>
          <div className="flex flex-col gap-1 py-3.5 pr-3 pl-3 md:py-3.5 md:pl-6 md:pr-0">
            <span className="mlabel text-fog">Window closes</span>
            <span className="font-mono text-[13px] font-bold tabular text-ink">
              {asset?.windowClosesAt ? fmtDate(asset.windowClosesAt) : loading ? "…" : "—"}
            </span>
          </div>
          <div className="flex flex-col gap-1 py-3.5 pl-3 md:pl-6">
            <span className="mlabel text-fog">Time to expiry</span>
            <Countdown
              to={asset?.windowClosesAt ?? ""}
              className="text-[13px] text-ink"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
