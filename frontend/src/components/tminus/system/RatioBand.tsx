"use client";

import { cn, clamp, fmtRatio } from "@/lib/tminus/utils";

/**
 * The executable-ratio spectrum: floor (coral) · live needle (ink) ·
 * target (lime). One picture of "where am I, what do I need, what
 * will I accept" — used by the ticket summary and order detail.
 */
export function RatioBand({
  min = 0.7,
  max = 0.85,
  floor,
  target,
  current,
  compact = false,
  className,
}: {
  min?: number;
  max?: number;
  floor: number;
  target: number;
  current: number | null;
  compact?: boolean;
  className?: string;
}) {
  const pos = (v: number) => `${clamp(((v - min) / (max - min)) * 100, 2, 98)}%`;
  const inRange = current != null && current >= min - 0.02 && current <= max + 0.02;
  // collision guard: stack markers vertically when floor and target sit close
  const collide =
    (parseFloat(pos(target)) - parseFloat(pos(floor))) < 18;

  return (
    <div className={cn("w-full", className)} aria-label="Executable ratio spectrum">
      <div className={cn("relative", compact ? "h-14" : "h-20")}>
        {/* current value bubble */}
        {inRange ? (
          <div
            className="absolute -top-0.5 z-10 -translate-x-1/2 transition-all duration-500 ease-out"
            style={{ left: pos(current as number) }}
          >
            <span className="inline-block whitespace-nowrap rounded-md border-2 border-ink bg-ink px-1.5 py-0.5 font-mono text-[10px] font-bold tabular text-lime">
              {fmtRatio(current as number)}
            </span>
            <span className="mx-auto block h-1 w-[2px] bg-ink" />
          </div>
        ) : null}

        {/* track */}
        <div
          className={cn(
            "absolute inset-x-0 w-full rounded-full border-2 border-ink bg-paper",
            compact ? "top-6" : "top-8",
            "h-3",
          )}
        >
          {/* below-floor zone */}
          <div
            className="absolute bottom-0 left-0 top-0 rounded-l-full bg-coral/20"
            style={{ width: pos(floor) }}
          />
          {/* at-or-above-target zone */}
          <div
            className="absolute bottom-0 right-0 top-0 rounded-r-full bg-lime/35"
            style={{ width: `${100 - parseFloat(pos(target))}%` }}
          />
        </div>

        {/* needle */}
        {inRange ? (
          <div
            className={cn(
              "absolute z-10 -translate-x-1/2 transition-all duration-500 ease-out",
              compact ? "top-6" : "top-8",
            )}
            style={{ left: pos(current as number) }}
          >
            <span className="block h-3 w-[3px] -translate-x-[1px] bg-ink" />
            <span className="mt-0.5 block h-1.5 w-1.5 -translate-x-[3px] rounded-full bg-ink" />
          </div>
        ) : null}

        {/* floor marker */}
        <div
          className={cn("absolute transition-all duration-500", compact ? "top-6" : "top-8")}
          style={{ left: pos(floor) }}
        >
          <span className="block h-5 w-[2px] bg-coral" />
          <span
            className={cn(
              "absolute left-0 -translate-x-0 whitespace-nowrap font-mono text-[10px] font-bold tracking-[0.08em] text-coral-ink",
              "top-5",
            )}
          >
            FLOOR {fmtRatio(floor, 3)}
          </span>
        </div>

        {/* target marker */}
        <div
          className={cn("absolute transition-all duration-500", compact ? "top-6" : "top-8")}
          style={{ left: pos(target) }}
        >
          <span className="block h-5 w-[2px] bg-ink" />
          <span
            className={cn(
              "absolute right-0 translate-x-0 whitespace-nowrap font-mono text-[10px] font-bold tracking-[0.08em] text-ink",
              collide ? "top-[30px]" : "top-5",
            )}
          >
            TARGET {fmtRatio(target, 3)}
          </span>
        </div>
      </div>
      <div className="mt-6 flex justify-between font-mono text-[10px] tabular text-fog-2">
        <span>{fmtRatio(min, 2)}</span>
        <span>{fmtRatio(max, 2)}</span>
      </div>
    </div>
  );
}
