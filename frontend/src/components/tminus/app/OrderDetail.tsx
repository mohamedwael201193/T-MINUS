"use client";

import { useState } from "react";
import { useTMinus, useTMinusVersion } from "@/lib/tminus/adapters/context";
import { navigate } from "@/lib/tminus/router";
import { fmtDate, fmtDateTime, fmtRatio } from "@/lib/tminus/utils";
import { SPACEX_ASSET_ID } from "@/lib/tminus/data/lifecycleData";
import { Button, Label, StatusChip } from "@/components/tminus/system/primitives";
import { StateRail, stepsForOrder } from "@/components/tminus/system/StateRail";
import { RatioBand } from "@/components/tminus/system/RatioBand";
import { RatioSpark } from "@/components/tminus/system/Sparkline";
import { Modal } from "@/components/tminus/system/Modal";
import { useToast } from "@/components/tminus/system/toast";
import { cn } from "@/lib/tminus/utils";

export function OrderDetail({ id }: { id: string }) {
  useTMinusVersion();
  const src = useTMinus();
  const { toast } = useToast();
  const [confirming, setConfirming] = useState(false);
  const order = src.getOrder(id);
  const market = src.getMarket(order?.assetId ?? SPACEX_ASSET_ID);

  if (!order) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-20 text-center md:px-6">
        <p className="font-display text-4xl uppercase text-ink">Order not found</p>
        <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.12em] text-fog">
          It may belong to another session — the console resets when you reload.
        </p>
        <Button className="mt-8" onClick={() => navigate("#/app")}>
          ← Back to console
        </Button>
      </div>
    );
  }

  const asset = src.getAsset(order.assetId)!;
  const ratio = market.executableRatio;
  const { steps, current } = stepsForOrder(order.status, order.fillPath);

  // attach event timestamps to their rail steps (matched by status order)
  const stepsWithTimes = steps.map((s) => {
    const ev = [...order.events]
      .reverse()
      .find((e) => e.status === s.key);
    return ev ? { ...s, time: fmtDateTime(ev.at).replace(" · ", " ") } : s;
  });
  const open = ["PLACED", "ARMED", "WATCHING", "TARGET_REACHED", "EXECUTING"].includes(order.status);
  const receipt = order.receiptId ? src.getReceipt(order.receiptId) : undefined;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:px-6 md:py-10">
      <button
        type="button"
        onClick={() => navigate("#/app")}
        className="font-mono text-[10.5px] font-bold uppercase tracking-[0.16em] text-fog transition-colors hover:text-ink"
      >
        ← Console
      </button>

      {/* header */}
      <div className="mt-4 flex flex-wrap items-center gap-4">
        <h1 className="font-display text-[clamp(2.2rem,6vw,3.6rem)] uppercase leading-none text-ink">
          Order {order.id}
        </h1>
        <StatusChip status={order.status} />
        <div className="ml-auto flex items-center gap-2.5">
          {order.status === "SETTLED" && receipt ? (
            <Button size="sm" onClick={() => navigate("#/receipts")}>
              View receipt →
            </Button>
          ) : null}
          {open ? (
            <Button size="sm" variant="dangerOutline" onClick={() => setConfirming(true)}>
              Cancel order
            </Button>
          ) : null}
        </div>
      </div>

      {/* state machine */}
      <div className="mt-8 rounded-2xl border-2 border-ink bg-paper p-5 md:p-7">
        <Label>State machine</Label>
        <div className="mt-6">
          <StateRail steps={stepsWithTimes} current={current} />
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        {/* the rule + live market */}
        <div className="rounded-2xl border-2 border-ink bg-paper p-5 md:p-7">
          <div className="flex items-center justify-between">
            <Label>The rule</Label>
            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-fog">
              {asset.symbol} → {asset.destinationSymbol}
            </span>
          </div>

          <div className="mt-6">
            <RatioBand
              floor={order.floorRatio}
              target={order.targetRatio}
              current={order.status === "SETTLED" ? order.executedRatio ?? null : ratio}
            />
          </div>

          <dl className="mt-7 grid grid-cols-2 gap-x-4 gap-y-5 border-t-2 border-dashed border-ink/15 pt-6 sm:grid-cols-3">
            <div>
              <dt className="mlabel text-fog">Target</dt>
              <dd className="mt-1.5 font-mono text-lg font-bold tabular text-ink">
                {fmtRatio(order.targetRatio)}
              </dd>
            </div>
            <div>
              <dt className="mlabel text-fog">Floor</dt>
              <dd className="mt-1.5 font-mono text-lg font-bold tabular text-coral-ink">
                {fmtRatio(order.floorRatio)}
              </dd>
            </div>
            <div>
              <dt className="mlabel text-fog">Failsafe</dt>
              <dd className="mt-1.5 font-mono text-lg font-bold tabular text-ink">
                {fmtDate(order.failsafeAt)}
              </dd>
            </div>
            <div>
              <dt className="mlabel text-fog">Amount</dt>
              <dd className="mt-1.5 font-mono text-lg font-bold tabular text-ink">
                {order.amount.toFixed(2)}
              </dd>
            </div>
            {order.status === "SETTLED" ? (
              <>
                <div>
                  <dt className="mlabel text-fog">Executed at</dt>
                  <dd className="mt-1.5 font-mono text-lg font-bold tabular text-ink">
                    {order.executedRatio != null ? fmtRatio(order.executedRatio) : "—"}
                  </dd>
                </div>
                <div>
                  <dt className="mlabel text-fog">Filled</dt>
                  <dd className="mt-1.5 font-mono text-lg font-bold tabular text-ink">
                    {order.filledAmount != null ? order.filledAmount.toFixed(4) : "—"}
                  </dd>
                </div>
              </>
            ) : (
              <div>
                <dt className="mlabel text-fog">Exec now</dt>
                <dd className="mt-1.5 flex items-center gap-2 font-mono text-lg font-bold tabular text-ink">
                  {ratio != null ? fmtRatio(ratio) : "—"}
                  <span className="h-1.5 w-1.5 rounded-full bg-lime animate-pulse-ring" aria-hidden />
                </dd>
              </div>
            )}
          </dl>

          {order.status === "SETTLED" ? (
            <p className="mt-6 rounded-xl border-2 border-ink bg-lime px-4 py-3 font-mono text-[10.5px] font-bold uppercase tracking-[0.1em] text-ink">
              {order.fillPath === "FAILSAFE"
                ? "Filled via failsafe — deadline arrived first, floor honored"
                : "Filled at target or better — before your failsafe"}
            </p>
          ) : null}

          {/* market trace */}
          <div className="mt-6 rounded-xl border-2 border-ink bg-bone/60 p-4">
            <div className="flex items-center justify-between">
              <Label>Executable ratio · live</Label>
              <span className="font-mono text-[11px] font-bold tabular text-ink">
                {ratio != null ? fmtRatio(ratio) : "—"}
              </span>
            </div>
            <RatioSpark
              history={market.history}
              height={54}
              targetLine={order.targetRatio}
              className="mt-3"
            />
          </div>
        </div>

        {/* activity + advanced */}
        <div className="flex flex-col gap-6">
          <div className="rounded-2xl border-2 border-ink bg-paper p-5 md:p-6">
            <Label>Activity</Label>
            <ol className="mt-4 max-h-72 space-y-3.5 overflow-y-auto pr-1 scroll-thin">
              {[...order.events].reverse().map((e, i) => (
                <li key={i} className="flex gap-3.5">
                  <span
                    aria-hidden
                    className={cn(
                      "mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full border-2",
                      i === 0 ? "border-ink bg-lime" : "border-ink bg-ink",
                    )}
                  />
                  <div>
                    <p className="font-mono text-[11px] font-bold uppercase tracking-[0.08em] text-ink">
                      {e.status.replace("_", " ")}
                    </p>
                    <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.06em] text-fog">
                      {fmtDateTime(e.at)}
                    </p>
                    {e.note ? (
                      <p className="mt-1 font-mono text-[10px] leading-relaxed tracking-[0.02em] text-fog">
                        {e.note}
                      </p>
                    ) : null}
                  </div>
                </li>
              ))}
            </ol>
          </div>

          <AdvancedPanel orderId={order.id} />
        </div>
      </div>

      <Modal open={confirming} onClose={() => setConfirming(false)} title={`Cancel ${order.id}?`}>
        <p className="text-[13.5px] leading-relaxed text-fog">
          Watching stops immediately and your escrowed{" "}
          <span className="font-bold text-ink">{order.amount.toFixed(2)} SPACEX</span>{" "}
          returns to your wallet. The mint’s 1% transfer fee applies on the
          return leg.
        </p>
        <div className="mt-5 flex flex-col gap-2.5 sm:flex-row-reverse">
          <Button
            variant="danger"
            onClick={() => {
              src.cancelOrder(order.id);
              setConfirming(false);
              toast({
                title: `${order.id} CANCELLED`,
                body: "Escrow returning to your wallet.",
                tone: "coral",
              });
            }}
          >
            Cancel order
          </Button>
          <Button variant="outline" onClick={() => setConfirming(false)}>
            Keep watching
          </Button>
        </div>
      </Modal>
    </div>
  );
}

