"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/tminus/utils";

/**
 * The chronograph dial — T-MINUS's signature instrument.
 *
 * The full ring is the conversion window (opens at 12 o'clock, closes
 * at 12 o'clock). The lime arc is the time REMAINING; the needle is
 * "now". Center content is layered HTML for crisp typography.
 */

const R = 240 / 2;

function polar(cx: number, cy: number, r: number, deg: number) {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function arcPath(cx: number, cy: number, r: number, fromDeg: number, toDeg: number) {
  const start = polar(cx, cy, r, fromDeg);
  const end = polar(cx, cy, r, toDeg);
  const large = Math.abs(toDeg - fromDeg) > 180 ? 1 : 0;
  const sweep = toDeg > fromDeg ? 1 : 0;
  return `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} A ${r} ${r} 0 ${large} ${sweep} ${end.x.toFixed(2)} ${end.y.toFixed(2)}`;
}

export function Dial({
  /** 0..1 fraction of the window elapsed; null renders the dial inert */
  elapsed,
  size = 260,
  tone = "lime",
  centerTop,
  centerSub,
  centerFooter,
  className,
  ariaLabel,
}: {
  elapsed: number | null;
  size?: number;
  tone?: "lime" | "amber" | "bone";
  centerTop: ReactNode;
  centerSub?: ReactNode;
  centerFooter?: ReactNode;
  className?: string;
  ariaLabel?: string;
}) {
  const e = elapsed == null ? 0.32 : Math.min(1, Math.max(0, elapsed));
  const needleDeg = 360 * e;
  const arcColor = tone === "lime" ? "var(--color-lime)" : tone === "amber" ? "var(--color-amber)" : "var(--color-bone)";

  const ticks = Array.from({ length: 60 }, (_, i) => {
    const major = i % 5 === 0;
    const deg = 6 * i;
    const outer = polar(R, R, 108, deg);
    const inner = polar(R, R, major ? 96 : 101, deg);
    return (
      <line
        key={i}
        x1={inner.x}
        y1={inner.y}
        x2={outer.x}
        y2={outer.y}
        stroke="var(--color-ink)"
        strokeWidth={major ? 3 : 1.6}
        opacity={major ? 0.85 : 0.45}
      />
    );
  });

  return (
    <div
      className={cn("relative select-none", className)}
      style={{ width: size, height: size }}
      role="img"
      aria-label={ariaLabel}
    >
      <svg viewBox="0 0 240 240" className="absolute inset-0 h-full w-full">
        {/* face */}
        <circle cx={R} cy={R} r={116} fill="var(--color-paper)" stroke="var(--color-ink)" strokeWidth={3.5} />
        {/* elapsed track */}
        <circle cx={R} cy={R} r={86} fill="none" stroke="var(--color-ink)" strokeWidth={13} opacity={0.14} />
        {/* elapsed arc */}
        {e > 0.001 ? (
          <path
            d={arcPath(R, R, 86, 0, needleDeg)}
            fill="none"
            stroke="var(--color-ink)"
            strokeWidth={13}
            opacity={0.35}
          />
        ) : null}
        {/* remaining arc */}
        {e < 0.999 ? (
          <path
            d={arcPath(R, R, 86, needleDeg, 360)}
            fill="none"
            stroke={arcColor}
            strokeWidth={13}
          />
        ) : null}
        {ticks}
        {/* needle */}
        {(() => {
          const tip = polar(R, R, 80, needleDeg);
          return (
            <>
              <line
                x1={R}
                y1={R}
                x2={tip.x}
                y2={tip.y}
                stroke="var(--color-ink)"
                strokeWidth={3.5}
                strokeLinecap="round"
              />
              <circle cx={R} cy={R} r={6} fill="var(--color-ink)" />
            </>
          );
        })()}
        {/* T–0 marker at 12 o'clock */}
        <polygon points={`${R - 5},${R - 128} ${R + 5},${R - 128} ${R},${R - 118}`} fill="var(--color-ink)" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <div className="font-display uppercase leading-none text-ink" style={{ fontSize: size * 0.135 }}>
          {centerTop}
        </div>
        {centerSub ? (
          <div
            className="mt-2 font-mono font-semibold uppercase tracking-[0.18em] text-ink/70"
            style={{ fontSize: Math.max(10, size * 0.036) }}
          >
            {centerSub}
          </div>
        ) : null}
        {centerFooter ? (
          <div
            className="mt-1 font-mono font-bold tabular text-ink"
            style={{ fontSize: Math.max(10, size * 0.048) }}
          >
            {centerFooter}
          </div>
        ) : null}
      </div>
    </div>
  );
}
