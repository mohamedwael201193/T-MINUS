"use client";

import { useTMinus, useTMinusVersion } from "@/lib/tminus/adapters/context";
import { fmtDateTime, truncMid } from "@/lib/tminus/utils";
import { Label, Panel, Stat } from "@/components/tminus/system/primitives";

function tone(ok: boolean | null | undefined) {
  if (ok === true) return "border-ink bg-lime text-ink";
  if (ok === false) return "border-ink bg-coral text-ink";
  return "border-ink/30 bg-bone text-fog";
}

/**
 * Five-layer truth for the selected PreStock: issuer, chain, market, Jupiter, T-MINUS.
 */
export function ActionDesk() {
  useTMinusVersion();
  const src = useTMinus();
  const assetId = src.getSelectedAssetId();
  const action = src.getAction(assetId);
  const asset = src.getAsset(assetId);
  const market = src.getMarket(assetId);

  if (!asset) return null;

  const issuerOk = Boolean(action?.issuerStatement || asset.issuerPageUrl);
  const chainOk = action?.onchainRpcOk ?? null;
  const marketOk = asset.price > 0;
  const jupiterOk = market.executableRatio != null;
  const allow = action ? action.refusals.length === 0 && action.stage === "CONVERSION_WINDOW" : false;

  return (
    <Panel tone="paper" as="section" aria-label="Corporate action" className="mt-8 overflow-hidden">
      <div className="border-b-2 border-ink/10 px-5 py-3 md:px-6">
        <Label>Corporate action</Label>
        <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.12em] text-fog">
          Issuer instruction · on-chain mint · market · Jupiter · T-MINUS gate
        </p>
      </div>
      <div className="space-y-4 px-5 py-4 md:px-6">
        <p className="text-[13.5px] leading-relaxed text-fog">
          {action?.issuerStatement ?? asset.stageNote}
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          <Layer label="Issuer" value={action?.actionType ?? "NONE"} ok={issuerOk} />
          <Layer
            label="Chain"
            value={
              action?.paused
                ? "Paused"
                : action?.hookProgramId
                  ? "Hook"
                  : action?.transferFeeBps != null
                    ? `${action.transferFeeBps} bps`
                    : "Unknown"
            }
            ok={chainOk}
          />
          <Layer label="Market" value={asset.price > 0 ? "Priced" : "—"} ok={marketOk} />
          <Layer
            label="Jupiter"
            value={jupiterOk ? "Routable" : "No quote"}
            ok={jupiterOk}
          />
          <Layer
            label="T-MINUS"
            value={allow ? "Can sign" : (action?.refusals[0] ?? asset.executionAvailability ?? "Halt")}
            ok={allow}
          />
        </div>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
          <Stat label="Settlement" value={action?.settlementKind === "TRADE" ? "TRADE" : "NONE"} />
          <Stat
            label="Destination"
            value={action?.destinationVerified ? action.destinationSymbol ?? "—" : "Unverified"}
          />
          <Stat
            label="Stated ratio"
            value={action?.statedRatio != null ? String(action.statedRatio) : "Not stated"}
          />
          <Stat
            label="Evidence"
            value={action?.sourceHash ? truncMid(action.sourceHash, 6, 4) : asset.fetchedAt ? fmtDateTime(asset.fetchedAt) : "—"}
          />
        </dl>
        {action?.allowsAnyToken ? (
          <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-fog">
            Issuer allows any token. Desk default is the named destination, not a 1:1 rollover.
          </p>
        ) : null}
        {action?.refusals.length ? (
          <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-coral-ink">
            Gate · {action.refusals.join(" · ")}
          </p>
        ) : null}
      </div>
    </Panel>
  );
}

function Layer({ label, value, ok }: { label: string; value: string; ok: boolean | null }) {
  return (
    <div className={`rounded-xl border-2 px-2.5 py-2 ${tone(ok)}`}>
      <p className="font-mono text-[8.5px] font-bold uppercase tracking-[0.14em] opacity-70">{label}</p>
      <p className="mt-1 truncate font-mono text-[10px] font-bold uppercase tracking-[0.06em]">{value}</p>
    </div>
  );
}
