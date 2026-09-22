"use client";

import { MAINNET_SPACEX_PROOF } from "@/lib/tminus/data/mainnetProof";
import { truncMid } from "@/lib/tminus/utils";
import { Eyebrow, Label } from "@/components/tminus/system/primitives";
import { Reveal } from "@/components/tminus/system/Reveal";

export function ProofTeaser() {
  const p = MAINNET_SPACEX_PROOF;
  return (
    <section id="proof" aria-label="Mainnet proof" className="scroll-mt-20 border-b-2 border-ink bg-ink-deep pb-20 text-bone md:pb-28">
      <div className="mx-auto max-w-6xl px-4 md:px-6">
        <div className="grid items-start gap-12 lg:grid-cols-[1fr_0.95fr]">
          <Reveal>
            <Eyebrow onInk>Mainnet proof</Eyebrow>
            <h2 className="mt-5 font-display text-[clamp(2.2rem,5.4vw,4.2rem)] uppercase leading-[0.95] text-bone">
              Real conversion. Verified on Solana.
            </h2>
            <p className="mt-5 max-w-md text-[16.5px] leading-relaxed text-bone-dim">
              T-MINUS decided. Jupiter executed. Phantom authorized. Solana confirmed. The receipt maps to this signature.
            </p>
            <p className="mt-6 font-mono text-[10px] uppercase tracking-[0.16em] text-bone-dim">
              DEVNET protocol proofs are separate. They are not this trade.
            </p>
          </Reveal>

          <Reveal delay={120}>
            <div className="rounded-2xl border-2 border-lime bg-ink p-6 shadow-[8px_8px_0_0_var(--color-lime)]">
              <div className="flex items-center justify-between gap-3">
                <Label onInk>Real Mainnet conversion</Label>
                <span className="rounded-full border-2 border-lime px-2.5 py-1 font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-lime">
                  Verified
                </span>
              </div>
              <p className="mt-5 font-display text-[2.2rem] uppercase leading-none text-bone">
                SPACEX → SPCXx
              </p>
              <dl className="mt-6 grid grid-cols-2 gap-4">
                <div>
                  <dt className="mlabel text-bone-dim">Amount</dt>
                  <dd className="mt-1 font-mono text-[13px] font-bold text-bone">
                    {p.sourceDisplay} SPACEX
                  </dd>
                </div>
                <div>
                  <dt className="mlabel text-bone-dim">Received</dt>
                  <dd className="mt-1 font-mono text-[13px] font-bold text-bone">
                    {p.destinationDisplay} SPCXx
                  </dd>
                </div>
                <div>
                  <dt className="mlabel text-bone-dim">Ratio</dt>
                  <dd className="mt-1 font-mono text-[13px] font-bold text-bone">{p.ratio.toFixed(4)}</dd>
                </div>
                <div>
                  <dt className="mlabel text-bone-dim">Route</dt>
                  <dd className="mt-1 font-mono text-[13px] font-bold text-bone">{p.router}</dd>
                </div>
                <div className="col-span-2">
                  <dt className="mlabel text-bone-dim">Slot · signature</dt>
                  <dd className="mt-1 font-mono text-[12px] font-bold text-bone">
                    {p.slot} · {truncMid(p.signature, 10, 8)}
                  </dd>
                </div>
              </dl>
              <a
                href={p.explorer}
                target="_blank"
                rel="noreferrer"
                className="mt-6 inline-flex h-11 items-center gap-2 rounded-full border-2 border-lime px-5 font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-lime hover:bg-lime hover:text-ink"
              >
                View on explorer
                <span aria-hidden>→</span>
              </a>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
