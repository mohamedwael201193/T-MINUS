"use client";

import { cn } from "@/lib/tminus/utils";
import type { RatioPoint } from "@/lib/tminus/domain/types";

/**
 * Compact executable-ratio history — an instrument trace, not a
 * trading chart. Scales to its own min/max with padding.
 */
export function RatioSpark({
  history,
  height = 64,
  targetLine,
  className,
}: {
  history: RatioPoint[];
  height?: number;
  targetLine?: number;
  className?: string;
}) {
  const W = 300;
  const H = 64;
  const values = history.map((p) => p.v);
  const min = values.length > 0 ? Math.min(...values) : 0.74;
  const max = values.length > 0 ? Math.max(...values) : 0.8;
  const pad = Math.max((max - min) * 0.25, 0.0015);
  const lo = min - pad;
  const hi = max + pad;
  const x = (i: number) => (i / Math.max(1, history.length - 1)) * W;
  const y = (v: number) => H - ((v - lo) / (hi - lo)) * H;

  const line = history.map((p, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(1)} ${y(p.v).toFixed(1)}`).join(" ");
  const area =
    history.length > 0
      ? `${line} L ${W} ${H} L 0 ${H} Z`
      : "";
  const last = history[history.length - 1];

  return (
    <div className={cn("relative w-full", className)} aria-label="Executable ratio history">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="block w-full"
        style={{ height }}
        role="img"
        aria-label="Executable ratio, recent history"
      >
        {targetLine != null ? (
          <line
            x1={0}
            x2={W}
            y1={y(targetLine)}
            y2={y(targetLine)}
            stroke="var(--color-ink)"
            strokeWidth={1.5}
            strokeDasharray="4 4"
            opacity={0.45}
            vectorEffect="non-scaling-stroke"
          />
        ) : null}
        {area ? <path d={area} fill="var(--color-ink)" opacity={0.07} /> : null}
        {line ? (
          <path
            d={line}
            fill="none"
            stroke="var(--color-ink)"
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        ) : null}
        {last ? (
          <circle cx={x(history.length - 1)} cy={y(last.v)} r={3.5} fill="var(--color-lime)" stroke="var(--color-ink)" strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
        ) : null}
      </svg>
      <div className="pointer-events-none absolute left-1.5 top-1 font-mono text-[10px] tabular text-fog">
        {max.toFixed(4)}
      </div>
      <div className="pointer-events-none absolute bottom-1 left-1.5 font-mono text-[10px] tabular text-fog">
        {min.toFixed(4)}
      </div>
    </div>
  );
}
