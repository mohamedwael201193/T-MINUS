"use client";

import { useTMinus, useTMinusVersion } from "@/lib/tminus/adapters/context";
import { fmtCount, fmtDate, fmtRatio, fmtUsd, truncMid } from "@/lib/tminus/utils";
import { SPACEX_ASSET_ID } from "@/lib/tminus/data/lifecycleData";
import { Label, Panel, Stat } from "@/components/tminus/system/primitives";
import { Countdown, useElapsedFraction } from "@/components/tminus/system/Countdown";
import { Dial } from "@/components/tminus/system/Dial";
import { RatioSpark } from "@/components/tminus/system/Sparkline";
import { cn } from "@/lib/tminus/utils";

/**
 * The active lifecycle card — one asset, one clock, one live ratio.
 * "One token = one lifecycle" is enforced literally: the switcher
 * changes which clock you're looking at, nothing else.
 */
export function LifecyclePanel() {
  useTMinusVersion();
  const src = useTMinus();
  const assets = src.listAssets();
  const assetId =
    typeof src.getSelectedAssetId === "function" ? src.getSelectedAssetId() : "spacex";
  const asset = src.getAsset(assetId) ?? src.getAsset(SPACEX_ASSET_ID) ?? assets[0];
  const market = src.getMarket(asset?.id ?? SPACEX_ASSET_ID);
  const wallet = src.getWallet();
  const action = src.getAction(asset?.id ?? SPACEX_ASSET_ID);

  if (!asset) {
    return (
      <Panel tone="paper" shadow="lg" className="p-8">
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-fog">
          Loading PreStocks lifecycle…
        </p>
      </Panel>
    );
  }

  const stageLabel =
    asset.stage === "CONVERSION_WINDOW"
      ? "Window open"
      : asset.stage === "EXPIRED"
        ? "Expired"
        : "Terms pending";

  return (
    <Panel tone="paper" shadow="lg" className="overflow-hidden">
      {/* asset switcher */}
      <div className="flex items-center justify-between gap-3 border-b-2 border-ink/10 px-5 pt-4 md:px-6">
        <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Asset">
          {assets.map((a) => (
            <AssetTab
              key={a.id}
              active={asset.id === a.id}
              onClick={() => src.selectAsset?.(a.id)}
              label={a.symbol}
              live={a.stage === "CONVERSION_WINDOW"}
            />
          ))}
        </div>
        <span
          className={cn(
            "mb-3 inline-flex items-center gap-1.5 rounded-full border-2 px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.12em]",
            asset.stage === "CONVERSION_WINDOW"
              ? "border-ink bg-lime text-ink"
              : asset.stage === "EXPIRED"
                ? "border-ink bg-coral text-ink"
                : "border-ink bg-amber text-ink",
          )}
        >
          {asset.stage === "CONVERSION_WINDOW" ? (
            <>
              <span className="h-1.5 w-1.5 rounded-full bg-ink animate-blink" aria-hidden />
              {stageLabel}
            </>
          ) : (
            stageLabel
          )}
        </span>
      </div>

      <div className="p-5 md:p-6">
        {asset.stage === "CONVERSION_WINDOW" ? (
          <SpacexLifecycle
            key={asset.id}
            symbol={asset.symbol}
            price={asset.price}
            destinationPrice={asset.destinationPrice}
            destinationSymbol={asset.destinationSymbol}
            holders={asset.holders}
            transferFeeBps={asset.transferFeeBps}
            windowOpenedAt={asset.windowOpenedAt}
            windowClosesAt={asset.windowClosesAt}
            market={market}
            tranches={asset.tranches}
            verificationState={asset.verificationState}
            sourceUrl={asset.sourceUrl}
            fetchedAt={asset.fetchedAt}
            executionAvailability={asset.executionAvailability}
            mint={asset.mint}
            destinationMint={asset.destinationMint}
            issuerPageUrl={asset.issuerPageUrl}
            inOfficialCatalog={asset.inOfficialCatalog}
            sourceHash={asset.sourceHash}
            markPrice={asset.markPrice}
            holdDisplay={wallet.connected ? wallet.balances?.SPACEX ?? 0 : null}
            statusLabel={
              wallet.connected && (wallet.balances?.SPACEX ?? 0) <= 0
                ? "INSUFFICIENT_BALANCE"
                : action?.stage === "CONVERSION_WINDOW" && action.refusals.length === 0
                  ? "READY"
                  : action?.refusals[0] ?? asset.executionAvailability ?? "WAITING"
            }
          />
        ) : asset.stage === "EXPIRED" ? (
          <ExpiredLifecycle
            key={asset.id}
            symbol={asset.symbol}
            price={asset.price}
            holders={asset.holders}
            note={asset.stageNote}
            deadline={asset.windowClosesAt}
            sourceUrl={asset.sourceUrl}
            mint={asset.mint}
            issuerPageUrl={asset.issuerPageUrl}
            inOfficialCatalog={asset.inOfficialCatalog}
            actionType={action?.actionType ?? "ACQUISITION"}
            holdDisplay={wallet.connected ? wallet.balances?.SPACEX ?? 0 : null}
          />
        ) : (
          <OpenaiLifecycle
            key={asset.id}
            symbol={asset.symbol}
            price={asset.price}
            markPrice={asset.markPrice}
            holders={asset.holders}
            note={asset.stageNote}
            mint={asset.mint}
            issuerPageUrl={asset.issuerPageUrl}
            inOfficialCatalog={asset.inOfficialCatalog}
          />
        )}
      </div>
    </Panel>
  );
}

