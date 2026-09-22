"use client";

import { Eyebrow } from "@/components/tminus/system/primitives";
import { Reveal } from "@/components/tminus/system/Reveal";

const STEPS = [
  {
    n: "01",
    title: "Issuer truth",
    body: "Parse the issuer page: event type, deadline, destination, ratio. Hash only the actionable fields.",
  },
  {
    n: "02",
    title: "Chain truth",
    body: "Inspect the mint: pause, hook, transfer fee, Token-2022 program. A paused or hooked mint cannot sign.",
  },
  {
    n: "03",
    title: "Market truth",
    body: "Price a live Jupiter route. Trigger APIs reject transfer-fee mints. Swap V2 does not.",
  },
  {
    n: "04",
    title: "Safety gate",
    body: "If the issuer instruction changed, the old transaction is dead. Fresh snapshot, or no signature.",
  },
];

export function MentalModel() {
  return (
    <section aria-label="How T-MINUS works" className="border-b-2 border-ink bg-bone-deep/60">
      <div className="mx-auto max-w-6xl px-4 py-16 md:px-6 md:py-24">
        <Reveal>
          <Eyebrow>How it works</Eyebrow>
          <h2 className="mt-5 font-display text-[clamp(2.2rem,5.4vw,4.2rem)] uppercase leading-[0.95] text-ink">
            Four truths. Then you sign — or you don’t.
          </h2>
        </Reveal>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <Reveal key={s.n} delay={i * 80}>
              <div className="h-full rounded-2xl border-2 border-ink bg-paper p-6">
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-fog">{s.n}</p>
                <h3 className="mt-2 font-display text-[1.55rem] uppercase leading-none text-ink">{s.title}</h3>
                <p className="mt-3 text-[13.5px] leading-relaxed text-fog">{s.body}</p>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal delay={200}>
          <p className="mt-10 text-center font-mono text-[11px] uppercase tracking-[0.16em] text-fog">
            Source changed → reparse → chain recheck → market recheck → route recheck → signing gate
          </p>
        </Reveal>
      </div>
    </section>
  );
}
