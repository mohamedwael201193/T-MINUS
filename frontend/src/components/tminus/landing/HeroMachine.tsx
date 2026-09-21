"use client";

import type { LifecycleAsset, MarketSnapshot } from "@/lib/tminus/domain/types";
import { fmtDate, fmtRatio, fmtUsd } from "@/lib/tminus/utils";
import { Countdown, useElapsedFraction } from "@/components/tminus/system/Countdown";

/**
 * THE CONVERSION INSTRUMENT — T-MINUS's signature illustration.
 *
 * A PreStocks token sits on a transit rail that runs through a live
 * chronograph dial (the window clock) toward its destination token.
 * Everything is drawn in the page's own ink/lime/bone language so it
 * feels built into the product, not pasted on top of it.
 *
 * Live elements: countdown center, remaining-time arc, executable
 * ratio readout, and the token shuttling along the rail (SMIL).
 */
export function HeroMachine({
  asset,
  market,
}: {
  asset: LifecycleAsset;
  market: MarketSnapshot;
}) {
  const elapsed = useElapsedFraction(asset.windowOpenedAt, asset.windowClosesAt);
  const e = elapsed == null ? 0.37 : elapsed;

  // dial geometry
  const cx = 360;
  const cy = 230;
  const rBand = 88;
  const polar = (deg: number, r: number) => {
    const rad = ((deg - 90) * Math.PI) / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  };
  const arc = (from: number, to: number, r: number) => {
    const a = polar(from, r);
    const b = polar(to, r);
    const large = Math.abs(to - from) > 180 ? 1 : 0;
    return `M ${a.x.toFixed(1)} ${a.y.toFixed(1)} A ${r} ${r} 0 ${large} 1 ${b.x.toFixed(1)} ${b.y.toFixed(1)}`;
  };
  const needle = polar(360 * e, 78);
  const ticks = Array.from({ length: 60 }, (_, i) => {
    const major = i % 5 === 0;
    const deg = 6 * i;
    const o = polar(deg, 112);
    const inn = polar(deg, major ? 100 : 105);
    return { x1: inn.x, y1: inn.y, x2: o.x, y2: o.y, major };
  });

  const ratio = market.executableRatio;

  return (
    <div className="relative w-full">
      <svg
        viewBox="0 0 720 560"
        className="h-auto w-full drop-shadow-[0_2px_0_rgba(17,16,13,0.04)]"
        role="img"
        aria-label="A PreStocks token traveling along a rail through a live countdown dial toward its public-stock destination"
      >
        {/* corner registration marks */}
        {[
          [28, 28],
          [692, 28],
          [28, 532],
          [692, 532],
        ].map(([x, y]) => (
          <g key={`${x}-${y}`} stroke="var(--color-ink)" strokeWidth={1.6} opacity={0.4}>
            <line x1={x - 7} y1={y} x2={x + 7} y2={y} />
            <line x1={x} y1={y - 7} x2={x} y2={y + 7} />
          </g>
        ))}

        {/* concentric instrument geometry behind the dial */}
        <g fill="none" stroke="var(--color-ink)" opacity={0.09}>
          <circle cx={cx} cy={cy} r={158} strokeDasharray="2 7" />
          <circle cx={cx} cy={cy} r={192} strokeDasharray="2 7" />
        </g>

        {/* dashed "rule" arc over the top — the target route */}
        <path
          d="M 135 168 C 240 48, 480 48, 585 168"
          fill="none"
          stroke="var(--color-ink)"
          strokeWidth={2}
          strokeDasharray="3 7"
          opacity={0.35}
        />

        {/* the rail */}
        <line x1={34} y1={330} x2={686} y2={330} stroke="var(--color-ink)" strokeWidth={4.5} />
        {Array.from({ length: 20 }, (_, i) => 34 + i * 34.3).map((x) => (
          <line key={x} x1={x} y1={336} x2={x} y2={344} stroke="var(--color-ink)" strokeWidth={1.6} opacity={0.3} />
        ))}

        {/* traveler token — shuttles toward the destination, forever */}
        <g>
          <g>
            <animateMotion
              dur="13s"
              repeatCount="indefinite"
              path="M 238 330 L 654 330"
              keyPoints="0;1"
              keyTimes="0;1"
              calcMode="linear"
            />
            <animate attributeName="opacity" values="0;1;1;1;0" keyTimes="0;0.06;0.5;0.94;1" dur="13s" repeatCount="indefinite" />
            <rect x={-14} y={316} width={28} height={28} rx={8} fill="var(--color-paper)" stroke="var(--color-ink)" strokeWidth={2.5} />
            <text
              x={0}
              y={335}
              textAnchor="middle"
              fill="var(--color-ink)"
              fontSize={11}
              fontWeight={800}
              style={{ fontFamily: "var(--font-grotesk), sans-serif" }}
            >
              SP
            </text>
          </g>
        </g>

        {/* left station — the PreStock */}
        <g>
          <rect x={52} y={196} width={176} height={196} rx={16} fill="var(--color-ink)" opacity={0.9} />
          <rect x={47} y={191} width={176} height={196} rx={16} fill="var(--color-paper)" stroke="var(--color-ink)" strokeWidth={3} />
          <rect x={63} y={207} width={86} height={21} rx={10.5} fill="var(--color-ink)" />
          <text x={106} y={221.5} textAnchor="middle" fill="var(--color-bone)" fontSize={10.5} fontWeight={700} letterSpacing={2} style={{ fontFamily: "var(--font-jbmono), monospace" }}>
            PRESTOCK
          </text>
          <text x={63} y={266} fill="var(--color-ink)" fontSize={34} style={{ fontFamily: "var(--font-anton), sans-serif" }}>
            {asset.symbol}
          </text>
          <text x={63} y={292} fill="var(--color-ink)" fontSize={15} fontWeight={700} style={{ fontFamily: "var(--font-jbmono), monospace" }}>
            {fmtUsd(asset.price)}
          </text>
          <rect x={63} y={306} width={30} height={30} rx={8} fill="var(--color-bone)" stroke="var(--color-ink)" strokeWidth={2.5} />
          <text x={78} y={326} textAnchor="middle" fill="var(--color-ink)" fontSize={10.5} fontWeight={800} style={{ fontFamily: "var(--font-grotesk), sans-serif" }}>
            SP
          </text>
          <text x={101} y={326} fill="var(--color-ink)" fontSize={10.5} opacity={0.7} letterSpacing={0.5} className="machine-micro" style={{ fontFamily: "var(--font-jbmono), monospace" }}>
            T-2022 · FEE 1%
          </text>
          <text x={63} y={368} fill="var(--color-ink)" fontSize={10.5} opacity={0.6} letterSpacing={0.5} className="machine-micro" style={{ fontFamily: "var(--font-jbmono), monospace" }}>
            {asset.holders.toLocaleString()} HOLDERS
          </text>
        </g>

        {/* center — the chronograph dial */}
        <g>
          <circle cx={cx} cy={cy} r={120} fill="var(--color-paper)" stroke="var(--color-ink)" strokeWidth={3.5} />
          <circle cx={cx} cy={cy} r={rBand} fill="none" stroke="var(--color-ink)" strokeWidth={13} opacity={0.12} />
          {/* elapsed */}
          <path d={arc(0, 360 * e, rBand)} fill="none" stroke="var(--color-ink)" strokeWidth={13} opacity={0.32} />
          {/* remaining */}
          {e < 0.999 ? (
            <path d={arc(360 * e, 359.9, rBand)} fill="none" stroke="var(--color-lime)" strokeWidth={13} />
          ) : null}
          {/* ticks */}
          {ticks.map((t, i) => (
            <line
              key={i}
              x1={t.x1}
              y1={t.y1}
              x2={t.x2}
              y2={t.y2}
              stroke="var(--color-ink)"
              strokeWidth={t.major ? 2.6 : 1.4}
              opacity={t.major ? 0.85 : 0.4}
            />
          ))}
          {/* needle + hub */}
          <line x1={cx} y1={cy} x2={needle.x} y2={needle.y} stroke="var(--color-ink)" strokeWidth={3.5} strokeLinecap="round" />
          <circle cx={cx} cy={cy} r={6} fill="var(--color-ink)" />
          {/* T-0 crown marker */}
          <polygon points={`${cx - 6},${cy - 132} ${cx + 6},${cy - 132} ${cx},${cy - 121}`} fill="var(--color-ink)" />
          {/* center readouts */}
          <text x={cx} y={cy + 2} textAnchor="middle" fill="var(--color-ink)" fontSize={44} style={{ fontFamily: "var(--font-anton), sans-serif" }}>
            <Countdown to={asset.windowClosesAt ?? ""} format="days" />
          </text>
          <text x={cx} y={cy + 22} textAnchor="middle" fill="var(--color-ink)" fontSize={10.5} opacity={0.8} letterSpacing={1.6} className="machine-micro" style={{ fontFamily: "var(--font-jbmono), monospace" }}>
            TO CONVERSION DEADLINE
          </text>
          <text x={cx} y={cy + 44} textAnchor="middle" fill="var(--color-ink)" fontSize={13} fontWeight={700} style={{ fontFamily: "var(--font-jbmono), monospace" }}>
            {asset.windowClosesAt ? fmtDate(asset.windowClosesAt) : "—"}
          </text>
        </g>

        {/* the gate — where the rail passes through the dial */}
        <g stroke="var(--color-ink)" strokeWidth={2.5}>
          <line x1={292} y1={314} x2={292} y2={346} />
          <line x1={428} y1={314} x2={428} y2={346} />
          <rect x={287.5} y={308} width={9} height={7} fill="var(--color-lime)" />
          <rect x={423.5} y={308} width={9} height={7} fill="var(--color-lime)" />
        </g>

        {/* executable ratio readout on the rail */}
        <g>
          <rect x={281} y={352} width={164} height={34} rx={17} fill="var(--color-ink)" />
          <circle cx={299} cy={369} r={3.5} fill="var(--color-lime)">
            <animate attributeName="opacity" values="1;0.25;1" dur="1.6s" repeatCount="indefinite" />
          </circle>
          <text x={374} y={373.5} textAnchor="middle" fill="var(--color-lime)" fontSize={13} fontWeight={700} style={{ fontFamily: "var(--font-jbmono), monospace" }}>
            EXEC {ratio != null ? fmtRatio(ratio) : "—"}
          </text>
        </g>

        {/* right station — the destination (ink card, lime shadow) */}
        <g transform="rotate(1.4 586 290)">
          <rect x={502} y={196} width={176} height={196} rx={16} fill="var(--color-lime)" />
          <rect x={496} y={190} width={176} height={196} rx={16} fill="var(--color-ink)" stroke="var(--color-ink)" strokeWidth={3} />
          <rect x={512} y={206} width={112} height={21} rx={10.5} fill="var(--color-lime)" />
          <text x={568} y={220.5} textAnchor="middle" fill="var(--color-ink)" fontSize={10.5} fontWeight={700} letterSpacing={2} style={{ fontFamily: "var(--font-jbmono), monospace" }}>
            DESTINATION
          </text>
          <text x={512} y={266} fill="var(--color-bone)" fontSize={36} style={{ fontFamily: "var(--font-anton), sans-serif" }}>
            {asset.destinationSymbol}
          </text>
          <text x={512} y={292} fill="var(--color-lime)" fontSize={15} fontWeight={700} style={{ fontFamily: "var(--font-jbmono), monospace" }}>
            {asset.destinationPrice != null ? fmtUsd(asset.destinationPrice) : "—"} · PUBLIC
          </text>
          <text x={512} y={326} fill="var(--color-bone)" fontSize={10} opacity={0.65} letterSpacing={1} className="machine-micro" style={{ fontFamily: "var(--font-jbmono), monospace" }}>
            ISSUER-PRESCRIBED
          </text>
          <text x={512} y={344} fill="var(--color-bone)" fontSize={10} opacity={0.65} letterSpacing={1} className="machine-micro" style={{ fontFamily: "var(--font-jbmono), monospace" }}>
            CONVERSION DESTINATION
          </text>
          <text x={512} y={372} fill="var(--color-bone)" fontSize={10} opacity={0.65} letterSpacing={1} className="machine-micro" style={{ fontFamily: "var(--font-jbmono), monospace" }}>
            PARITY 1:1 AT FULL UNLOCK
          </text>
        </g>

        {/* floating rule chips */}
        <g>
          {/* TARGET */}
          <path d="M 150 112 L 205 316" fill="none" stroke="var(--color-ink)" strokeWidth={1.6} strokeDasharray="3 6" opacity={0.4} />
          <rect x={84} y={80} width={132} height={32} rx={16} fill="var(--color-ink)" opacity={0.9} />
          <rect x={80} y={76} width={132} height={32} rx={16} fill="var(--color-lime)" stroke="var(--color-ink)" strokeWidth={2.5} />
          <text x={146} y={96.5} textAnchor="middle" fill="var(--color-ink)" fontSize={11} fontWeight={700} style={{ fontFamily: "var(--font-jbmono), monospace" }}>
            TARGET ≥ 0.820
          </text>
          {/* FLOOR */}
          <path d="M 545 100 L 505 316" fill="none" stroke="var(--color-ink)" strokeWidth={1.6} strokeDasharray="3 6" opacity={0.4} />
          <rect x={494} y={66} width={112} height={32} rx={16} fill="var(--color-paper)" stroke="var(--color-coral)" strokeWidth={2.5} />
          <text x={550} y={86.5} textAnchor="middle" fill="var(--color-coral)" fontSize={11} fontWeight={700} style={{ fontFamily: "var(--font-jbmono), monospace" }}>
            FLOOR 0.700
          </text>
          {/* KEEPER */}
          <path d="M 560 155 L 476 205" fill="none" stroke="var(--color-ink)" strokeWidth={1.6} strokeDasharray="3 6" opacity={0.4} />
          <rect x={548} y={138} width={162} height={32} rx={16} fill="var(--color-ink)" />
          <circle cx={568} cy={154} r={3.5} fill="var(--color-lime)">
            <animate attributeName="opacity" values="1;0.25;1" dur="1.6s" repeatCount="indefinite" />
          </circle>
          <text x={662} y={158} textAnchor="end" fill="var(--color-bone)" fontSize={11} fontWeight={700} letterSpacing={0.8} style={{ fontFamily: "var(--font-jbmono), monospace" }}>
            KEEPER WATCHING
          </text>
        </g>

        {/* receipt stub — the promise of proof */}
        <g transform="rotate(-3 610 480)">
          <path d="M 574 468 L 646 468 L 646 508 L 637 502 L 628 508 L 619 502 L 610 508 L 601 502 L 592 508 L 583 502 L 574 508 Z" fill="var(--color-paper)" stroke="var(--color-ink)" strokeWidth={2.5} strokeLinejoin="round" />
          <line x1={584} y1={478} x2={636} y2={478} stroke="var(--color-ink)" strokeWidth={1.6} opacity={0.5} />
          <line x1={584} y1={486} x2={626} y2={486} stroke="var(--color-ink)" strokeWidth={1.6} opacity={0.3} />
          <line x1={584} y1={494} x2={631} y2={494} stroke="var(--color-ink)" strokeWidth={1.6} opacity={0.3} />
          <rect x={582} y={469} width={4} height={38} fill="var(--color-lime)" />
        </g>
        <text x={610} y={532} textAnchor="middle" fill="var(--color-ink)" fontSize={10} opacity={0.6} letterSpacing={1.2} className="machine-micro" style={{ fontFamily: "var(--font-jbmono), monospace" }}>
          EVERY FILL LEAVES PROOF
        </text>
      </svg>
    </div>
  );
}