/* ------------------------------- SPACEX --------------------------------- */

function SpacexLifecycle(props: {
  symbol: string;
  price: number;
  destinationPrice: number | null;
  destinationSymbol: string;
  holders: number;
  transferFeeBps: number;
  windowOpenedAt: string | null;
  windowClosesAt: string | null;
  market: ReturnType<ReturnType<typeof useTMinus>["getMarket"]>;
  tranches: { date: string; label: string; detail: string }[];
  verificationState?: string;
  sourceUrl?: string;
  fetchedAt?: string;
  executionAvailability?: string;
  mint?: string;
  destinationMint?: string;
  issuerPageUrl?: string;
  inOfficialCatalog?: boolean;
  sourceHash?: string | null;
  markPrice?: number;
  holdDisplay?: number | null;
  statusLabel?: string;
}) {
  const elapsed = useElapsedFraction(props.windowOpenedAt, props.windowClosesAt);
  const ratio = props.market.executableRatio;
  const discount = ratio != null ? (1 - ratio) * 100 : null;
  const markPremium =
    props.markPrice && props.markPrice > 0 && props.price > 0
      ? ((props.price - props.markPrice) / props.markPrice) * 100
      : null;

  return (
    <div>
      <PositionStrip
        hold={props.holdDisplay}
        action="GOING PUBLIC"
        deadline={props.windowClosesAt}
        destination={props.destinationSymbol}
        executable={ratio}
        feeBps={props.transferFeeBps}
        status={props.statusLabel ?? "WAITING"}
      />
      {/* identity row */}
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-baseline gap-3">
            <h2 className="font-display text-[2.6rem] uppercase leading-none text-ink">
              {props.symbol}
            </h2>
            <span className="font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-fog">
              → {props.destinationSymbol}
            </span>
          </div>
          <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.12em] text-fog">
            {props.symbol} PreStock · issuer-prescribed destination · {fmtCount(props.holders)} holders
            {props.inOfficialCatalog === false ? " · metrics-only" : ""}
          </p>
          {props.mint ? (
            <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.1em] text-fog-2">
              Mint {truncMid(props.mint, 6, 4)}
              {props.destinationMint ? ` · dst ${truncMid(props.destinationMint, 6, 4)}` : ""}
            </p>
          ) : null}
        </div>
        <Dial
          elapsed={elapsed}
          size={148}
          centerTop={<Countdown to={props.windowClosesAt ?? ""} format="days" />}
          centerSub="to deadline"
          centerFooter={props.windowClosesAt ? fmtDate(props.windowClosesAt) : "—"}
          ariaLabel="Conversion window clock"
        />
      </div>

      {/* market event banner */}
      {props.market.event ? (
        <div
          role="status"
          className="mt-5 flex items-center gap-3 rounded-xl border-2 border-ink bg-amber px-4 py-3 animate-banner-in"
        >
          <span
            aria-hidden
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-ink bg-paper"
          >
            <svg width="13" height="13" viewBox="0 0 13 13">
              <path d="M6.5 1.5L12 11.5H1L6.5 1.5z" fill="none" stroke="var(--color-ink)" strokeWidth="1.8" strokeLinejoin="round" />
            </svg>
          </span>
          <div>
            <p className="font-mono text-[10.5px] font-bold uppercase tracking-[0.12em] text-ink">
              Market · {props.market.event.label}
            </p>
            <p className="mt-0.5 font-mono text-[10px] tracking-[0.04em] text-ink/70">
              {props.market.event.detail}
            </p>
          </div>
        </div>
      ) : null}

      {/* stats */}
      <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-6 border-t-2 border-dashed border-ink/15 pt-6 sm:grid-cols-3">
        <Stat label="PreStock price" value={fmtUsd(props.price)} />
        <Stat
          label="Mark price"
          value={props.markPrice && props.markPrice > 0 ? fmtUsd(props.markPrice) : "—"}
        />
        <Stat
          label="Vs mark"
          value={markPremium != null ? `${markPremium.toFixed(1)}%` : "—"}
          valueClassName={markPremium != null && markPremium < 0 ? "text-coral-ink" : undefined}
        />
        <Stat
          label={`Destination · ${props.destinationSymbol}`}
          value={props.destinationPrice != null ? fmtUsd(props.destinationPrice) : "—"}
        />
        <div>
          <span className="mlabel text-fog">Executable ratio</span>
          <span className="mt-1.5 inline-block rounded-md bg-lime px-1.5 font-mono text-lg font-bold tabular leading-tight text-ink">
            {ratio != null ? fmtRatio(ratio) : "—"}
          </span>
          <span className="mt-1 block font-mono text-[10px] tracking-[0.06em] text-fog">
            {props.transferFeeBps > 0 ? `after ${props.transferFeeBps / 100}% transfer fee` : "fee unknown until mint snapshot"}
          </span>
        </div>
        <Stat
          label="Discount to parity"
          value={discount != null ? `${discount.toFixed(1)}%` : "—"}
          valueClassName="text-coral-ink"
        />
        <div className="flex flex-col gap-1.5">
          <Label>Time to deadline</Label>
          <Countdown to={props.windowClosesAt ?? ""} className="text-lg text-ink" />
          <span className="font-mono text-[10px] tracking-[0.06em] text-fog">
            hard expiry — tokens expire worthless
          </span>
        </div>
        <Stat
          label="Transfer fee"
          value={props.transferFeeBps > 0 ? `${props.transferFeeBps / 100}%` : "UNKNOWN"}
          sub="Token-2022 · priced in"
        />
      </div>

      <div className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 rounded-xl border-2 border-ink/15 bg-bone/40 px-4 py-3 sm:grid-cols-4">
        <Stat label="Lifecycle" value={props.verificationState?.toUpperCase() ?? "UNKNOWN"} />
        <Stat label="Execution" value={props.executionAvailability ?? "UNKNOWN"} />
        <Stat
          label="Source"
          value={
            props.issuerPageUrl
              ? "Issuer page"
              : props.sourceUrl
                ? "PreStocks"
                : "—"
          }
        />
        <Stat
          label="Last verified"
          value={props.fetchedAt ? fmtDate(props.fetchedAt) : "—"}
          sub={props.sourceHash ? truncMid(props.sourceHash, 6, 4) : undefined}
        />
      </div>

      {/* sparkline */}
      <div className="mt-6 rounded-xl border-2 border-ink bg-bone/60 p-4">
        <div className="flex items-center justify-between">
          <Label>Executable ratio · live</Label>
          <span className="font-mono text-[11px] font-bold tabular text-ink">
            {ratio != null ? fmtRatio(ratio) : "—"}
          </span>
        </div>
        <RatioSpark history={props.market.history} height={58} className="mt-3" />
      </div>

      {/* tranche calendar */}
      <div className="mt-5">
        <Label>Lockup tranche calendar</Label>
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {props.tranches.length === 0 ? (
            <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-fog">
              No verified tranche calendar in the live feed
            </span>
          ) : (
            props.tranches.map((t) => (
              <span
                key={t.label}
                title={t.detail}
                className="cursor-default rounded-full border-2 border-ink/25 bg-paper px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-fog transition-colors hover:border-ink hover:text-ink"
              >
                {t.label}
              </span>
            ))
          )}
        </div>
        <p className="mt-2.5 font-mono text-[10px] uppercase leading-relaxed tracking-[0.08em] text-fog">
          Every tranche moves the ratio — hover a date for detail
        </p>
      </div>
    </div>
  );
}

