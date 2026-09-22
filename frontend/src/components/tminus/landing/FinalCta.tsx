"use client";

import { useTMinus, useTMinusVersion } from "@/lib/tminus/adapters/context";
import { navigate } from "@/lib/tminus/router";
import { SPACEX_ASSET_ID } from "@/lib/tminus/data/lifecycleData";
import { Button, Eyebrow } from "@/components/tminus/system/primitives";
import { Countdown } from "@/components/tminus/system/Countdown";
import { Reveal } from "@/components/tminus/system/Reveal";

export function FinalCta() {
  useTMinusVersion();
  const src = useTMinus();
  const asset = src.getAsset(SPACEX_ASSET_ID);

  return (
    <section aria-label="Open T-MINUS" className="relative overflow-hidden border-b-2 border-ink bg-ink-deep text-bone">
      <div className="relative mx-auto max-w-6xl px-4 py-20 text-center md:px-6 md:py-28">
        <Reveal>
          <Eyebrow onInk tone="lime">
            SPACEX window still open
          </Eyebrow>
          <h2 className="mx-auto mt-6 max-w-4xl font-display text-[clamp(2.6rem,7vw,5.4rem)] uppercase leading-[0.92] text-bone">
            Open the desk.
            <span className="mt-2 block text-lime">Stay present for the sign.</span>
          </h2>
          <div className="mt-9 flex flex-col items-center gap-5">
            <Button size="lg" onClick={() => navigate("#/app")}>
              Open App
              <span aria-hidden>→</span>
            </Button>
            <Countdown to={asset?.windowClosesAt ?? ""} className="text-[17px] text-lime" />
          </div>
        </Reveal>
      </div>
    </section>
  );
}
