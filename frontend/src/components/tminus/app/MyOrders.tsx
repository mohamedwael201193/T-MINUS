"use client";

import { useMemo, useState } from "react";
import { useTMinus, useTMinusVersion } from "@/lib/tminus/adapters/context";
import { navigate } from "@/lib/tminus/router";
import { countdownTo, fmtDate, fmtRatio } from "@/lib/tminus/utils";
import { useNow } from "@/lib/tminus/router";
import type { ConversionOrder } from "@/lib/tminus/domain/types";
import { Button, StatusChip } from "@/components/tminus/system/primitives";
import { StateRailCompact, stepsForOrder } from "@/components/tminus/system/StateRail";
import { Modal } from "@/components/tminus/system/Modal";
import { useToast } from "@/components/tminus/system/toast";
import { cn } from "@/lib/tminus/utils";

type Filter = "ALL" | "OPEN" | "SETTLED";

const FILTERS: Filter[] = ["ALL", "OPEN", "SETTLED"];

export function MyOrders() {
  useTMinusVersion();
  const src = useTMinus();
  const [filter, setFilter] = useState<Filter>("ALL");

  const orders = src.listOrders();
  const filtered = useMemo(() => {
    if (filter === "OPEN")
      return orders.filter((o) => ["PLACED", "ARMED", "WATCHING", "TARGET_REACHED", "EXECUTING"].includes(o.status));
    if (filter === "SETTLED") return orders.filter((o) => o.status === "SETTLED");
    return orders;
  }, [orders, filter]);

  return (
    <section aria-label="My orders" className="mt-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-baseline gap-3">
          <h2 className="font-display text-[1.9rem] uppercase leading-none text-ink">
            My orders
          </h2>
          <span className="rounded-full border-2 border-ink bg-paper px-2.5 py-0.5 font-mono text-[10px] font-bold tabular text-ink">
            {orders.length}
          </span>
        </div>
        <div className="flex gap-1.5" role="group" aria-label="Filter orders">
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

      {filtered.length === 0 ? (
        <div className="mt-5 rounded-2xl border-2 border-dashed border-ink/30 bg-bone/40 p-8 text-center">
          <p className="font-display text-2xl uppercase text-ink">
            {orders.length === 0 ? "No orders yet" : "Nothing here"}
          </p>
          <p className="mx-auto mt-2 max-w-sm font-mono text-[10.5px] uppercase leading-relaxed tracking-[0.1em] text-fog">
            {orders.length === 0
              ? "Open a PreStock. If the window is live, the desk will ask you to sign a real trade — or refuse."
              : `No ${filter.toLowerCase()} orders right now.`}
          </p>
          {orders.length === 0 ? (
            <Button size="sm" className="mt-5" onClick={() => navigate("#/app")}>
              Set an order
              <span aria-hidden>→</span>
            </Button>
          ) : null}
        </div>
      ) : (
        <div className="mt-5 flex max-h-[620px] flex-col gap-4 overflow-y-auto pr-1 scroll-thin">
          {filtered.map((o) => (
            <OrderCard key={o.id} order={o} />
          ))}
        </div>
      )}
    </section>
  );
}

/* ------------------------------- order card ------------------------------ */