/* ------------------------------- OPENAI --------------------------------- */

function OpenaiLifecycle(props: {
  symbol: string;
  price: number;
  markPrice: number;
  holders: number;
  note: string;
  mint?: string;
  issuerPageUrl?: string;
  inOfficialCatalog?: boolean;
}) {
  return (
    <div>
      <div className="flex items-baseline gap-3">
        <h2 className="font-display text-[2.6rem] uppercase leading-none text-ink">
          {props.symbol}
        </h2>
        <span className="rounded-full border-2 border-ink bg-amber px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-ink">
          Pre-IPO · watch
        </span>
      </div>
      <p className="mt-3 max-w-lg text-[13.5px] leading-relaxed text-fog">
        {props.note}
      </p>

      <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-6 border-t-2 border-dashed border-ink/15 pt-6 sm:grid-cols-3">
        <Stat label="PreStock price" value={fmtUsd(props.price)} />
        <Stat label="Issuer mark" value={props.markPrice > 0 ? fmtUsd(props.markPrice) : "UNKNOWN"} />
        <Stat label="Holders" value={fmtCount(props.holders)} />
        <Stat label="Mint" value={props.mint ? truncMid(props.mint, 6, 4) : "—"} />
        <Stat label="Catalog" value={props.inOfficialCatalog === false ? "Metrics-only" : "Official"} />
        <Stat label="Issuer page" value={props.issuerPageUrl ? "Linked" : "Unknown"} />
      </div>

      {/* watch rail */}
      <div className="mt-6 rounded-xl border-2 border-dashed border-ink/30 bg-bone/40 p-4">
        <Label>On the rail</Label>
        <div className="mt-3 flex items-center gap-2 overflow-x-auto scroll-thin pb-1">
          <span className="shrink-0 rounded-full border-2 border-ink bg-ink px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-bone">
            Issued ✓
          </span>
          <span aria-hidden className="font-bold text-ink/40">→</span>
          <span className="shrink-0 rounded-full border-2 border-ink/30 px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-fog">
            Terms
          </span>
          <span aria-hidden className="font-bold text-ink/40">→</span>
          <span className="shrink-0 rounded-full border-2 border-amber px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-ink">
            Window opens
          </span>
          <span aria-hidden className="font-bold text-ink/40">→</span>
          <span className="shrink-0 rounded-full border-2 border-ink/30 px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-fog">
            Deadline
          </span>
        </div>
        <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.1em] text-fog">
          No clock yet — the countdown starts when the issuer publishes terms.
        </p>
      </div>
    </div>
  );
}

