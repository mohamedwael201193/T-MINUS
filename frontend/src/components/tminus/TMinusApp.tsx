"use client";

import { useEffect, useRef } from "react";
import { TMinusProvider, useTMinus, useTMinusVersion } from "@/lib/tminus/adapters/context";
import { useView, navigate } from "@/lib/tminus/router";
import { ToastProvider, useToast } from "@/components/tminus/system/toast";
import { Grain } from "@/components/tminus/system/Grain";
import { Landing } from "@/components/tminus/landing/Landing";
import { AppShell } from "@/components/tminus/app/AppShell";
import { ConsoleView } from "@/components/tminus/app/ConsoleView";
import { OrderDetail } from "@/components/tminus/app/OrderDetail";
import { ReceiptsView } from "@/components/tminus/app/ReceiptsView";

/**
 * T-MINUS — root application.
 *
 * Single route, hash-based views (landing / console / order detail /
 * receipts). All product code is plain React + TS + Tailwind classes
 * so it drops into T-MINUS/FRONTEND/ (Vite) with a mount call — see
 * FRONTEND_NOTES.md.
 */
export default function TMinusApp() {
  return (
    <TMinusProvider>
      <ToastProvider>
        <NoticeBridge />
        <ViewRouter />
      </ToastProvider>
    </TMinusProvider>
  );
}

/** engine notices → toasts */
function NoticeBridge() {
  const src = useTMinus();
  const { toast } = useToast();
  const seen = useRef<Set<string>>(new Set());

  useEffect(() => {
    const check = () => {
      for (const n of src.getNotices()) {
        if (seen.current.has(n.id)) continue;
        seen.current.add(n.id);
        toast({ title: n.title, body: n.body, tone: n.tone === "ink" ? "ink" : n.tone });
      }
    };
    check();
    return src.subscribe(check);
  }, [src, toast]);

  return null;
}

function ViewRouter() {
  const view = useView();
  const prev = useRef(view.name);
  useTMinusVersion();
  const src = useTMinus();
  const env = src.getEnvironment();
  const ready = env.dataCluster === "SIMULATION" || src.listAssets().length > 0;

  useEffect(() => {
    if (prev.current !== view.name) {
      prev.current = view.name;
      window.scrollTo({ top: 0, behavior: "auto" });
    }
  }, [view.name]);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bone font-sans text-ink">
        <Grain />
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-fog">
          Loading live PreStocks feed…
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bone font-sans text-ink">
      <Grain />
      {view.name === "landing" ? (
        <Landing />
      ) : view.name === "receipts" ? (
        <AppShell>
          <ReceiptsView />
        </AppShell>
      ) : view.name === "order" ? (
        <AppShell>
          <OrderDetail id={view.id} />
        </AppShell>
      ) : (
        <AppShell>
          <ConsoleView />
        </AppShell>
      )}
    </div>
  );
}
