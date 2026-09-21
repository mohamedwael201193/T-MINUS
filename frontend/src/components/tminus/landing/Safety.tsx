"use client";

import { Eyebrow, Label } from "@/components/tminus/system/primitives";
import { Reveal } from "@/components/tminus/system/Reveal";

const CANNOT = [
  "Hold your Mainnet PreStocks",
  "Fake a receipt or a signature",
  "Swap a PreStock after the issuer window closed",
  "Pretend DEVNET escrow is Mainnet custody",
];

const CAN = [
  "Refuse expired, stale, paused, or unroutable actions",
  "Price Token-2022 transfer fees before you sign",
  "Ask you to sign a Mainnet Jupiter TRADE only when gates pass",
  "Keep DEVNET protocol receipts labeled as protocol proofs",
];

export function Safety() {
  return (
    <section id="safety" aria-label="Safety and custody" className="scroll-mt-20 border-b-2 border-ink">
      <div className="mx-auto max-w-6xl px-4 py-16 md:px-6 md:py-24">
        <Reveal>
          <Eyebrow>Custody</Eyebrow>
          <h2 className="mt-5 font-display text-[clamp(2.2rem,5.4vw,4.2rem)] uppercase leading-[0.95] text-ink">
            You hold the keys.
          </h2>
          <p className="mt-5 max-w-2xl text-[16.5px] leading-relaxed text-fog">
            T-MINUS executes inside your rules. Not around them, not
            despite them —{" "}
            <span className="font-semibold text-ink">inside them.</span>
          </p>
        </Reveal>

        {/* the bounded-execution diagram */}
        <Reveal delay={100}>
          <div className="mt-12 flex flex-col items-stretch gap-4 lg:flex-row lg:items-stretch">
            <div className="flex-1 rounded-2xl border-2 border-ink bg-paper p-6">
              <Label>Your rule</Label>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="rounded-full border-2 border-ink bg-lime px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-ink">
                  Target 0.820
                </span>
                <span className="rounded-full border-2 border-ink bg-paper px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-coral">
                  Floor 0.700
                </span>
                <span className="rounded-full border-2 border-ink bg-amber px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-ink">
                  Failsafe MAR 01
                </span>
              </div>
              <p className="mt-4 font-mono text-[10px] uppercase leading-relaxed tracking-[0.1em] text-fog">
                Written by you. Re-checked at click time. Never silently stale.
              </p>
            </div>

            <span aria-hidden className="flex items-center justify-center self-center">
              <svg width="46" height="24" viewBox="0 0 46 24" className="rotate-90 lg:rotate-0">
                <path d="M0 12h38M32 4l8 8-8 8" fill="none" stroke="var(--color-ink)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>

            <div className="flex-[1.2] rounded-2xl border-2 border-ink bg-ink p-6 text-bone shadow-[6px_6px_0_0_var(--color-lime)]">
              <div className="flex items-center gap-3">
                <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden>
                  <rect x="4" y="9.5" width="14" height="10" rx="2.5" fill="none" stroke="var(--color-lime)" strokeWidth="2.4" />
                  <path d="M7.5 9.5V7a3.5 3.5 0 0 1 7 0v2.5" fill="none" stroke="var(--color-lime)" strokeWidth="2.4" />
                </svg>
                <p className="font-display text-xl uppercase text-bone">Bounded execution</p>
              </div>
              <p className="mt-3 text-[13.5px] leading-relaxed text-bone-dim">
                Mainnet conversion is a user-signed Jupiter TRADE inside
                your floor. Unattended place/cancel/fill/expire is proven on
                DEVNET. Every other path is a refusal, not a fake receipt.
              </p>
            </div>

            <span aria-hidden className="flex items-center justify-center self-center">
              <svg width="46" height="24" viewBox="0 0 46 24" className="rotate-90 lg:rotate-0">
                <path d="M0 12h38M32 4l8 8-8 8" fill="none" stroke="var(--color-ink)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>

            <div className="flex-1 rounded-2xl border-2 border-ink bg-paper p-6">
              <Label>Proof</Label>
              <p className="mt-3 font-mono text-[13px] font-bold uppercase leading-snug tracking-[0.04em] text-ink">
                Every fill settles to a receipt you can verify yourself.
              </p>
              <p className="mt-3 font-mono text-[10px] uppercase leading-relaxed tracking-[0.1em] text-fog">
                Ratio in · ratio out · route · slot · signature
              </p>
            </div>
          </div>
        </Reveal>

        {/* can / cannot */}
        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <Reveal delay={140}>
            <div className="h-full rounded-2xl border-2 border-ink bg-paper p-6">
              <p className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-ink">
                T-MINUS can
              </p>
              <ul className="mt-4 space-y-3">
                {CAN.map((c) => (
                  <li key={c} className="flex items-start gap-3 text-[13.5px] leading-relaxed text-fog">
                    <span aria-hidden className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-lime font-mono text-[10px] font-bold text-ink">
                      ✓
                    </span>
                    {c}
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
          <Reveal delay={200}>
            <div className="h-full rounded-2xl border-2 border-ink bg-paper p-6">
              <p className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-ink">
                T-MINUS cannot
              </p>
              <ul className="mt-4 space-y-3">
                {CANNOT.map((c) => (
                  <li key={c} className="flex items-start gap-3 text-[13.5px] leading-relaxed text-fog">
                    <span aria-hidden className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-coral font-mono text-[10px] font-bold text-ink">
                      ✕
                    </span>
                    {c}
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        </div>

        <Reveal delay={240}>
          <p className="mt-8 text-center font-mono text-[10px] uppercase tracking-[0.16em] text-fog">
            Mainnet: you sign, T-MINUS never holds · DEVNET: escrow is a
            program, not a person · no fake receipts
          </p>
        </Reveal>
      </div>
    </section>
  );
}
