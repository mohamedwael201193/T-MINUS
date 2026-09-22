"use client";

import { useMemo, useState } from "react";
import { useTMinus, useTMinusVersion } from "@/lib/tminus/adapters/context";
import { navigate } from "@/lib/tminus/router";
import { fmtDateTime, fmtRatio, truncMid } from "@/lib/tminus/utils";
import type { WalletActivityItem } from "@/lib/tminus/domain/types";
import { Button } from "@/components/tminus/system/primitives";
import { cn } from "@/lib/tminus/utils";

type Filter = "ALL" | "MAINNET" | "PROTOCOL";

const FILTERS: Filter[] = ["ALL", "MAINNET", "PROTOCOL"];

function fmtAmt(v: number | null, digits = 9): string {
  if (v == null || !Number.isFinite(v)) return "—";
  if (v === 0) return "0";
  if (v >= 1) return v.toFixed(4).replace(/0+$/, "").replace(/\.$/, "");
  return v.toFixed(digits).replace(/0+$/, "").replace(/\.$/, "");
}

export function MyOrders() {
  useTMinusVersion();
  const src = useTMinus();
  const wallet = src.getWallet();
  const [filter, setFilter] = useState<Filter>("ALL");

  const activity = src.listActivity();
  const filtered = useMemo(() => {
    if (filter === "MAINNET") return activity.filter((a) => a.kind === "CONVERSION");
    if (filter === "PROTOCOL") return activity.filter((a) => a.kind === "PROTOCOL_ORDER");
    return activity;
  }, [activity, filter]);
  const mainnetCount = activity.filter((a) => a.kind === "CONVERSION").length;
  const protocolCount = activity.filter((a) => a.kind === "PROTOCOL_ORDER").length;

  return (
    <section aria-label="My activity" className="mt-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-baseline gap-3">
          <h2 className="font-display text-[1.9rem] uppercase leading-none text-ink">
            My activity
          </h2>
          <span className="rounded-full border-2 border-ink bg-paper px-2.5 py-0.5 font-mono text-[10px] font-bold tabular text-ink">
            {activity.length}
          </span>
        </div>
        <div className="flex gap-1.5" role="group" aria-label="Filter activity">
          {FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              aria-pressed={filter === f}
              onClick={() => setFilter(f)}
              className={cn(
                "rounded-full border-2 px-3 py-1.5 font-mono text-[9.5px] font-bold uppercase tracking-[0.12em] transition-colors",
                filter === f
                  ? "border-ink bg-ink text-bone"
                  : "border-ink/25 bg-paper text-fog hover:border-ink hover:text-ink",
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </div>
      <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.12em] text-fog">
        {mainnetCount} mainnet trade{mainnetCount === 1 ? "" : "s"} · {protocolCount} devnet protocol
      </p>

      {!wallet.connected ? (
        <div className="mt-5 rounded-2xl border-2 border-dashed border-ink/30 bg-bone/40 p-8 text-center">
          <p className="font-display text-2xl uppercase text-ink">Connect a wallet</p>
          <p className="mx-auto mt-2 max-w-sm font-mono text-[10.5px] uppercase leading-relaxed tracking-[0.1em] text-fog">
            Activity is filtered to the connected Phantom address. The public ledger still shows every verified receipt.
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="mt-5 rounded-2xl border-2 border-dashed border-ink/30 bg-bone/40 p-8 text-center">
          <p className="font-display text-2xl uppercase text-ink">
            {activity.length === 0 ? "No activity yet" : "Nothing here"}
          </p>
          <p className="mx-auto mt-2 max-w-sm font-mono text-[10.5px] uppercase leading-relaxed tracking-[0.1em] text-fog">
            {activity.length === 0
              ? "A Mainnet conversion appears here only after Solana confirms a trade this wallet signed."
              : `No ${filter.toLowerCase()} activity for this wallet.`}
          </p>
          {activity.length === 0 ? (
            <Button size="sm" className="mt-5" onClick={() => navigate("#/app")}>
              Open the desk
              <span aria-hidden>→</span>
            </Button>
          ) : null}
        </div>
      ) : (
        <div className="mt-5 flex max-h-[620px] flex-col gap-4 overflow-y-auto pr-1 scroll-thin">
          {filtered.map((item) => (
            <ActivityCard key={item.signature} item={item} />
          ))}
        </div>
      )}
    </section>
  );
}

function ActivityCard({ item }: { item: WalletActivityItem }) {
  const conversion = item.kind === "CONVERSION";
  return (
    <article className="rounded-2xl border-2 border-ink bg-paper p-4 transition-all hover:-translate-y-0.5 hover:shadow-[4px_4px_0_0_var(--color-ink)] md:p-5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-display text-[1.35rem] uppercase leading-none text-ink">
          {item.sourceSymbol} → {item.destinationSymbol}
        </span>
        <span className="rounded-full border-2 border-ink bg-lime px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-ink">
          {conversion ? "Mainnet trade" : "Devnet protocol"}
        </span>
        {conversion && item.verifiedOnchain ? (
          <span className="rounded-full border-2 border-ink px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-ink">
            Verified
          </span>
        ) : null}
        {item.event ? (
          <span className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-fog">
            {item.event}
          </span>
        ) : null}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t-2 border-dashed border-ink/10 pt-4 sm:grid-cols-4">
        <Cell label="Input" value={`${fmtAmt(item.sourceAmount)} ${item.sourceSymbol}`} />
        <Cell label="Output" value={`${fmtAmt(item.destinationAmount)} ${item.destinationSymbol}`} tone="lime" />
        <Cell label="Ratio" value={item.ratio != null ? fmtRatio(item.ratio, 9) : "—"} />
        <Cell label="Route" value={item.route ?? (conversion ? "Jupiter Swap V2" : "protocol")} />
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-fog">
          {fmtDateTime(item.timestamp)} · slot {item.slot || "—"} · {truncMid(item.signature, 8, 6)}
        </span>
        <a
          href={item.explorerUrl}
          target="_blank"
          rel="noreferrer"
          className="rounded-full border-2 border-ink bg-ink px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-lime transition-transform hover:-translate-y-0.5"
        >
          View on explorer →
        </a>
      </div>
    </article>
  );
}

function Cell({
  label,
  value,
  tone = "ink",
}: {
  label: string;
  value: string;
  tone?: "ink" | "lime";
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="mlabel text-fog">{label}</span>
      <span
        className={cn(
          "truncate font-mono text-[12.5px] font-bold tabular leading-none",
          tone === "ink" && "text-ink",
          tone === "lime" && "text-ink",
        )}
      >
        {value}
      </span>
    </div>
  );
}
