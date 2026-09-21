"use client";

import { useEffect, useState } from "react";

/**
 * Hash-based view routing — mirrors the production app's URL plan
 * while living on a single route in this preview environment.
 *
 *   #/            landing
 *   #/app         console
 *   #/order/:id   order detail
 *   #/receipts    receipts / proof
 *
 * Anything not starting with #/ is treated as a landing anchor
 * (#product, #how, #proof …) and handled by native scrolling.
 */

export type View =
  | { name: "landing" }
  | { name: "app" }
  | { name: "order"; id: string }
  | { name: "receipts" };

export function parseHash(hash: string): View {
  const h = hash.replace(/^#/, "");
  if (!h.startsWith("/")) return { name: "landing" };
  const parts = h.split("/").filter(Boolean);
  if (parts.length === 0) return { name: "landing" };
  if (parts[0] === "app") return { name: "app" };
  if (parts[0] === "receipts") return { name: "receipts" };
  if (parts[0] === "order" && parts[1]) return { name: "order", id: parts[1] };
  return { name: "landing" };
}

export function navigate(to: string) {
  if (typeof window === "undefined") return;
  if (window.location.hash === to) {
    window.dispatchEvent(new HashChangeEvent("hashchange"));
    if (to.startsWith("#/")) window.scrollTo({ top: 0, behavior: "auto" });
    return;
  }
  window.location.hash = to;
}

export function useView(): View {
  const [view, setView] = useState<View>(() =>
    parseHash(typeof window === "undefined" ? "" : window.location.hash),
  );
  useEffect(() => {
    const onHash = () => setView(parseHash(window.location.hash));
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  return view;
}

/** ticking clock, gated on mount to keep SSR and hydration identical */
export function useNow(intervalMs = 1000): number | null {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    // first value arrives asynchronously (post-hydration) so the
    // server and client first frames match
    const raf = requestAnimationFrame(() => setNow(Date.now()));
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => {
      cancelAnimationFrame(raf);
      clearInterval(id);
    };
  }, [intervalMs]);
  return now;
}
