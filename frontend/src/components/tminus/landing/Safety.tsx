"use client";

import { Eyebrow, Label } from "@/components/tminus/system/primitives";
import { Reveal } from "@/components/tminus/system/Reveal";

const HALTS = [
  "Issuer action, deadline, destination, or ratio changed",
  "Deadline expired",
  "Mint paused, hooked, or unsupported",
  "Route gone or quote stale",
  "Balance too small / destination unverified",
];

const CAN = [
  "Fingerprint the issuer instruction and halt stale snapshots",
  "Price Token-2022 fees before asking for a signature",
  "Ask you to sign a Mainnet Jupiter TRADE only when gates pass",
  "Keep DEVNET protocol receipts labeled as protocol proofs",
];

const CANNOT = [
  "Hold your Mainnet PreStocks",
  "Sign with an old fingerprint or stale Jupiter transaction",
  "Swap a PreStock after the issuer window closed",
  "Pretend DEVNET escrow is Mainnet custody",
];

export function Safety() {
  return (
    <section id="safety" aria-label="Safety model" className="scroll-mt-20 border-b-2 border-ink">
      <div className="mx-auto max-w-6xl px-4 py-16 md:px-6 md:py-24">
        <Reveal>
          <Eyebrow>Safety</Eyebrow>
          <h2 className="mt-5 font-display text-[clamp(2.2rem,5.4vw,4.2rem)] uppercase leading-[0.95] text-ink">
            You hold the keys.
          </h2>
          <p className="mt-5 max-w-xl text-[16.5px] leading-relaxed text-fog">
            If the issuer instruction changes, signing stops until the whole stack re-verifies.
          </p>
        </Reveal>

        <Reveal delay={80}>
          <div className="mt-12 rounded-2xl border-2 border-ink bg-paper p-6">
            <Label>Signing is blocked when</Label>
            <ul className="mt-4 grid gap-2 sm:grid-cols-2">
              {HALTS.map((h) => (
                <li key={h} className="flex items-start gap-2 font-mono text-[11px] uppercase tracking-[0.08em] text-ink">
                  <span className="mt-0.5 text-coral" aria-hidden>
                    ■
                  </span>
                  {h}
                </li>
              ))}
            </ul>
          </div>
        </Reveal>

        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <Reveal delay={120}>
            <div className="h-full rounded-2xl border-2 border-ink bg-paper p-6">
              <p className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-ink">T-MINUS can</p>
              <ul className="mt-4 space-y-3">
                {CAN.map((c) => (
                  <li key={c} className="flex items-start gap-3 text-[13.5px] leading-relaxed text-fog">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-lime font-mono text-[10px] font-bold text-ink">
                      ✓
                    </span>
                    {c}
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
          <Reveal delay={180}>
            <div className="h-full rounded-2xl border-2 border-ink bg-paper p-6">
              <p className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-ink">T-MINUS cannot</p>
              <ul className="mt-4 space-y-3">
                {CANNOT.map((c) => (
                  <li key={c} className="flex items-start gap-3 text-[13.5px] leading-relaxed text-fog">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-coral font-mono text-[10px] font-bold text-ink">
                      ✕
                    </span>
                    {c}
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
