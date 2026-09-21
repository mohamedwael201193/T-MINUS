"use client";

import { cn } from "@/lib/tminus/utils";
import type { OrderStatus } from "@/lib/tminus/domain/types";

/**
 * The order state machine as a physical rail:
 *   PLACED → ARMED → WATCHING → TARGET REACHED → EXECUTING → SETTLED
 * (or WATCHING → EXECUTING · FAILSAFE → SETTLED / CANCELLED).
 *
 * Renders horizontally on desktop, vertically on small screens.
 */

export interface RailStep {
  key: OrderStatus | "FAILSAFE_ARMED";
  label: string;
  note?: string;
  time?: string;
  tone?: "danger";
}

export function stepsForOrder(
  status: OrderStatus,
  fillPath?: "TARGET" | "FAILSAFE",
): { steps: RailStep[]; current: number } {
  if (status === "CANCELLED") {
    return {
      steps: [
        { key: "PLACED", label: "Placed" },
        { key: "ARMED", label: "Armed" },
        { key: "WATCHING", label: "Watching" },
        { key: "CANCELLED", label: "Cancelled", tone: "danger" },
      ],
      current: 3,
    };
  }
  const mid: RailStep[] =
    fillPath === "FAILSAFE"
      ? [
          { key: "PLACED", label: "Placed" },
          { key: "ARMED", label: "Armed" },
          { key: "WATCHING", label: "Watching" },
          { key: "EXECUTING", label: "Executing", note: "at floor" },
        ]
      : [
          { key: "PLACED", label: "Placed" },
          { key: "ARMED", label: "Armed" },
          { key: "WATCHING", label: "Watching" },
          { key: "TARGET_REACHED", label: "Target reached" },
          { key: "EXECUTING", label: "Executing" },
        ];
  const steps: RailStep[] = [...mid, { key: "SETTLED", label: "Settled" }];

  const order: OrderStatus[] = [
    "PLACED",
    "ARMED",
    "WATCHING",
    "TARGET_REACHED",
    "EXECUTING",
    "SETTLED",
  ];
  // map EXECUTING (failsafe variant) to its slot
  let idx = order.indexOf(status as OrderStatus);
  if (fillPath === "FAILSAFE" && status === "EXECUTING") idx = 4;
  return { steps, current: Math.min(idx, steps.length - 1) };
}

export function StateRail({
  steps,
  current,
  compact = false,
  className,
}: {
  steps: RailStep[];
  current: number;
  compact?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-0 sm:flex-row sm:gap-0",
        className,
      )}
      aria-label="Order state"
    >
      {steps.map((s, i) => {
        const done = i < current;
        const isCurrent = i === current;
        const upcoming = i > current;
        const danger = s.tone === "danger" && isCurrent;
        return (
          <div
            key={s.key + i}
            className={cn(
              "relative flex items-start gap-3 sm:flex-1 sm:flex-col sm:items-center",
              i > 0 ? "mt-4 sm:mt-0" : "",
            )}
          >
            {/* connector */}
            {i > 0 ? (
              <>
                {/* vertical (mobile) */}
                <span
                  aria-hidden
                  className={cn(
                    "absolute -top-4 left-[7px] h-4 w-[2px] sm:hidden",
                    done || isCurrent ? "bg-ink" : "bg-ink/20",
                  )}
                />
                {/* horizontal (desktop) */}
                <span
                  aria-hidden
                  className={cn(
                    "absolute right-[calc(50%+14px)] top-[7px] hidden h-[2px] w-[calc(100%-28px)] sm:block",
                    done || isCurrent ? "bg-ink" : "bg-ink/20",
                  )}
                />
              </>
            ) : null}
            <span
              aria-hidden
              className={cn(
                "relative z-10 mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 sm:mt-0",
                done && "border-ink bg-ink",
                isCurrent && !danger && "border-ink bg-lime",
                isCurrent && danger && "border-coral bg-coral",
                upcoming && "border-ink/25 bg-transparent",
              )}
            >
              {isCurrent && !danger ? (
                <span className="absolute inset-0 rounded-full animate-pulse-ring" />
              ) : null}
            </span>
            {!compact ? (
              <div className="flex flex-col sm:items-center">
                <span
                  className={cn(
                    "font-mono text-[10px] font-bold uppercase tracking-[0.12em] leading-tight",
                    done && "text-ink",
                    isCurrent && !danger && "text-ink",
                    isCurrent && danger && "text-coral-ink",
                    upcoming && "text-ink/35",
                  )}
                >
                  {s.label}
                </span>
                {s.note && isCurrent ? (
                  <span className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.1em] text-fog">
                    {s.note}
                  </span>
                ) : null}
                {s.time && (done || isCurrent) ? (
                  <span className="mt-0.5 font-mono text-[10px] tabular tracking-[0.04em] text-fog">
                    {s.time}
                  </span>
                ) : null}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

/** compact inline rail: dots + progress + current label only */
export function StateRailCompact({
  steps,
  current,
  className,
}: {
  steps: RailStep[];
  current: number;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-2", className)} aria-hidden>
      {steps.map((s, i) => (
        <span key={s.key + i} className="flex items-center gap-2">
          {i > 0 ? (
            <span
              className={cn(
                "h-[2px] w-4 rounded-full",
                i <= current ? "bg-ink" : "bg-ink/20",
              )}
            />
          ) : null}
          <span
            className={cn(
              "h-2.5 w-2.5 rounded-full border-2",
              i < current && "border-ink bg-ink",
              i === current && s.tone !== "danger" && "border-ink bg-lime",
              i === current && s.tone === "danger" && "border-coral bg-coral",
              i > current && "border-ink/25 bg-transparent",
            )}
          />
        </span>
      ))}
      <span className="ml-1 font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-ink">
        {steps[current]?.label}
      </span>
    </div>
  );
}
