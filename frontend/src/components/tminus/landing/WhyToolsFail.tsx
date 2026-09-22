"use client";

import { Eyebrow } from "@/components/tminus/system/primitives";
import { Reveal } from "@/components/tminus/system/Reveal";

const FAILURES = [
  {
    title: "DEX UIs ignore issuer events",
    body: "A swap interface will still quote SPACEX after the instruction changes. T-MINUS fingerprints the actionable issuer fields and kills the old route.",
  },
  {
    title: "Triggers reject the mint",
    quote: "ERROR: Mint has transfer fee",
    body: "Jupiter Trigger refuses Token-2022 transfer-fee mints. SPACEX is 100 bps. Conversion uses Swap V2 order + execute, not Trigger.",
  },
  {
    title: "Old quotes must not sign",
    body: "A previously built Jupiter transaction is bound to an action fingerprint. If issuer, destination, fee, pause, or hook moved — do not sign.",
  },
];

export function WhyToolsFail() {
  return (
    <section id="why" aria-label="Why this is not a DEX" className="scroll-mt-20 border-b-2 border-ink bg-ink-deep text-bone">
      <div className="mx-auto max-w-6xl px-4 py-16 md:px-6 md:py-24">
        <Reveal>
          <Eyebrow onInk>Why not a DEX</Eyebrow>
          <h2 className="mt-5 font-display text-[clamp(2.2rem,5.4vw,4.2rem)] uppercase leading-[0.95] text-bone">
            Trading already exists.
          </h2>
          <p className="mt-5 max-w-xl text-[16.5px] leading-relaxed text-bone-dim">
            Wallets exist. Analytics exist. T-MINUS is for the moment the issuer changes the asset.
          </p>
        </Reveal>

        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {FAILURES.map((f, i) => (
            <Reveal key={f.title} delay={i * 90}>
              <div className="flex h-full flex-col rounded-2xl border-2 border-bone/15 bg-ink-2 p-6">
                <h3 className="font-display text-[1.4rem] uppercase leading-tight text-bone">{f.title}</h3>
                <p className="mt-3 flex-1 text-[13.5px] leading-relaxed text-bone-dim">{f.body}</p>
                {f.quote ? (
                  <code className="mt-4 block rounded-lg border border-bone/20 bg-ink px-3.5 py-2.5 font-mono text-[10px] text-lime">
                    {f.quote}
                  </code>
                ) : null}
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
