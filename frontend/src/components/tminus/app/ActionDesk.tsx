"use client";

import { useState } from "react";
import { useTMinus, useTMinusVersion } from "@/lib/tminus/adapters/context";
import { fmtDateTime, truncMid } from "@/lib/tminus/utils";
import { Label, Panel, Stat } from "@/components/tminus/system/primitives";
import type { CorporateActionView } from "@/lib/tminus/domain/types";

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
  const [open, setOpen] = useState(false);
  const assetId = src.getSelectedAssetId();
  const action = src.getAction(assetId);
  const asset = src.getAsset(assetId);
  const market = src.getMarket(assetId);
  const wallet = src.getWallet();

  if (!asset) return null;

  const issuerOk = Boolean(action?.issuerStatement || asset.issuerPageUrl);
  const chainOk = action?.onchainRpcOk ?? null;
  const marketOk = asset.price > 0;
  const jupiterOk = market.executableRatio != null;
  const noSpacex =
    assetId === "spacex" && wallet.connected && (wallet.balances?.SPACEX ?? 0) <= 0;
  const allow = Boolean(
    action && action.refusals.length === 0 && action.stage === "CONVERSION_WINDOW" && !noSpacex,
  );

  return (
    <Panel tone="paper" as="section" aria-label="Corporate action" className="mt-8 overflow-hidden">
      <div className="border-b-2 border-ink/10 px-5 py-3 md:px-6">
        <Label>Why this action is active</Label>
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
            value={
              allow
                ? "Can sign"
                : noSpacex
                  ? "INSUFFICIENT_BALANCE"
                  : (action?.refusals[0] ?? asset.executionAvailability ?? "Halt")
            }
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
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-fog hover:text-ink"
        >
          {open ? "Hide provenance" : "Show provenance"}
        </button>
        {open ? (
          <dl className="grid grid-cols-1 gap-3 rounded-xl border-2 border-ink/15 bg-bone/40 px-4 py-3 sm:grid-cols-2">
            <Stat label="Issuer source" value={action?.issuerPageUrl ?? asset.issuerPageUrl ?? "—"} />
            <Stat label="Fetched at" value={action?.fetchedAt ? fmtDateTime(action.fetchedAt) : asset.fetchedAt ? fmtDateTime(asset.fetchedAt) : "—"} />
            <Stat label="Source hash" value={action?.sourceHash ? truncMid(action.sourceHash, 8, 6) : "—"} />
            <Stat label="Deadline" value={action?.deadline ? fmtDateTime(action.deadline) : "—"} />
            <Stat label="Destination mint" value={action?.destinationMint ? truncMid(action.destinationMint, 6, 4) : "Unverified"} />
            <Stat label="Token program" value={action?.tokenProgram ? truncMid(action.tokenProgram, 6, 4) : "—"} />
            <Stat label="Paused" value={action?.paused == null ? "Unknown" : action.paused ? "Yes" : "No"} />
            <Stat label="Hook" value={action?.hookProgramId ? truncMid(action.hookProgramId, 6, 4) : "None"} />
            <Stat label="Market price" value={action?.tokenPrice != null ? String(action.tokenPrice) : asset.price ? String(asset.price) : "—"} />
            <Stat label="Mark price" value={action?.markPrice != null ? String(action.markPrice) : asset.markPrice ? String(asset.markPrice) : "—"} />
            <Stat label="Jupiter ratio" value={jupiterOk && market.executableRatio != null ? String(market.executableRatio) : "No quote"} />
            <Stat label="Action fingerprint" value={action?.fingerprint ? truncMid(action.fingerprint, 8, 6) : "—"} />
            <Stat label="Event kind" value={action?.eventKind ?? "NO_CHANGE"} />
            <Stat label="Last verified" value={action?.eventDetectedAt ? fmtDateTime(action.eventDetectedAt) : action?.fetchedAt ? fmtDateTime(action.fetchedAt) : "—"} />
            <Stat label="Final gate" value={allow ? "READY" : action?.refusals[0] ?? "BLOCKED"} />
          </dl>
        ) : null}
        <EventHistory action={action} />
      </div>
    </Panel>
  );
}

function EventHistory({ action }: { action: CorporateActionView | undefined }) {
  if (!action) return null;
  const kind = action.eventKind && action.eventKind !== "NO_CHANGE" ? action.eventKind : null;
  const actionableKind =
    kind &&
    kind !== "TEXT_CHANGED_NON_ACTIONABLE" &&
    (action.previousActionType !== action.actionType ||
      action.previousDeadline !== action.deadline ||
      kind === "DESTINATION_CHANGED" ||
      kind === "RATIO_CHANGED" ||
      kind === "SOURCE_UNAVAILABLE" ||
      kind === "PARSE_CHANGED" ||
      kind === "STATE_CHANGED" ||
      kind === "ACTION_CHANGED" ||
      kind === "DEADLINE_CHANGED");
  const hasPrevious = Boolean(
    actionableKind && (action.previousActionType || action.previousDeadline),
  );
  return (
    <div className="rounded-xl border-2 border-ink/15 bg-bone/30 px-4 py-3">
      <p className="font-mono text-[9px] font-bold uppercase tracking-[0.16em] text-fog">Issuer event history</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div>
          <p className="font-mono text-[8.5px] uppercase tracking-[0.14em] text-fog">Current</p>
          <p className="mt-1 font-mono text-[11px] font-bold uppercase tracking-[0.08em] text-ink">
            {action.actionType} · {action.deadline ? fmtDateTime(action.deadline) : "—"}
          </p>
          <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.12em] text-lime">
            Verified{action.eventDetectedAt ? ` · ${fmtDateTime(action.eventDetectedAt)}` : ""}
          </p>
        </div>
        {hasPrevious ? (
          <div>
            <p className="font-mono text-[8.5px] uppercase tracking-[0.14em] text-fog">Previously</p>
            <p className="mt-1 font-mono text-[11px] font-bold uppercase tracking-[0.08em] text-ink">
              {action.previousActionType ?? "—"} · {action.previousDeadline ? fmtDateTime(action.previousDeadline) : "—"}
            </p>
            <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.12em] text-coral-ink">
              Superseded{kind ? ` · ${kind}` : ""}
            </p>
          </div>
        ) : (
          <div>
            <p className="font-mono text-[8.5px] uppercase tracking-[0.14em] text-fog">Transitions</p>
            <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.08em] text-fog">
              None persisted. Fake history is not shown.
            </p>
          </div>
        )}
      </div>
    </div>
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
