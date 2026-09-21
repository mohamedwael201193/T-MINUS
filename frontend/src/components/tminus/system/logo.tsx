"use client";

import { cn } from "@/lib/tminus/utils";

/** The T-MINUS dial mark — a countdown instrument at T–minus position. */
export function LogoMark({
  size = 28,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      aria-hidden
      className={cn("shrink-0", className)}
    >
      <circle
        cx="32"
        cy="32"
        r="27"
        fill="none"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        d="M32 5 A27 27 0 0 1 57.8 40"
        fill="none"
        stroke="var(--color-lime)"
        strokeWidth="7"
      />
      <line
        x1="32"
        y1="32"
        x2="32"
        y2="9"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <circle cx="32" cy="32" r="4.5" fill="var(--color-lime)" />
    </svg>
  );
}

export function Wordmark({
  onInk = false,
  size = "md",
  className,
}: {
  onInk?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const text =
    size === "lg" ? "text-3xl" : size === "sm" ? "text-lg" : "text-xl";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2.5 font-display font-normal uppercase leading-none tracking-[0.01em]",
        onInk ? "text-bone" : "text-ink",
        text,
        className,
      )}
    >
      <LogoMark size={size === "lg" ? 34 : size === "sm" ? 20 : 26} />
      T–MINUS
    </span>
  );
}
