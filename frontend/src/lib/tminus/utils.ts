import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/* ------------------------------ formatting ------------------------------ */

const MONTHS = [
  "JAN",
  "FEB",
  "MAR",
  "APR",
  "MAY",
  "JUN",
  "JUL",
  "AUG",
  "SEP",
  "OCT",
  "NOV",
  "DEC",
];

/** "2027-03-12T23:59:00Z" → "MAR 12 2027" */
export function fmtDate(iso: string | number | Date): string {
  const d = new Date(iso);
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()} ${d.getUTCFullYear()}`;
}

/** "2027-03-12T23:59:00Z" → "MAR 12 2027 · 23:59 UTC" */
export function fmtDateTime(iso: string | number | Date): string {
  const d = new Date(iso);
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  return `${fmtDate(d)} · ${hh}:${mm} UTC`;
}

/** 0.7672 → "0.7672" */
export function fmtRatio(v: number, dp = 4): string {
  return v.toFixed(dp);
}

export function fmtUsd(v: number): string {
  return `$${v.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function fmtCount(v: number): string {
  return v.toLocaleString("en-US");
}

/** "7xKQv2m…" style truncation */
export function truncMid(s: string, head = 6, tail = 4): string {
  if (s.length <= head + tail + 1) return s;
  return `${s.slice(0, head)}…${s.slice(-tail)}`;
}

export function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

export function round(v: number, dp = 4): number {
  const f = 10 ** dp;
  return Math.round(v * f) / f;
}

/* -------------------------------- clock --------------------------------- */

export interface CountdownParts {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalMs: number;
  past: boolean;
}

export function countdownTo(fromMs: number, toMs: number): CountdownParts {
  const diff = toMs - fromMs;
  const abs = Math.abs(diff);
  const days = Math.floor(abs / 86_400_000);
  const hours = Math.floor((abs % 86_400_000) / 3_600_000);
  const minutes = Math.floor((abs % 3_600_000) / 60_000);
  const seconds = Math.floor((abs % 60_000) / 1000);
  return {
    days,
    hours,
    minutes,
    seconds,
    totalMs: diff,
    past: diff <= 0,
  };
}

/** T–172D 04:22:51 */
export function fmtCountdownFull(p: CountdownParts): string {
  const sign = p.past ? "+" : "–";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `T${sign}${String(p.days).padStart(3, "0")}D ${pad(p.hours)}:${pad(
    p.minutes,
  )}:${pad(p.seconds)}`;
}

/** T–172D */
export function fmtCountdownDays(p: CountdownParts): string {
  const sign = p.past ? "+" : "–";
  return `T${sign}${String(p.days).padStart(3, "0")}D`;
}

/** Issuer-named destination. Never treat catalog TBD/null as a live dest. */
export function displayDestination(
  actionSymbol?: string | null,
  assetSymbol?: string | null,
  empty = "—",
): string {
  for (const raw of [actionSymbol, assetSymbol]) {
    const s = raw?.trim();
    if (s && s !== "TBD") return s;
  }
  return empty;
}
