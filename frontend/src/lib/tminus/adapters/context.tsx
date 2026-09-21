"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import type { TMinusSource } from "./sources";
import { createLocalDesignSource } from "./localDesignSource";
import { createBackendSource } from "./backendSource";

/**
 * React binding for the TMinusSource adapter.
 *
 * Default production path: BackendSource (live API + Phantom + real receipts).
 * Design simulation: set NEXT_PUBLIC_TMINUS_SOURCE=design
 */

const TMinusContext = createContext<TMinusSource | null>(null);

function createSource(): TMinusSource {
  if (process.env.NEXT_PUBLIC_TMINUS_SOURCE === "design") {
    return createLocalDesignSource();
  }
  return createBackendSource();
}

function isCurrentAdapter(source: TMinusSource): boolean {
  return (
    typeof source.getSelectedAssetId === "function" &&
    typeof source.selectAsset === "function" &&
    typeof source.getProtocolInspect === "function" &&
    typeof source.getAction === "function" &&
    typeof source.requestConversion === "function"
  );
}

export function TMinusProvider({ children }: { children: ReactNode }) {
  const [source, setSource] = useState<TMinusSource>(() => createSource());
  if (!isCurrentAdapter(source)) {
    setSource(createSource());
  }

  useEffect(() => {
    const maybeStart = source as unknown as {
      start?: () => void;
      stop?: () => void;
    };
    maybeStart.start?.();
    return () => maybeStart.stop?.();
  }, [source]);

  return <TMinusContext.Provider value={source}>{children}</TMinusContext.Provider>;
}

export function useTMinus(): TMinusSource {
  const ctx = useContext(TMinusContext);
  if (!ctx) throw new Error("useTMinus must be used inside <TMinusProvider>");
  return ctx;
}

/** re-render whenever the source version changes */
export function useTMinusVersion(): number {
  const src = useTMinus();
  return useSyncExternalStore(
    src.subscribe,
    src.getVersion,
    () => 0,
  );
}
