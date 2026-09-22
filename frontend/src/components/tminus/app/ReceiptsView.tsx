"use client";

import { useTMinus, useTMinusVersion } from "@/lib/tminus/adapters/context";
import { navigate } from "@/lib/tminus/router";
import { Button } from "@/components/tminus/system/primitives";
import { ReceiptCard } from "@/components/tminus/system/ReceiptCard";

/**
 * Ledger split: real Mainnet conversions first, then DEVNET protocol proofs.
 */
export function ReceiptsView() {
  useTMinusVersion();
  const src = useTMinus();
  const receipts = src.listReceipts();
  const conversions = receipts.filter((r) => r.network === "MAINNET" && (r.eventKind ?? "") === "conversion");
  const protocol = receipts.filter((r) => !(r.network === "MAINNET" && (r.eventKind ?? "") === "conversion"));

  return (
    <div className="bg-ink-deep pb-16 text-bone">
      <div className="mx-auto max-w-6xl px-4 py-10 md:px-6 md:py-14">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="mlabel text-bone-dim">Proof of conversion</p>
            <h1 className="mt-3 font-display text-[clamp(2.2rem,6vw,3.8rem)] uppercase leading-none text-bone">
              The ledger
            </h1>
            <p className="mt-4 max-w-md text-[14px] leading-relaxed text-bone-dim">
              Mainnet rows are user-signed Jupiter trades, stored only after Solana confirms them.
              DEVNET rows prove the T-MINUS escrow protocol. They are not PreStocks conversions.
            </p>
          </div>
          <span className="rounded-full border-2 border-bone/40 px-3.5 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-bone">
            {conversions.length} mainnet · {protocol.length} protocol
          </span>
        </div>

        <section className="mt-12" aria-label="Real Mainnet conversions">
          <p className="mlabel text-lime">Real Mainnet conversions</p>
          {conversions.length === 0 ? (
            <div className="mt-4 rounded-2xl border-2 border-dashed border-bone/25 p-8">
              <p className="font-display text-xl uppercase text-bone">None yet</p>
              <p className="mt-2 max-w-lg font-mono text-[10.5px] uppercase leading-relaxed tracking-[0.1em] text-bone-dim">
                A Mainnet receipt appears only after a confirmed Jupiter TRADE. Wallet popups and unsigned blobs do not create one.
              </p>
            </div>
          ) : (
            <div className="mt-6 grid gap-7 md:grid-cols-2 xl:grid-cols-3">
              {conversions.map((r) => (
                <ReceiptCard key={r.id} receipt={r} />
              ))}
            </div>
          )}
        </section>

        <section className="mt-14" aria-label="T-MINUS DEVNET protocol proofs">
          <p className="mlabel text-amber">T-MINUS DEVNET protocol proofs</p>
          <p className="mt-2 max-w-lg font-mono text-[10px] uppercase tracking-[0.1em] text-bone-dim">
            Place / cancel / fill / expire on fixture mints. Not SPACEX. Not Mainnet.
          </p>
          {protocol.length === 0 ? (
            <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.12em] text-bone-dim">No protocol receipts loaded.</p>
          ) : (
            <div className="mt-6 grid gap-7 md:grid-cols-2 xl:grid-cols-3">
              {protocol.map((r) => (
                <ReceiptCard key={r.id} receipt={r} />
              ))}
            </div>
          )}
        </section>

        <div className="mt-12 text-center">
          <Button variant="bone" size="sm" onClick={() => navigate("#/app")}>
            Back to console
          </Button>
          <p className="mt-6 font-mono text-[10px] uppercase tracking-[0.18em] text-bone-dim">
            Ledger from the live API · DEVNET = protocol proof · MAINNET conversion = Jupiter trade you signed
          </p>
        </div>
      </div>
    </div>
  );
}
