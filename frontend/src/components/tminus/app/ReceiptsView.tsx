"use client";

import { useTMinus, useTMinusVersion } from "@/lib/tminus/adapters/context";
import { navigate } from "@/lib/tminus/router";
import { Button } from "@/components/tminus/system/primitives";
import { ReceiptCard } from "@/components/tminus/system/ReceiptCard";

/**
 * PROOF OF CONVERSION — the receipt ledger. Bone tickets on the dark
 * instrument skin: what you asked for, what you got, how it settled.
 */
export function ReceiptsView() {
  useTMinusVersion();
  const src = useTMinus();
  const receipts = src.listReceipts();
  const fills = receipts.filter((r) => (r.eventKind ?? "fill") === "fill");

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
              Every on-chain place, fill, cancel, and expire leaves one of these.
              DEVNET rows are protocol proofs — not MAINNET PreStocks fills.
            </p>
          </div>
          <span className="rounded-full border-2 border-bone/40 px-3.5 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-bone">
            {fills.length} fills · {receipts.length} on-chain
          </span>
        </div>

        {receipts.length === 0 ? (
          <div className="mt-12 rounded-2xl border-2 border-dashed border-bone/25 p-10 text-center">
            <p className="font-display text-2xl uppercase text-bone">No proofs yet</p>
            <p className="mx-auto mt-2 max-w-sm font-mono text-[10.5px] uppercase leading-relaxed tracking-[0.1em] text-bone-dim">
              Receipts land here the moment an order settles.
            </p>
            <Button variant="bone" size="sm" className="mt-6" onClick={() => navigate("#/app")}>
              Back to console
            </Button>
          </div>
        ) : (
          <div className="mt-10 grid gap-7 md:grid-cols-2 xl:grid-cols-3">
            {receipts.map((r) => (
              <ReceiptCard key={r.id} receipt={r} />
            ))}
          </div>
        )}

        <p className="mt-12 text-center font-mono text-[10px] uppercase tracking-[0.18em] text-bone-dim">
          Ledger from the live API · DEVNET receipts are protocol proofs, not MAINNET PreStocks fills
        </p>
      </div>
    </div>
  );
}
