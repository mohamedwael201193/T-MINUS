"use client";

import { useEffect, useMemo, useState } from "react";
import { useTMinus, useTMinusVersion } from "@/lib/tminus/adapters/context";
import { cn, fmtDate, fmtRatio } from "@/lib/tminus/utils";
import { Button, Label, Panel } from "@/components/tminus/system/primitives";
import { RatioBand } from "@/components/tminus/system/RatioBand";
import { useToast } from "@/components/tminus/system/toast";
import { displayToRaw, maxSafeInputRaw, MIN_SOL_FOR_TRADE, rawToDisplayString } from "@/lib/tminus/wallet/safeAmount";

/**
 * Conversion ticket — floor, amount, live post-fee ratio, then Sign.
 * Failsafe date is DEVNET protocol context only; Mainnet conversion is user-signed.
 */

const TARGET_BOUNDS = { min: 0.6, max: 0.99 };
const FLOOR_BOUNDS = { min: 0.5, max: 0.95 };

export function OrderTicket() {
  useTMinusVersion();
  const src = useTMinus();
  const { toast } = useToast();
  const env = src.getEnvironment();
  const assetId =
    typeof src.getSelectedAssetId === "function" ? src.getSelectedAssetId() : "spacex";
  const asset = src.getAsset(assetId) ?? src.listAssets()[0];
  const market = src.getMarket(asset?.id ?? assetId);
  const ratio = market.executableRatio;
  const wallet = src.getWallet();
  const isSpacex = asset?.id === "spacex";
  const walletRaw = wallet.balances?.spacexRaw ? BigInt(wallet.balances.spacexRaw) : BigInt(0);
  const maxRaw = isSpacex ? maxSafeInputRaw(walletRaw) : BigInt(0);
  const sol = wallet.balances?.SOL ?? 0;
  const deadlineIso = asset?.windowClosesAt?.slice(0, 10) ?? "";
  const lifecycleBlocked =
    !asset
      ? "No PreStock selected."
      : asset.stage === "EXPIRED" || asset.executionAvailability === "HALTED"
        ? `${asset.symbol} conversion is halted — the window is closed.`
        : asset.stage !== "CONVERSION_WINDOW"
          ? `${asset.symbol} has no open conversion window.`
          : null;
  const conversionOpen = asset?.stage === "CONVERSION_WINDOW" && !lifecycleBlocked;

  const [target, setTarget] = useState("0.820");
  const [floor, setFloor] = useState("0.700");
  const [amount, setAmount] = useState("");
  const [failsafe, setFailsafe] = useState("");
  const [touched, setTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [amountTouched, setAmountTouched] = useState(false);

  useEffect(() => {
    if (amountTouched) return;
    if (maxRaw > BigInt(0)) setAmount(rawToDisplayString(maxRaw));
  }, [maxRaw, amountTouched]);

  useEffect(() => {
    if (!deadlineIso) {
      setFailsafe("");
      return;
    }
    const d = new Date(`${deadlineIso}T00:00:00.000Z`);
    d.setUTCDate(d.getUTCDate() - 11);
    const next = d.toISOString().slice(0, 10);
    setFailsafe(next > deadlineIso ? deadlineIso : next);
  }, [deadlineIso]);

  const num = (s: string) => Number.parseFloat(s);
  const t = num(target);
  const f = num(floor);
  const a = num(amount);

  const errors = useMemo(() => {
    const errs: Record<string, string> = {};
    if (Number.isNaN(t) || t < TARGET_BOUNDS.min || t > TARGET_BOUNDS.max) {
      errs.target = `Between ${TARGET_BOUNDS.min.toFixed(2)} and ${TARGET_BOUNDS.max.toFixed(2)} — the executable range`;
    } else if (!conversionOpen && !Number.isNaN(f) && f >= t) {
      errs.target = "Target must sit above your floor.";
    }
    if (Number.isNaN(f) || f < FLOOR_BOUNDS.min || f > FLOOR_BOUNDS.max) {
      errs.floor = `Between ${FLOOR_BOUNDS.min.toFixed(2)} and ${FLOOR_BOUNDS.max.toFixed(2)}`;
    }
    if (Number.isNaN(a) || a <= 0) {
      errs.amount = `Enter an amount in ${asset?.symbol ?? "SPACEX"}.`;
    } else if (wallet.connected && isSpacex && maxRaw <= BigInt(0)) {
      errs.amount = "This wallet has no SPACEX on MAINNET.";
    } else if (wallet.connected && isSpacex && displayToRaw(amount) > maxRaw) {
      errs.amount = `Exceeds wallet — you hold ${rawToDisplayString(maxRaw)} SPACEX.`;
    } else if (wallet.connected && isSpacex && sol < MIN_SOL_FOR_TRADE) {
      errs.amount = "Not enough SOL for the network fee.";
    } else if (wallet.connected && !isSpacex) {
      errs.amount = `Live balances are wired for SPACEX only. ${asset?.symbol ?? "This mint"} cannot be sized from this wallet yet.`;
    }
    if (conversionOpen && failsafe && deadlineIso && failsafe > deadlineIso) {
      errs.failsafe = `After the hard deadline — ${fmtDate(Date.parse(deadlineIso + "T23:59:00Z"))}.`;
    }
    return errs;
  }, [t, f, a, failsafe, maxRaw, wallet.connected, deadlineIso, isSpacex, asset?.symbol, conversionOpen, amount, sol]);

  const valid = Object.keys(errors).length === 0;
  const signBlocked =
    Boolean(lifecycleBlocked) ||
    (conversionOpen && (!wallet.connected || maxRaw <= BigInt(0) || !valid));

  const onSubmit = async () => {
    if (!valid) {
      setTouched(true);
      return;
    }
    if (!wallet.connected) {
      toast({
        title: "CONNECT A WALLET FIRST",
        body: "Your rule is ready — connect to sign.",
        tone: "amber",
      });
      return;
    }
    if (lifecycleBlocked) {
      toast({
        title: "CONVERSION BLOCKED",
        body: lifecycleBlocked,
        tone: "coral",
      });
      return;
    }
    if (!asset) return;
    setSubmitting(true);
    try {
      if (env.dataCluster === "SIMULATION") {
        const failsafeIso = new Date(`${failsafe}T00:00:00.000Z`).toISOString();
        const order = await Promise.resolve(
          src.createOrder({
            assetId: asset.id,
            amount: Number.isFinite(a) ? a : 0,
            targetRatio: Number.isFinite(t) ? t : 0,
            floorRatio: Number.isFinite(f) ? f : 0,
            failsafeAt: failsafeIso,
          }),
        );
        toast({
          title: `ORDER ${order.id} PLACED`,
          body: "Design simulation only — not a Mainnet conversion.",
          tone: "lime",
        });
        setTouched(false);
        return;
      }
      const requested = displayToRaw(amount);
      const capped = requested > maxRaw ? maxRaw : requested;
      const result = await src.requestConversion({
        assetId: asset.id,
        amountDisplay: a,
        amountRaw: capped.toString(),
        floorRatio: f,
      });
      if (result.status === "settled") {
        toast({
          title: "CONVERSION SETTLED",
          body: `Mainnet Jupiter trade · ${result.signature.slice(0, 8)}…`,
          tone: "lime",
        });
      } else if (result.status === "submitted") {
        toast({
          title: "SUBMITTED — NOT CONFIRMED",
          body: result.message,
          tone: "amber",
        });
      } else if (result.status === "refused") {
        toast({
          title: "SAFETY GATE",
          body: result.message,
          tone: "coral",
        });
      } else {
        toast({
          title: "CONVERSION NOT SENT",
          body: result.message,
          tone: "coral",
        });
      }
      setTouched(false);
    } catch (err) {
      toast({
        title: "CONVERSION NOT SENT",
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
    <Panel tone="paper" shadow="lg" className="p-5 md:p-6" as="section" aria-label="Authorize conversion">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl uppercase leading-none text-ink">
          {conversionOpen ? "Authorize conversion" : "Window closed"}
        </h2>
        <span className="rounded-full border-2 border-ink bg-ink px-2.5 py-1 font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-bone">
          {asset?.symbol ?? "PRESTOCK"} → {asset?.destinationSymbol ?? "TBD"}
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
          Data {env.dataCluster} · settlement {conversionOpen ? "MAINNET Jupiter TRADE" : "none"} · protocol {env.programDevnetExists ? "DEVNET proof" : "UNDEPLOYED"}
          {conversionOpen ? " — this button never fakes a signature." : " — Mainnet escrow place is not offered."}
        </p>
      ) : null}

      {/* fields */}
      <div className="mt-5 grid grid-cols-2 gap-3.5">
        <div className="col-span-2 sm:col-span-1">
          <Label>Target ratio</Label>
          <div className="relative mt-1.5">
            <input
              id="tminus-target-ratio"
              name="targetRatio"
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
              {asset?.destinationSymbol ?? "DST"}/{asset?.symbol ?? "SRC"}
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
              id="tminus-floor-ratio"
              name="floorRatio"
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
            id="tminus-failsafe-date"
            name="failsafeDate"
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
            {conversionOpen
              ? `DEVNET protocol failsafe — unused on this Mainnet signature${deadlineIso ? ` · latest ${fmtDate(deadlineIso)}` : ""}`
              : `DEVNET failsafe only${deadlineIso ? ` · latest ${fmtDate(deadlineIso)}` : ""}`}
          </p>
          {touched && errors.failsafe ? <FieldError>{errors.failsafe}</FieldError> : null}
        </div>

        <div className="col-span-2 sm:col-span-1">
          <Label>Amount</Label>
          <div className="relative mt-1.5">
            <input
              id="tminus-amount"
              name="amount"
              type="number"
              inputMode="decimal"
              step="any"
              value={amount}
              onChange={(e) => {
                setAmountTouched(true);
                setAmount(e.target.value);
              }}
              onBlur={() => setTouched(true)}
              aria-label={`Amount in ${asset?.symbol ?? "token"}`}
              className={fieldCls(touched && !!errors.amount)}
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 font-mono text-[9px] uppercase tracking-[0.1em] text-fog-2">
              {asset?.symbol ?? "SPACEX"}
            </span>
          </div>
          <div className="mt-2 flex gap-1.5">
            <button
              type="button"
              onClick={() => {
                setAmountTouched(true);
                setAmount(maxRaw > BigInt(0) ? rawToDisplayString(maxRaw) : "");
              }}
              className="rounded-full border-2 border-ink/25 bg-bone px-2.5 py-1 font-mono text-[9.5px] font-bold uppercase tracking-[0.1em] text-fog transition-colors hover:border-ink hover:text-ink"
            >
              Max {wallet.connected && maxRaw > BigInt(0) ? rawToDisplayString(maxRaw) : "—"}
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
        <p className="mlabel text-fog">{conversionOpen ? "What this signature means" : "What this order means"}</p>
        <div className="mt-3 space-y-2.5">
          <p className="flex items-start gap-2.5">
            <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-lime" aria-hidden />
            <span className="font-mono text-[11px] leading-relaxed tracking-[0.02em] text-ink">
              {conversionOpen
                ? `TRADE ${amount || "—"} ${asset?.symbol ?? "SPACEX"} into ${asset?.destinationSymbol ?? "SPCXx"} if the live post-fee ratio is at least ${!Number.isNaN(f) ? fmtRatio(f) : "—"} and every safety gate passes.`
                : `IF the executable ratio reaches ${!Number.isNaN(t) ? fmtRatio(t) : "—"} → convert ${!Number.isNaN(a) ? a.toFixed(4) : "—"} ${asset?.symbol ?? "SPACEX"} at ${!Number.isNaN(t) ? fmtRatio(t) : "—"} or better.`}
            </span>
          </p>
          <p className="flex items-start gap-2.5">
            <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-amber" aria-hidden />
            <span className="font-mono text-[11px] leading-relaxed tracking-[0.02em] text-ink">
              {conversionOpen
                ? "You must be present to sign. Unattended escrow/failsafe is the DEVNET protocol proof, not this Mainnet trade."
                : `IF ${failsafe ? fmtDate(Date.parse(`${failsafe}T00:00:00Z`)) : "—"} arrives first → attempt at ${!Number.isNaN(f) ? fmtRatio(f) : "—"} or better. No worse.`}
            </span>
          </p>
        </div>
        <p className="mt-3.5 border-t-2 border-dashed border-ink/15 pt-3 font-mono text-[9px] uppercase leading-relaxed tracking-[0.08em] text-fog">
          {conversionOpen
            ? "Not a 1:1 rollover · transfer fee priced by the router · destination is the issuer-named mint · T-MINUS never holds these tokens"
            : "1% transfer fee priced in · escrow returns on cancel (fee applies on the way out) · cancel anytime before execution"}
        </p>
      </div>

      <Button
        size="lg"
        className="mt-5 w-full"
        onClick={onSubmit}
        disabled={submitting || signBlocked}
      >
        {submitting ? "Waiting for wallet…" : conversionOpen ? "Sign conversion" : "Window closed"}
        <span aria-hidden>→</span>
      </Button>
      {lifecycleBlocked ? (
        <p className="mt-3 text-center font-mono text-[10px] uppercase tracking-[0.12em] text-coral-ink">
          {lifecycleBlocked}
        </p>
      ) : conversionOpen && wallet.connected && maxRaw <= BigInt(0) ? (
        <p className="mt-3 text-center font-mono text-[10px] uppercase tracking-[0.12em] text-coral-ink">
          This wallet has no SPACEX left to convert. No signature requested.
        </p>
      ) : !wallet.connected ? (
        <p className="mt-3 text-center font-mono text-[10px] uppercase tracking-[0.12em] text-fog">
          Connect a wallet to sign a real Mainnet Jupiter trade
        </p>
      ) : (
        <p className="mt-3 text-center font-mono text-[10px] uppercase tracking-[0.12em] text-fog">
          Safety gates run again at click time. No fake receipt.
        </p>
      )}
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
