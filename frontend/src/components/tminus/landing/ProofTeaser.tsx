"use client";

import { useTMinus, useTMinusVersion } from "@/lib/tminus/adapters/context";
import { navigate } from "@/lib/tminus/router";
import { INITIAL_RECEIPTS } from "@/lib/tminus/data/receiptData";
import { Eyebrow } from "@/components/tminus/system/primitives";
import { ReceiptCard } from "@/components/tminus/system/ReceiptCard";
import { Reveal } from "@/components/tminus/system/Reveal";

export function ProofTeaser() {
  useTMinusVersion();
  const src = useTMinus();
  const receipts = src.listReceipts();
  const liveFill = receipts.find((r) => (r.eventKind ?? "fill") === "fill");
  const showcase = liveFill ?? { ...INITIAL_RECEIPTS[0], network: "SIMULATION" as const };
  const isSimulation = showcase.network === "SIMULATION";

  return (
    <section
      id="proof"
      aria-label="Proof and receipts"
      className="scroll-mt-20 border-b-2 border-ink bg-ink-deep pb-20 text-bone md:pb-28"
    >
      <div className="mx-auto max-w-6xl px-4 md:px-6">
        <div className="grid items-center gap-12 lg:grid-cols-[1fr_0.9fr]">
          <Reveal>
            <Eyebrow onInk>Proof</Eyebrow>
            <h2 className="mt-5 font-display text-[clamp(2.2rem,5.4vw,4.2rem)] uppercase leading-[0.95] text-bone">
              Receipts, not dashboards.
            </h2>
            <p className="mt-5 max-w-md text-[16.5px] leading-relaxed text-bone-dim">
              Every execution produces a verifiable receipt — what you asked
              for, what you got, how it routed, where it settled. Trust is
              transferable evidence, not a vendor’s summary screen.
            </p>
            <ul className="mt-8 space-y-3">
              {[
                "Target ratio vs executed ratio, side by side",
                "Route, slot, and signature on every fill",
                "Failsafe fills are labelled honestly — no dressing up",
              ].map((line) => (
                <li key={line} className="flex items-center gap-3">
                  <span
                    aria-hidden
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-lime font-mono text-[11px] font-bold text-lime"
                  >
                    ✓
                  </span>
                  <span className="text-[14px] leading-relaxed text-bone-dim">{line}</span>
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() => navigate("#/receipts")}
              className="mt-9 inline-flex h-12 items-center gap-2 rounded-full border-2 border-lime px-6 font-mono text-[12px] font-bold uppercase tracking-[0.14em] text-lime transition-all hover:-translate-y-0.5 hover:bg-lime hover:text-ink"
            >
              Open the proof ledger
              <span aria-hidden>→</span>
            </button>
          </Reveal>

          <Reveal delay={140} className="mx-auto w-full max-w-md px-4 lg:max-w-none">
            <ReceiptCard receipt={showcase} />
            <p className="mt-6 text-center font-mono text-[10px] uppercase tracking-[0.2em] text-bone-dim">
              {isSimulation
                ? "SIMULATION example — not a chain signature"
                : `${showcase.network ?? "on-chain"} receipt — explorer-linked`}
            </p>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
