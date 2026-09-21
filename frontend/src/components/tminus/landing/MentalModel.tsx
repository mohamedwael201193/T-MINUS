"use client";

import { Eyebrow } from "@/components/tminus/system/primitives";
import { Reveal } from "@/components/tminus/system/Reveal";

const STEPS = [
  {
    n: "01",
    title: "See the clock",
    body: "Every asset carries its lifecycle state — window, deadline, destination — before you touch a number.",
    icon: (
      <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden>
        <circle cx="13" cy="13" r="10.5" fill="none" stroke="var(--color-ink)" strokeWidth="2.4" />
        <path d="M13 5.5A7.5 7.5 0 0 1 20.5 13" fill="none" stroke="var(--color-lime)" strokeWidth="3.4" />
        <path d="M13 13V7.5M13 13l4 3" stroke="var(--color-ink)" strokeWidth="2.4" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    n: "02",
    title: "Read the action",
    body: "Issuer instruction, on-chain mint, market, Jupiter route, T-MINUS gate — five layers, none of them a dummy countdown.",
    icon: (
      <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden>
        <circle cx="13" cy="13" r="9.5" fill="none" stroke="var(--color-ink)" strokeWidth="2.4" />
        <circle cx="13" cy="13" r="4.5" fill="none" stroke="var(--color-lime)" strokeWidth="3" />
        <path d="M13 1v4M13 21v4M1 13h4M21 13h4" stroke="var(--color-ink)" strokeWidth="2.2" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    n: "03",
    title: "Sign or refuse",
    body: "You only see a signature request when the window is open, the quote is fresh, and the post-fee route clears your floor.",
    icon: (
      <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden>
        <path d="M3 18c4-7 8 3 11-3s6 1 9-3" fill="none" stroke="var(--color-ink)" strokeWidth="2.4" strokeLinecap="round" />
        <circle cx="23" cy="12" r="2.6" fill="var(--color-lime)" stroke="var(--color-ink)" strokeWidth="2" />
      </svg>
    ),
  },
  {
    n: "04",
    title: "Read the proof",
    body: "Every execution settles to a receipt — ratio in, ratio out, route, slot. Verify, don’t trust.",
    icon: (
      <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden>
        <path d="M4 3h18v14l-3 2.4-3-2.4-3 2.4-3-2.4-3 2.4L4 17V3z" fill="var(--color-paper)" stroke="var(--color-ink)" strokeWidth="2.4" strokeLinejoin="round" />
        <path d="M8 8h10M8 12h7" stroke="var(--color-ink)" strokeWidth="2.2" strokeLinecap="round" />
      </svg>
    ),
  },
];

export function MentalModel() {
  return (
    <section aria-label="The mental model" className="border-b-2 border-ink bg-bone-deep/60">
      <div className="mx-auto max-w-6xl px-4 py-16 md:px-6 md:py-24">
        <Reveal>
          <Eyebrow>The mental model</Eyebrow>
          <h2 className="mt-5 font-display text-[clamp(2.2rem,5.4vw,4.2rem)] uppercase leading-[0.95] text-ink">
            Four truths. Then you sign — or you don’t.
          </h2>
        </Reveal>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <Reveal key={s.n} delay={i * 90}>
              <div className="group relative h-full overflow-hidden rounded-2xl border-2 border-ink bg-paper p-6 transition-all duration-200 hover:-translate-y-1 hover:shadow-[6px_6px_0_0_var(--color-ink)]">
                <span
                  aria-hidden
                  className="pointer-events-none absolute -right-2 -top-4 font-display text-[5.2rem] leading-none text-ink/[0.06] transition-colors group-hover:text-ink/[0.1]"
                >
                  {s.n}
                </span>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl border-2 border-ink bg-bone">
                  {s.icon}
                </div>
                <p className="mt-5 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-fog">
                  {s.n}
                </p>
                <h3 className="mt-1.5 font-display text-[1.55rem] uppercase leading-none text-ink">
                  {s.title}
                </h3>
                <p className="mt-3 text-[13.5px] leading-relaxed text-fog">{s.body}</p>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal delay={200}>
          <p className="mt-10 text-center font-mono text-[11px] uppercase tracking-[0.18em] text-fog">
            See the clock <span className="text-ink">→</span> read the action{" "}
            <span className="text-ink">→</span> sign or refuse{" "}
            <span className="text-ink">→</span> see the proof
          </p>
        </Reveal>
      </div>
    </section>
  );
}
