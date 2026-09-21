"use client";

import { useEffect, useMemo, useState } from "react";
import { useTMinus, useTMinusVersion } from "@/lib/tminus/adapters/context";
import { cn, fmtDate, fmtRatio, round } from "@/lib/tminus/utils";
import { SPACEX_ASSET_ID } from "@/lib/tminus/data/lifecycleData";
import { Button, Label, Panel } from "@/components/tminus/system/primitives";
import { RatioBand } from "@/components/tminus/system/RatioBand";
import { useToast } from "@/components/tminus/system/toast";

/**
 * SET YOUR RULE — the entire order surface. Four inputs, one plain-
 * English summary, one button. Validation is inline and human.
 */

const TARGET_BOUNDS = { min: 0.6, max: 0.99 };
const FLOOR_BOUNDS = { min: 0.5, max: 0.95 };

export function OrderTicket() {
  useTMinusVersion();
  const src = useTMinus();
  const { toast } = useToast();
  const env = src.getEnvironment();
  const asset = src.getAsset(SPACEX_ASSET_ID);
  const market = src.getMarket(SPACEX_ASSET_ID);
  const ratio = market.executableRatio;
  const wallet = src.getWallet();
  const maxAmount = wallet.balances?.SPACEX && wallet.balances.SPACEX > 0 ? wallet.balances.SPACEX : 0;
  const deadlineIso = asset?.windowClosesAt?.slice(0, 10) ?? "";

  const [target, setTarget] = useState("0.820");
  const [floor, setFloor] = useState("0.700");
  const [amount, setAmount] = useState("0.01");
  const [failsafe, setFailsafe] = useState("");
  const [touched, setTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!failsafe && deadlineIso) {
      const d = new Date(`${deadlineIso}T00:00:00.000Z`);
      d.setUTCDate(d.getUTCDate() - 11);
      setFailsafe(d.toISOString().slice(0, 10));
    }
  }, [deadlineIso, failsafe]);

  const num = (s: string) => Number.parseFloat(s);
  const t = num(target);
  const f = num(floor);
  const a = num(amount);

  const errors = useMemo(() => {
    const errs: Record<string, string> = {};
    if (Number.isNaN(t) || t < TARGET_BOUNDS.min || t > TARGET_BOUNDS.max) {
      errs.target = `Between ${TARGET_BOUNDS.min.toFixed(2)} and ${TARGET_BOUNDS.max.toFixed(2)} — the executable range`;
    } else if (!Number.isNaN(f) && f >= t) {
      errs.target = "Target must sit above your floor.";
    }
    if (Number.isNaN(f) || f < FLOOR_BOUNDS.min || f > FLOOR_BOUNDS.max) {
      errs.floor = `Between ${FLOOR_BOUNDS.min.toFixed(2)} and ${FLOOR_BOUNDS.max.toFixed(2)}`;
    }
    if (Number.isNaN(a) || a < 0.01) {
      errs.amount = "At least 0.01 SPACEX.";
    } else if (wallet.connected && maxAmount > 0 && a > maxAmount) {
      errs.amount = `Exceeds wallet — you hold ${maxAmount.toFixed(4)} SPACEX.`;
    } else if (wallet.connected && maxAmount <= 0) {
      errs.amount = "This wallet has no SPACEX on MAINNET.";
    }
    if (!failsafe) {
      errs.failsafe = "Pick your failsafe date.";
    } else if (deadlineIso && failsafe > deadlineIso) {
      errs.failsafe = `After the hard deadline — ${fmtDate(Date.parse(deadlineIso + "T23:59:00Z"))}.`;
    }
    return errs;
  }, [t, f, a, failsafe, maxAmount, wallet.connected, deadlineIso]);

  const valid = Object.keys(errors).length === 0;

  const onSubmit = async () => {
    if (!valid) {
      setTouched(true);
      return;
    }
    if (!wallet.connected) {
      toast({
        title: "CONNECT A WALLET FIRST",
        body: "Your rule is ready — connect to place it.",
        tone: "amber",
      });
      return;
    }
    setSubmitting(true);
    const failsafeIso = new Date(`${failsafe}T00:00:00.000Z`).toISOString();
    try {
      const order = await Promise.resolve(
        src.createOrder({
          assetId: SPACEX_ASSET_ID,
          amount: round(a, 2),
          targetRatio: round(t, 4),
          floorRatio: round(f, 4),
          failsafeAt: failsafeIso,
        }),
      );
      toast({
        title: `ORDER ${order.id} PLACED`,
        body: "Escrow funding · arming the rule…",
        tone: "lime",
      });
      setTouched(false);
    } catch (err) {
      toast({
        title: "PLACE NOT SENT",
        body: err instanceof Error ? err.message : "unknown",
        tone: "coral",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const fieldCls = (hasError: boolean) =>
    cn(
      "h-12 w-full rounded-xl border-2 bg-bone/60 px-3.5 pr-20 font-mono text-[15px] font-bold tabular text-ink",
      "transition-colors placeholder:text-fog-2 focus:bg-paper focus:outline-none",
      hasError ? "border-coral" : "border-ink focus:border-ink",
    );

  return (
    <Panel tone="paper" shadow="lg" className="p-5 md:p-6" as="section" aria-label="Set your rule">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl uppercase leading-none text-ink">Set your rule</h2>
        <span className="rounded-full border-2 border-ink bg-ink px-2.5 py-1 font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-bone">
          SPACEX → SPCXx
        </span>
      </div>

      {/* live ratio */}
      <div className="mt-4 flex items-center justify-between rounded-xl border-2 border-ink bg-ink px-4 py-3">
        <span className="mlabel text-bone-dim">Executable now</span>
        <span className="font-mono text-lg font-bold tabular text-lime">
          {ratio != null ? fmtRatio(ratio) : "—"}
        </span>
      </div>
      {env.dataCluster !== "SIMULATION" ? (
        <p className="mt-3 rounded-xl border-2 border-ink/20 bg-bone/50 px-3 py-2 font-mono text-[9.5px] uppercase leading-relaxed tracking-[0.1em] text-fog">
          Data {env.dataCluster} · program {env.programMainnetExists ? "MAINNET" : env.programDevnetExists ? "DEVNET only" : "UNDEPLOYED ON MAINNET"}
          {env.programMainnetExists ? "" : " — place will not be faked."}
        </p>
      ) : null}

      {/* fields */}
      <div className="mt-5 grid grid-cols-2 gap-3.5">
        <div className="col-span-2 sm:col-span-1">
          <Label>Target ratio</Label>
          <div className="relative mt-1.5">
            <input
              type="number"
              inputMode="decimal"
              step="0.005"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              onBlur={() => setTouched(true)}
              aria-label="Target ratio"
              className={fieldCls(touched && !!errors.target)}
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 font-mono text-[9px] uppercase tracking-[0.1em] text-fog-2">
              SPCXx/SPACEX
            </span>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {["0.780", "0.800", "0.820", "0.850"].map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setTarget(v)}
                className="rounded-full border-2 border-ink/25 bg-bone px-2.5 py-1 font-mono text-[9.5px] font-bold tabular text-fog transition-colors hover:border-ink hover:text-ink"
              >
                {v}
              </button>
            ))}
          </div>
          {touched && errors.target ? <FieldError>{errors.target}</FieldError> : null}
        </div>

        <div className="col-span-2 sm:col-span-1">
          <Label>Floor ratio</Label>
          <div className="relative mt-1.5">
            <input
              type="number"
              inputMode="decimal"
              step="0.005"
              value={floor}
              onChange={(e) => setFloor(e.target.value)}
              onBlur={() => setTouched(true)}
              aria-label="Floor ratio"
              className={fieldCls(touched && !!errors.floor)}
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 font-mono text-[9px] uppercase tracking-[0.1em] text-fog-2">
              MIN ACCEPT
            </span>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {["0.650", "0.700", "0.750"].map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setFloor(v)}
                className="rounded-full border-2 border-ink/25 bg-bone px-2.5 py-1 font-mono text-[9.5px] font-bold tabular text-fog transition-colors hover:border-ink hover:text-ink"
              >
                {v}
              </button>
            ))}
          </div>
          {touched && errors.floor ? <FieldError>{errors.floor}</FieldError> : null}
        </div>

        <div className="col-span-2 sm:col-span-1">
          <Label>Failsafe date</Label>
          <input
            type="date"
            value={failsafe}
            min="2026-01-01"
            max={deadlineIso || undefined}
            onChange={(e) => setFailsafe(e.target.value)}
            onBlur={() => setTouched(true)}
            aria-label="Failsafe date"
            className={cn(fieldCls(touched && !!errors.failsafe), "font-medium")}
          />
          <p className="mt-2.5 font-mono text-[9px] uppercase leading-relaxed tracking-[0.08em] text-fog-2">
            Attempt at floor if the target hasn’t hit{deadlineIso ? ` · latest ${fmtDate(deadlineIso)}` : ""}
          </p>
          {touched && errors.failsafe ? <FieldError>{errors.failsafe}</FieldError> : null}
        </div>

        <div className="col-span-2 sm:col-span-1">
          <Label>Amount</Label>
          <div className="relative mt-1.5">
            <input
              type="number"
              inputMode="decimal"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              onBlur={() => setTouched(true)}
              aria-label="Amount in SPACEX"
              className={fieldCls(touched && !!errors.amount)}
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 font-mono text-[9px] uppercase tracking-[0.1em] text-fog-2">
              SPACEX
            </span>
          </div>
          <div className="mt-2 flex gap-1.5">
            <button
              type="button"
              onClick={() => setAmount(maxAmount > 0 ? maxAmount.toFixed(4) : "0.01")}
              className="rounded-full border-2 border-ink/25 bg-bone px-2.5 py-1 font-mono text-[9.5px] font-bold uppercase tracking-[0.1em] text-fog transition-colors hover:border-ink hover:text-ink"
            >
              Max {wallet.connected ? maxAmount.toFixed(4) : "—"}
            </button>
          </div>
          {touched && errors.amount ? <FieldError>{errors.amount}</FieldError> : null}
        </div>
      </div>

      {/* the rule, visualized */}
      <div className="mt-6">
        {valid && !Number.isNaN(t) && !Number.isNaN(f) ? (
          <RatioBand
            floor={Math.min(f, 0.84)}
            target={Math.min(Math.max(t, f + 0.01), 0.85)}
            current={ratio}
            compact
          />
        ) : (
          <RatioBand floor={0.7} target={0.82} current={ratio} compact />
        )}
      </div>

      {/* plain-english summary */}
      <div className="mt-5 rounded-xl border-2 border-ink bg-bone-deep/70 p-4">
        <p className="mlabel text-fog">What this order means</p>
        <div className="mt-3 space-y-2.5">
          <p className="flex items-start gap-2.5">
            <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-lime" aria-hidden />
            <span className="font-mono text-[11px] leading-relaxed tracking-[0.02em] text-ink">
              IF the executable ratio reaches{" "}
              <span className="font-bold">{!Number.isNaN(t) ? fmtRatio(t) : "—"}</span> →
              convert {!Number.isNaN(a) ? a.toFixed(2) : "—"} SPACEX at{" "}
              <span className="font-bold">{!Number.isNaN(t) ? fmtRatio(t) : "—"}</span> or
              better.
            </span>
          </p>
          <p className="flex items-start gap-2.5">
            <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-amber" aria-hidden />
            <span className="font-mono text-[11px] leading-relaxed tracking-[0.02em] text-ink">
              IF{" "}
              <span className="font-bold">
                {failsafe ? fmtDate(Date.parse(`${failsafe}T00:00:00Z`)) : "—"}
              </span>{" "}
              arrives first → attempt at{" "}
              <span className="font-bold">{!Number.isNaN(f) ? fmtRatio(f) : "—"}</span> or
              better. No worse.
            </span>
          </p>
        </div>
        <p className="mt-3.5 border-t-2 border-dashed border-ink/15 pt-3 font-mono text-[9px] uppercase leading-relaxed tracking-[0.08em] text-fog">
          1% transfer fee priced in · escrow returns on cancel (fee applies
          on the way out) · cancel anytime before execution
        </p>
      </div>

      <Button
        size="lg"
        className="mt-5 w-full"
        onClick={onSubmit}
        disabled={submitting}
      >
        {submitting ? "Placing…" : "Set order"}
        <span aria-hidden>→</span>
      </Button>
      {!wallet.connected ? (
        <p className="mt-3 text-center font-mono text-[10px] uppercase tracking-[0.12em] text-fog">
          Connect a wallet to place — takes ten seconds
        </p>
      ) : null}
    </Panel>
  );
}

function FieldError({ children }: { children: React.ReactNode }) {
  return (
    <p role="alert" className="mt-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-coral-ink">
      {children}
    </p>
  );
}