function ExpiredLifecycle(props: {
  symbol: string;
  price: number;
  holders: number;
  note: string;
  deadline: string | null;
  sourceUrl?: string;
  mint?: string;
  issuerPageUrl?: string;
  inOfficialCatalog?: boolean;
  actionType?: string;
  holdDisplay?: number | null;
}) {
  return (
    <div>
      <PositionStrip
        hold={props.holdDisplay}
        action={props.actionType ?? "ACQUISITION"}
        deadline={props.deadline}
        destination="—"
        executable={null}
        feeBps={0}
        status="EXPIRED"
      />
      <div className="flex items-baseline gap-3">
        <h2 className="font-display text-[2.6rem] uppercase leading-none text-ink">
          {props.symbol}
        </h2>
        <span className="rounded-full border-2 border-ink bg-coral px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-ink">
          Window closed
        </span>
      </div>
      <p className="mt-3 max-w-lg text-[13.5px] leading-relaxed text-fog">{props.note}</p>
      <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-6 border-t-2 border-dashed border-ink/15 pt-6 sm:grid-cols-3">
        <Stat label="PreStock price" value={props.price > 0 ? fmtUsd(props.price) : "—"} />
        <Stat label="Holders" value={fmtCount(props.holders)} />
        <Stat label="Deadline" value={props.deadline ? fmtDate(props.deadline) : "—"} />
        <Stat label="Mint" value={props.mint ? truncMid(props.mint, 6, 4) : "—"} />
        <Stat label="Catalog" value={props.inOfficialCatalog === false ? "Metrics-only" : "Official"} />
        <Stat label="Issuer page" value={props.issuerPageUrl ? "Linked" : "Unknown"} />
      </div>
      <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.1em] text-fog">
        No signature requested · {props.issuerPageUrl ?? props.sourceUrl ?? "PreStocks issuer page"}
      </p>
    </div>
  );
}