export function OrderCard({ order }: { order: ConversionOrder }) {
  const src = useTMinus();
  const { toast } = useToast();
  const now = useNow(30_000);
  const [confirming, setConfirming] = useState(false);
  const market = src.getMarket(order.assetId);
  const ratio = market.executableRatio;
  const { steps, current } = stepsForOrder(order.status, order.fillPath);
  const open = ["PLACED", "ARMED", "WATCHING", "TARGET_REACHED", "EXECUTING"].includes(order.status);

  const failsafeParts = now != null ? countdownTo(now, Date.parse(order.failsafeAt)) : null;

  return (
    <article
      className={cn(
        "group rounded-2xl border-2 border-ink bg-paper p-4 transition-all hover:-translate-y-0.5 hover:shadow-[4px_4px_0_0_var(--color-ink)] md:p-5",
        order.status === "CANCELLED" && "hover:opacity-100",
      )}
    >
      <div className="flex flex-wrap items-center gap-2.5">
        <button
          type="button"
          onClick={() => navigate(`#/order/${order.id}`)}
          className="font-mono text-[13px] font-bold tabular tracking-[0.04em] text-ink underline decoration-ink/25 decoration-2 underline-offset-4 hover:decoration-ink"
        >
          {order.id}
        </button>
        <StatusChip status={order.status} />
        <span className="ml-auto font-mono text-[11px] font-bold tabular text-fog">
          {order.amount.toFixed(2)} SPACEX
        </span>
      </div>

      <div className="mt-4">
        <StateRailCompact steps={steps} current={current} />
      </div>

      <div
        className={cn(
          "mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t-2 border-dashed border-ink/10 pt-4 sm:grid-cols-4",
          order.status === "CANCELLED" && "opacity-55",
        )}
      >
        <Cell label="Target" value={fmtRatio(order.targetRatio)} />
        <Cell label="Floor" value={fmtRatio(order.floorRatio)} tone="coral" />
        {order.status === "SETTLED" ? (
          <>
            <Cell
              label="Executed"
              value={order.executedRatio != null ? fmtRatio(order.executedRatio) : "—"}
              tone="lime"
            />
            <Cell
              label="Filled"
              value={order.filledAmount != null ? `${order.filledAmount.toFixed(4)} SPCXx` : "—"}
              tone="lime"
            />
          </>
        ) : order.status === "CANCELLED" ? (
          <>
            <Cell label="Exec" value={ratio != null ? fmtRatio(ratio) : "—"} />
            <Cell
              label="Cancelled"
              value={fmtDate(order.events[order.events.length - 1]?.at ?? order.createdAt)}
            />
          </>
        ) : (
          <>
            <Cell label="Exec now" value={ratio != null ? fmtRatio(ratio) : "—"} live />
            <div className="flex flex-col gap-1">
              <span className="mlabel text-fog">Failsafe</span>
              <span className="font-mono text-[12px] font-bold tabular leading-none text-ink">
                {fmtDate(order.failsafeAt)}
              </span>
              <span className="font-mono text-[10px] tabular text-fog">
                {failsafeParts && !failsafeParts.past
                  ? `${failsafeParts.days}D ${String(failsafeParts.hours).padStart(2, "0")}H LEFT`
                  : failsafeParts?.past
                    ? "REACHED"
                    : "—"}
              </span>
            </div>
          </>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-fog">
          {order.status === "SETTLED"
            ? order.fillPath === "FAILSAFE"
              ? "Filled via failsafe at floor"
              : "Filled at target or better"
            : order.status === "CANCELLED"
              ? "Closed by owner"
              : order.status === "TARGET_REACHED"
                ? "Target reached — converting"
                : order.status === "EXECUTING"
                  ? "Executing — atomic fill in progress"
                  : order.status === "PLACED"
                    ? "Placed — arming the rule"
                    : order.status === "ARMED"
                      ? "Armed — starting watch"
                      : `Watching for ${fmtRatio(order.targetRatio)}`}
        </span>
        <div className="flex items-center gap-2">
          {open ? (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              className="rounded-full border-2 border-coral/70 px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-coral-ink transition-colors hover:bg-coral hover:text-ink"
            >
              Cancel
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => navigate(`#/order/${order.id}`)}
            className="rounded-full border-2 border-ink px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-ink transition-colors hover:bg-ink hover:text-bone"
          >
            Open →
          </button>
        </div>
      </div>

      <Modal open={confirming} onClose={() => setConfirming(false)} title={`Cancel ${order.id}?`}>
        <p className="text-[13.5px] leading-relaxed text-fog">
          Watching stops immediately and your escrowed{" "}
          <span className="font-bold text-ink">{order.amount.toFixed(2)} SPACEX</span>{" "}
          returns to your wallet. The mint’s 1% transfer fee applies on the
          return leg — same as any transfer out.
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
    </article>
  );
}

function Cell({
  label,
  value,
  tone = "ink",
  live = false,
}: {
  label: string;
  value: string;
  tone?: "ink" | "lime" | "coral";
  live?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="mlabel text-fog">{label}</span>
      <span
        className={cn(
          "font-mono text-[12.5px] font-bold tabular leading-none",
          tone === "ink" && "text-ink",
          tone === "lime" && "text-ink",
          tone === "coral" && "text-coral-ink",
        )}
      >
        {value}
        {live ? (
          <span className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-lime align-middle animate-pulse-ring" aria-hidden />
        ) : null}
      </span>
    </div>
  );
}
