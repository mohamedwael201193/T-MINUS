"use client";

import { useState } from "react";
import type { ExecutionReceipt } from "@/lib/tminus/domain/types";
import { cn, fmtCount, fmtDateTime, fmtRatio, truncMid } from "@/lib/tminus/utils";
import { useToast } from "@/components/tminus/system/toast";

/**
 * PROOF OF CONVERSION — a physical execution ticket, not a table row.
 * Torn edges, mono ledger rows, a settled stamp, a barcode.
 */
export function ReceiptCard({
  receipt,
  compact = false,
  onOpenReceipt,
  className,
}: {
  receipt: ExecutionReceipt;
  compact?: boolean;
  onOpenReceipt?: (receiptId: string) => void;
  className?: string;
}) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const kind = receipt.eventKind ?? "fill";
  const isFill = kind === "fill";
  const targetFill = isFill && receipt.path === "TARGET";
  const badge =
    kind === "cancel"
      ? "Cancelled"
      : kind === "expire"
        ? "Expired"
        : kind === "place"
          ? "Placed"
          : targetFill
            ? "Target met"
            : "Failsafe used";
  const stamp = isFill ? "Settled" : kind === "cancel" ? "Closed" : kind === "expire" ? "Expired" : "On-chain";

  return (
    <article
      className={cn(
        "relative -rotate-[0.6deg] transition-transform duration-200 hover:rotate-0",
        className,
      )}
      aria-label={`Execution receipt ${receipt.id}`}
    >
      <div className="receipt-clip bg-paper px-5 py-5 md:px-6 [filter:drop-shadow(5px_5px_0_rgba(17,16,13,0.9))]">
        {/* header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-mono text-[9.5px] font-bold uppercase tracking-[0.2em] text-ink">
              T-MINUS · Execution receipt
              {receipt.network ? ` · ${receipt.network}` : ""}
            </p>
            <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.1em] text-fog">
              № {receipt.id}
            </p>
          </div>
          <span
            className={cn(
              "inline-block rounded-full border-2 border-ink px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-ink",
              isFill && targetFill
                ? "bg-lime"
                : isFill
                  ? "bg-amber"
                  : "bg-paper",
            )}
          >
            {badge}
          </span>
        </div>

        {/* pair */}
        <div className="flex items-baseline gap-2.5 border-t-2 border-dashed border-ink/20 pt-4">
          <span className="font-display text-[1.7rem] uppercase leading-none text-ink">
            {receipt.sourceSymbol ?? "SPACEX"}
          </span>
          <span aria-hidden className="font-bold text-ink">→</span>
          <span className="font-display text-[1.7rem] uppercase leading-none text-ink">
            {receipt.destinationSymbol ?? "SPCXx"}
          </span>
        </div>

        {/* executed ratio */}
        <div className="mt-4 flex items-end justify-between">
          <div>
            <p className="mlabel text-fog">{isFill ? "Executed ratio" : "Event"}</p>
            <p className="mt-1 font-display text-[2.9rem] leading-none text-ink">
              {isFill ? fmtRatio(receipt.executedRatio) : stamp}
            </p>
          </div>
          <p className="pb-1 font-mono text-[10px] uppercase tracking-[0.1em] text-fog">
            {isFill
              ? `${receipt.destinationSymbol ?? "SPCXx"} per ${receipt.sourceSymbol ?? "SPACEX"}`
              : receipt.network ?? "on-chain"}
          </p>
        </div>

        {/* ledger rows */}
        <dl className="mt-4 space-y-2 border-t-2 border-dashed border-ink/20 pt-4">
          <Row label="Target" value={fmtRatio(receipt.targetRatio)} />
          <Row label="Floor" value={fmtRatio(receipt.floorRatio)} />
          {!compact ? (
            <>
              <Row label="Size" value={`${receipt.size.toFixed(2)} ${receipt.sourceSymbol ?? "SPACEX"}`} />
              <Row
                label="Filled"
                value={`${receipt.filled.toFixed(4)} ${receipt.destinationSymbol ?? "SPCXx"}`}
                highlight
              />
              <Row label="Route" value={receipt.route} />
              <Row label="Slot" value={fmtCount(receipt.slot)} />
              <Row label="Fee model" value={`${receipt.feeBps / 100}% priced in`} />
              <Row label="Feed hash" value={receipt.feedHash} />
            </>
          ) : (
            <Row label="Filled" value={`${receipt.filled.toFixed(4)} ${receipt.destinationSymbol ?? "SPCXx"}`} highlight />
          )}
          <Row label="Settled" value={fmtDateTime(receipt.settledAt)} />
          <Row label="Signature" value={truncMid(receipt.signature, 8, 6)} mono />
        </dl>

        {/* barcode + actions */}
        <div className="mt-5 flex items-end justify-between gap-4 border-t-2 border-dashed border-ink/20 pt-4">
          <Barcode className="h-9 w-28 shrink-0" />
          <div className="flex flex-col items-end gap-2">
            <button
              type="button"
              onClick={() => {
                toast({ title: "SIGNATURE COPIED", tone: "ink" });
                setCopied(true);
                window.setTimeout(() => setCopied(false), 2000);
                void navigator.clipboard?.writeText(receipt.signature).catch(() => {
                  toast({ title: "COPY FAILED", tone: "coral", body: "Clipboard permission denied." });
                });
              }}
              className="rounded-full border-2 border-ink bg-paper px-3 py-1.5 font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-ink transition-colors hover:bg-ink hover:text-bone"
            >
              {copied ? "Copied" : "Copy sig"}
            </button>
            {onOpenReceipt ? (
              <button
                type="button"
                onClick={() => onOpenReceipt(receipt.id)}
                className="rounded-full border-2 border-ink bg-ink px-3 py-1.5 font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-lime transition-transform hover:-translate-y-0.5"
              >
                Open proof →
              </button>
            ) : receipt.explorerUrl ? (
              <a
                href={receipt.explorerUrl}
                target="_blank"
                rel="noreferrer"
                className="rounded-full border-2 border-ink bg-ink px-3 py-1.5 font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-lime transition-transform hover:-translate-y-0.5"
              >
                View on explorer →
              </a>
            ) : null}
          </div>
        </div>
      </div>

      {/* settled stamp */}
      <div className="pointer-events-none absolute -right-2 top-20 rotate-[9deg] md:-right-3">
        <div
          className={cn(
            "flex flex-col items-center rounded-xl border-[3px] px-3.5 py-2",
            isFill && targetFill
              ? "border-ink bg-lime"
              : isFill
                ? "border-ink bg-amber"
                : "border-ink bg-paper",
          )}
        >
          <span className="font-display text-lg uppercase leading-none text-ink">{stamp}</span>
          <span className="mt-1 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-ink">
            {isFill ? "✓ verified" : receipt.network ?? "on-chain"}
          </span>
        </div>
      </div>
    </article>
  );
}

function Row({
  label,
  value,
  highlight = false,
  mono = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  mono?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="mlabel shrink-0 text-fog">{label}</dt>
      <dd
        className={cn(
          "truncate font-mono text-[11px] tabular tracking-[0.02em]",
          highlight ? "font-bold text-ink" : "text-ink/80",
          mono && "text-[10px]",
        )}
      >
        {value}
      </dd>
    </div>
  );
}

function Barcode({ className }: { className?: string }) {
  const bars = [
    3, 1, 2, 1, 1, 3, 1, 2, 4, 1, 1, 2, 3, 1, 2, 1, 1, 1, 2, 3, 1, 4, 1, 2, 1, 3,
  ];
  let x = 0;
  return (
    <svg className={className} viewBox="0 0 100 30" preserveAspectRatio="none" aria-hidden>
      {bars.map((w, i) => {
        const el = (
          <rect
            key={i}
            x={x}
            y={0}
            width={w}
            height={30}
            fill={i % 2 === 0 ? "var(--color-ink)" : "transparent"}
          />
        );
        x += w + 1;
        return el;
      })}
    </svg>
  );
}
