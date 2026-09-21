"use client";

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/tminus/utils";
import type { OrderStatus } from "@/lib/tminus/domain/types";

/* --------------------------------- Button -------------------------------- */

type ButtonVariant =
  | "lime"
  | "ink"
  | "outline"
  | "ghost"
  | "bone"
  | "danger"
  | "dangerOutline";

type ButtonSize = "sm" | "md" | "lg";

const VARIANTS: Record<ButtonVariant, string> = {
  lime: "bg-lime text-ink border-ink shadow-[4px_4px_0_0_var(--color-ink)] hover:-translate-x-[2px] hover:-translate-y-[2px] hover:shadow-[6px_6px_0_0_var(--color-ink)] active:translate-x-0 active:translate-y-0 active:shadow-[2px_2px_0_0_var(--color-ink)]",
  ink: "bg-ink text-bone border-ink shadow-[4px_4px_0_0_color-mix(in_srgb,var(--color-ink)_35%,transparent)] hover:-translate-x-[2px] hover:-translate-y-[2px] hover:shadow-[6px_6px_0_0_color-mix(in_srgb,var(--color-ink)_35%,transparent)] active:translate-x-0 active:translate-y-0 active:shadow-[2px_2px_0_0_color-mix(in_srgb,var(--color-ink)_35%,transparent)]",
  outline:
    "bg-transparent text-ink border-ink hover:bg-ink hover:text-bone",
  ghost: "bg-transparent text-ink border-transparent hover:underline underline-offset-4",
  bone: "bg-bone text-ink border-bone shadow-[4px_4px_0_0_rgba(241,237,226,0.25)] hover:-translate-x-[2px] hover:-translate-y-[2px] hover:shadow-[6px_6px_0_0_rgba(241,237,226,0.25)]",
  danger:
    "bg-coral text-ink border-ink shadow-[4px_4px_0_0_var(--color-ink)] hover:-translate-x-[2px] hover:-translate-y-[2px] hover:shadow-[6px_6px_0_0_var(--color-ink)] active:translate-x-0 active:translate-y-0",
  dangerOutline: "bg-transparent text-coral border-coral hover:bg-coral hover:text-ink",
};

const SIZES: Record<ButtonSize, string> = {
  sm: "h-9 px-4 text-[11px] tracking-[0.1em]",
  md: "h-11 px-6 text-[12.5px] tracking-[0.1em]",
  lg: "h-14 px-8 text-sm tracking-[0.1em]",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  href?: string;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "lime", size = "md", href, className, children, ...props }, ref) => {
    const cls = cn(
      "inline-flex select-none items-center justify-center gap-2 rounded-full border-2 font-bold uppercase transition-all duration-150",
      "focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-lime",
      "disabled:pointer-events-none disabled:opacity-40",
      VARIANTS[variant],
      SIZES[size],
      className,
    );
    if (href) {
      return (
        <a href={href} className={cls}>
          {children}
        </a>
      );
    }
    return (
      <button ref={ref} className={cls} {...props}>
        {children}
      </button>
    );
  },
);
Button.displayName = "Button";

/* --------------------------------- Panel --------------------------------- */

interface PanelProps {
  children: ReactNode;
  className?: string;
  tone?: "paper" | "bone" | "ink" | "deep";
  shadow?: "none" | "sm" | "lg";
  as?: "div" | "section" | "article";
  id?: string;
}

const PANEL_TONES = {
  paper: "bg-paper text-ink border-ink",
  bone: "bg-bone text-ink border-ink",
  ink: "bg-ink-2 text-bone border-bone/25",
  deep: "bg-ink-deep text-bone border-bone/20",
} as const;

const PANEL_SHADOWS = {
  none: "",
  sm: "shadow-[3px_3px_0_0_var(--color-ink)]",
  lg: "shadow-[6px_6px_0_0_var(--color-ink)]",
} as const;