/* ---------------------------- advanced details ---------------------------- */

function AdvancedPanel({ orderId }: { orderId: string }) {
  const [open, setOpen] = useState(false);
  useTMinusVersion();
  const src = useTMinus();
  const order = src.getOrder(orderId);
  if (!order) return null;
  const asset = src.getAsset(order.assetId)!;
  const rawAmount = order.amount * asset.rawMultiplier;

  const rows: [string, string][] = [
    ["Token standard", "TOKEN-2022"],
    ["Transfer fee", `${asset.transferFeeBps} BPS · priced in`],
    ["Raw units", `${rawAmount.toFixed(6)} RAW (×${asset.rawMultiplier} multiplier, pinned)`],
    ["Src mint", "PreANxu…uAWq"],
    ["Dst mint", "SPCXx…4Jp2"],
    ["Order account", `TMNSord-${order.id.slice(3)}…Qp7e`],
    ["Program", "TMinus11111111111111111111111111111111112"],
    ["Min fill", "25% of order size"],
    ["Fill check", "Executable delivery · no oracle"],
  ];

  return (
    <div className="rounded-2xl border-2 border-dashed border-ink/35 bg-bone/40">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between px-5 py-4 md:px-6"
      >
        <span className="font-mono text-[10.5px] font-bold uppercase tracking-[0.16em] text-ink">
          Advanced details
        </span>
        <span
          aria-hidden
          className={cn("font-bold text-ink transition-transform", open && "rotate-180")}
        >
          ▾
        </span>
      </button>
      {open ? (
        <dl className="space-y-2.5 border-t-2 border-dashed border-ink/20 px-5 py-5 md:px-6">
          {rows.map(([k, v]) => (
            <div key={k} className="flex items-baseline justify-between gap-4">
              <dt className="mlabel shrink-0 text-fog">{k}</dt>
              <dd className="truncate font-mono text-[10px] tabular tracking-[0.02em] text-ink/80">
                {v}
              </dd>
            </div>
          ))}
          <p className="border-t-2 border-dashed border-ink/15 pt-4 font-mono text-[9px] uppercase leading-relaxed tracking-[0.1em] text-fog-2">
            Advanced fields reflect live API / program state when present.
          </p>
        </dl>
      ) : null}
    </div>
  );
}
