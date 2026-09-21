"use client";

import { cn, countdownTo, fmtCountdownDays, fmtCountdownFull } from "@/lib/tminus/utils";
import { useNow } from "@/lib/tminus/router";

/**
 * Mission-clock countdown. Renders a stable placeholder until mounted
 * so SSR and hydration frames match, then ticks every second.
 */
export function Countdown({
  to,
  format = "full",
  className,
}: {
  to: string;
  format?: "full" | "days";
  className?: string;
}) {
  const now = useNow();
  const target = Date.parse(to);
  const ready = now != null && Number.isFinite(target);
  const parts = ready ? countdownTo(now, target) : null;
  return (
    <span className={cn("font-mono font-semibold tabular", className)}>
      {parts
        ? format === "days"
          ? fmtCountdownDays(parts)
          : fmtCountdownFull(parts)
        : format === "days"
          ? "T–––D"
          : "T–––D --:--:--"}
    </span>
  );
}

/** elapsed fraction of [from, to], 0..1 — null until mounted */
export function useElapsedFraction(from: string | null, to: string | null): number | null {
  const now = useNow();
  if (!from || !to) return null;
  const a = Date.parse(from);
  const b = Date.parse(to);
  if (!Number.isFinite(a) || !Number.isFinite(b) || now == null || b <= a) return null;
  return Math.min(1, Math.max(0, (now - a) / (b - a)));
}
