"use client";

import { useTMinus, useTMinusVersion } from "@/lib/tminus/adapters/context";
import { navigate } from "@/lib/tminus/router";
import { LifecyclePanel } from "./LifecyclePanel";
import { ActionDesk } from "./ActionDesk";
import { OrderTicket } from "./OrderTicket";
import { MyOrders } from "./MyOrders";
import { ProtocolPanel } from "./ProtocolPanel";
import { Label } from "@/components/tminus/system/primitives";
import { ReceiptCard } from "@/components/tminus/system/ReceiptCard";

/**
 * The execution console — one screen, four beats:
 * lifecycle → rule → orders → latest proof.
 */
export function ConsoleView() {
  useTMinusVersion();
  const src = useTMinus();
  const receipts = src.listReceipts();
  const latest =
    receipts.find((r) => r.network === "MAINNET" && r.eventKind === "conversion") ??
    receipts.find((r) => (r.eventKind ?? "fill") === "fill") ??
    receipts[0];

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:px-6 md:py-10">
      <div className="grid gap-8 lg:grid-cols-12">
        {/* left column */}
        <div className="lg:col-span-7">
          <LifecyclePanel />
          <ActionDesk />
          <ProtocolPanel />
          <MyOrders />
        </div>

        {/* right column */}
        <div className="lg:col-span-5">
          <div className="flex flex-col gap-6">
            <OrderTicket />

            {latest ? (
              <section aria-label="Latest proof">
                <div className="flex items-center justify-between">
                  <Label>Latest proof</Label>
                  <button
                    type="button"
                    onClick={() => navigate("#/receipts")}
                    className="font-mono text-[9.5px] font-bold uppercase tracking-[0.14em] text-fog transition-colors hover:text-ink"
                  >
                    All receipts →
                  </button>
                </div>
                <div className="mt-3">
                  <ReceiptCard receipt={latest} compact />
                </div>
              </section>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
