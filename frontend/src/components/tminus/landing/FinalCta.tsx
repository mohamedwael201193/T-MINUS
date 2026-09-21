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
  const asset = src.getAsset(SPACEX_ASSET_ID)!;

  return (
    <section aria-label="Open T-MINUS" className="relative overflow-hidden border-b-2 border-ink bg-ink-deep text-bone">
      {/* faint dial backdrop */}
      <svg
        viewBox="0 0 240 240"
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-16 h-[420px] w-[420px] opacity-[0.14]"
      >
        <circle cx="120" cy="120" r="112" fill="none" stroke="var(--color-bone)" strokeWidth="2" />
        <circle cx="120" cy="120" r="86" fill="none" stroke="var(--color-bone)" strokeWidth="10" opacity="0.4" />
        <path d="M120 34 A86 86 0 0 1 200 120" fill="none" stroke="var(--color-lime)" strokeWidth="10" />
        {Array.from({ length: 12 }, (_, i) => {
          const a = ((i * 30 - 90) * Math.PI) / 180;
          return (
            <line
              key={i}
              x1={120 + 94 * Math.cos(a)}
              y1={120 + 94 * Math.sin(a)}
              x2={120 + 106 * Math.cos(a)}
              y2={120 + 106 * Math.sin(a)}
              stroke="var(--color-bone)"
              strokeWidth="3"
            />
          );
        })}
      </svg>

      <div className="relative mx-auto max-w-6xl px-4 py-20 text-center md:px-6 md:py-28">
        <Reveal>
          <Eyebrow onInk tone="lime">
            SPACEX · window closes MAR 12 2027
          </Eyebrow>
          <h2 className="mx-auto mt-6 max-w-4xl font-display text-[clamp(2.8rem,8vw,6.2rem)] uppercase leading-[0.92] text-bone">
            The clock is{" "}
            <span className="inline-block -rotate-1 border-2 border-lime bg-lime px-4 pb-1 text-ink shadow-[6px_6px_0_0_rgba(241,237,226,0.25)]">
              running.
            </span>
          </h2>
          <p className="mx-auto mt-7 max-w-md text-[16px] leading-relaxed text-bone-dim">
            Open the desk before the window closes. You stay present for
            the signature.
          </p>
          <div className="mt-9 flex flex-col items-center gap-5">
            <Button size="lg" onClick={() => navigate("#/app")}>
              Open T-MINUS
              <span aria-hidden>→</span>
            </Button>
            <Countdown
              to={asset.windowClosesAt ?? ""}
              className="text-[17px] text-lime"
            />
          </div>
        </Reveal>
      </div>
    </section>
  );
}