function PositionStrip({
  hold,
  action,
  deadline,
  destination,
  executable,
  feeBps,
  status,
}: {
  hold: number | null | undefined;
  action: string;
  deadline: string | null | undefined;
  destination: string;
  executable: number | null;
  feeBps: number;
  status: string;
}) {
  return (
    <div className="mb-5 grid grid-cols-2 gap-2 rounded-xl border-2 border-ink bg-ink px-3 py-3 sm:grid-cols-4 lg:grid-cols-7">
      <PosCell label="You hold" value={hold == null ? "Connect" : hold > 0 ? hold.toFixed(6).replace(/0+$/, "").replace(/\.$/, "") : "0"} />
      <PosCell label="Corporate action" value={action} />
      <PosCell label="Deadline" value={deadline ? fmtDate(deadline) : "—"} />
      <PosCell label="Default exit" value={destination} />
      <PosCell label="Executable" value={executable != null ? fmtRatio(executable) : "—"} />
      <PosCell label="Transfer fee" value={feeBps > 0 ? `${feeBps / 100}%` : "—"} />
      <PosCell label="Status" value={status} accent />
    </div>
  );
}

function PosCell({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <p className="font-mono text-[8px] font-bold uppercase tracking-[0.14em] text-bone-dim">{label}</p>
      <p className={`mt-1 truncate font-mono text-[10px] font-bold uppercase tracking-[0.06em] ${accent ? "text-lime" : "text-bone"}`}>
        {value}
      </p>
    </div>
  );
}

/* ------------------------------ switcher -------------------------------- */

function AssetTab({
  active,
  onClick,
  label,
  live = false,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  live?: boolean;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "relative mb-3 rounded-t-lg border-b-2 px-3.5 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.14em] transition-colors",
        active
          ? "border-b-ink text-ink"
          : "border-b-transparent text-fog-2 hover:text-fog",
      )}
    >
      {label}
      {live ? (
        <span className="absolute -right-1 -top-0.5 h-1.5 w-1.5 rounded-full bg-lime animate-pulse-ring" aria-hidden />
      ) : null}
    </button>
  );
}
