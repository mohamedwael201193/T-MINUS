"use client";

import { Eyebrow, Label } from "@/components/tminus/system/primitives";
import { Reveal } from "@/components/tminus/system/Reveal";

const FAILURES = [
  {
    title: "Triggers can’t see fees",
    quote: "ERROR: Mint PreANxu…uAWq has transfer fee",
    body: (
      <>
        Jupiter’s trigger API rejects every PreStocks mint outright — the
        transfer fee breaks its math. Even if it didn’t, a screen-price
        trigger ignores the 1% haircut. T-MINUS works from the{" "}
        <span className="font-semibold text-bone">executable ratio</span> —
        what actually lands in your wallet.
      </>
    ),
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden>
        <path d="M2.5 12C5 7.5 9 5.5 12 5.5s7 2 9.5 6.5" fill="none" stroke="var(--color-lime)" strokeWidth="2.6" strokeLinecap="round" />
        <path d="M4 19L20 4.5" stroke="var(--color-coral)" strokeWidth="2.6" strokeLinecap="round" />
        <circle cx="12" cy="14" r="3.2" fill="none" stroke="currentColor" strokeWidth="2.2" />
      </svg>
    ),
  },
  {
    title: "Tools don’t know calendars",
    body: (
      <>
        Lockups move. Windows open. Terms publish. Deadlines expire. No
        chart platform knows any of this exists — you’d be setting phone
        reminders against a market. T-MINUS is built on the{" "}
        <span className="font-semibold text-bone">lifecycle feed</span> —
        deadlines are first-class citizens, not notifications.
      </>
    ),
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden>
        <rect x="3.5" y="5" width="17" height="16" rx="2.5" fill="none" stroke="currentColor" strokeWidth="2.3" />
        <path d="M3.5 10h17M8 2.8V7M16 2.8V7" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" />
        <path d="M8.5 15.5l7-3.5M8.5 12.5v6M15.5 15v6" stroke="var(--color-amber)" strokeWidth="2.3" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    title: "Thin books punish hurry",
    body: (
      <>
        Pre-IPO liquidity is thin. Size market-sells realize 23–34% below
        parity, and past ~$118k there are{" "}
        <span className="font-mono text-[12.5px] font-bold text-coral">NO_ROUTES</span>{" "}
        at all. A T-MINUS order rests patiently, moves the moment your
        price exists — or falls back to your floor before the window
        closes.
      </>
    ),
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden>
        <path d="M3 17l5-6 4 3 4-8 5 4" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M3 21h18" stroke="var(--color-coral)" strokeWidth="2.4" strokeLinecap="round" />
      </svg>
    ),
  },
];

export function WhyToolsFail() {
  return (
    <section
      id="why"
      aria-label="Why normal tools fail"
      className="scroll-mt-20 border-b-2 border-ink bg-ink-deep text-bone"
    >
      <div className="mx-auto max-w-6xl px-4 py-16 md:px-6 md:py-24">
        <Reveal>
          <Eyebrow onInk>Why not just set a trigger?</Eyebrow>
          <h2 className="mt-5 font-display text-[clamp(2.2rem,5.4vw,4.2rem)] uppercase leading-[0.95] text-bone">
            A trigger order won’t save you.
          </h2>
          <p className="mt-5 max-w-2xl text-[16.5px] leading-relaxed text-bone-dim">
            Conditional execution exists everywhere — for ordinary tokens.
            PreStocks tokens aren’t ordinary, and the gaps are exactly where
            holders get hurt.
          </p>
        </Reveal>

        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {FAILURES.map((f, i) => (
            <Reveal key={f.title} delay={i * 100}>
              <div className="flex h-full flex-col rounded-2xl border-2 border-bone/15 bg-ink-2 p-6 transition-colors hover:border-bone/30">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl border-2 border-bone/25 text-bone">
                  {f.icon}
                </div>
                <h3 className="mt-5 font-display text-[1.4rem] uppercase leading-tight text-bone">
                  {f.title}
                </h3>
                <p className="mt-3 flex-1 text-[13.5px] leading-relaxed text-bone-dim">
                  {f.body}
                </p>
                {f.quote ? (
                  <code className="mt-4 block rounded-lg border border-bone/20 bg-ink px-3.5 py-2.5 font-mono text-[10px] leading-relaxed text-lime">
                    <span className="text-bone-dim">$</span> jupiter trigger →{" "}
                    <span className="text-coral">ERROR</span>
                    <br />
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