export function Panel({
  children,
  className,
  tone = "paper",
  shadow = "none",
  as: Tag = "div",
  id,
}: PanelProps) {
  return (
    <Tag
      id={id}
      className={cn(
        "rounded-2xl border-2",
        PANEL_TONES[tone],
        tone === "ink" || tone === "deep"
          ? shadow === "lg"
            ? "shadow-[6px_6px_0_0_rgba(241,237,226,0.16)]"
            : shadow === "sm"
              ? "shadow-[3px_3px_0_0_rgba(241,237,226,0.14)]"
              : ""
          : PANEL_SHADOWS[shadow],
        className,
      )}
    >
      {children}
    </Tag>
  );
}

/* -------------------------------- Eyebrow -------------------------------- */

export function Eyebrow({
  children,
  onInk = false,
  tone = "ink",
  className,
}: {
  children: ReactNode;
  onInk?: boolean;
  tone?: "ink" | "lime" | "amber" | "coral";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border-2 px-3 py-1.5 font-mono text-[10.5px] font-semibold uppercase tracking-[0.18em]",
        onInk
          ? tone === "lime"
            ? "border-lime bg-transparent text-lime"
            : "border-bone/70 bg-transparent text-bone"
          : "border-ink bg-paper text-ink",
        !onInk && tone === "lime" && "border-ink bg-lime text-ink",
        !onInk && tone === "amber" && "border-ink bg-amber text-ink",
        !onInk && tone === "coral" && "border-ink bg-coral text-ink",
        className,
      )}
    >
      {children}
    </span>
  );
}

/* ------------------------------- Micro label ----------------------------- */

export function Label({
  children,
  onInk = false,
  className,
}: {
  children: ReactNode;
  onInk?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "mlabel",
        onInk ? "text-bone-dim" : "text-fog",
        className,
      )}
    >
      {children}
    </span>
  );
}

/* ------------------------------- Status chip ----------------------------- */

const STATUS_META: Record<
  OrderStatus,
  { label: string; className: string; pulse?: boolean }
> = {
  PLACED: {
    label: "Placed",
    className: "border-ink/30 bg-transparent text-fog",
  },
  ARMED: {
    label: "Armed",
    className: "border-ink bg-paper text-ink",
  },
  WATCHING: {
    label: "Watching",
    className: "border-ink bg-ink text-bone",
    pulse: true,
  },
  TARGET_REACHED: {
    label: "Target reached",
    className: "border-ink bg-lime text-ink",
  },
  EXECUTING: {
    label: "Executing",
    className: "border-ink bg-amber text-ink",
    pulse: true,
  },
  SETTLED: {
    label: "Settled",
    className: "border-ink bg-lime text-ink",
  },
  CANCELLED: {
    label: "Cancelled",
    className: "border-coral bg-transparent text-coral",
  },
};

export function StatusChip({
  status,
  className,
}: {
  status: OrderStatus;
  className?: string;
}) {
  const meta = STATUS_META[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border-2 px-2.5 py-1 font-mono text-[9.5px] font-bold uppercase tracking-[0.14em]",
        meta.className,
        className,
      )}
    >
      {meta.pulse ? (
        <span
          aria-hidden
          className="inline-block h-1.5 w-1.5 rounded-full bg-lime animate-pulse-ring"
        />
      ) : null}
      {meta.label}
    </span>
  );
}

/* ---------------------------------- Stat --------------------------------- */

export function Stat({
  label,
  value,
  sub,
  onInk = false,
  valueClassName,
  className,
}: {
  label: ReactNode;
  value: ReactNode;
  sub?: ReactNode;
  onInk?: boolean;
  valueClassName?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Label onInk={onInk}>{label}</Label>
      <div
        className={cn(
          "font-mono text-lg font-bold tabular leading-none",
          onInk ? "text-bone" : "text-ink",
          valueClassName,
        )}
      >
        {value}
      </div>
      {sub ? (
        <div className={cn("font-mono text-[9.5px] tracking-[0.06em]", onInk ? "text-bone-dim" : "text-fog")}>
          {sub}
        </div>
      ) : null}
    </div>
  );
}
