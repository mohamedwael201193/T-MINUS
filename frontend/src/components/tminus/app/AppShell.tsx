"use client";

import { useState, type ReactNode } from "react";
import { useTMinus, useTMinusVersion } from "@/lib/tminus/adapters/context";
import { navigate, useView } from "@/lib/tminus/router";
import { truncMid } from "@/lib/tminus/utils";
import { WALLET_PROVIDERS } from "@/lib/tminus/data/walletState";
import { useToast } from "@/components/tminus/system/toast";
import { Modal } from "@/components/tminus/system/Modal";
import { Wordmark } from "@/components/tminus/system/logo";
import { cn } from "@/lib/tminus/utils";

/* ------------------------------- shell ---------------------------------- */

export function AppShell({ children }: { children: ReactNode }) {
  const view = useView();
  const [walletOpen, setWalletOpen] = useState(false);
  useTMinusVersion();
  const env = useTMinus().getEnvironment();
  const activeTab =
    view.name === "receipts" ? "receipts" : view.name === "app" || view.name === "order" ? "console" : "console";

  return (
    <div className="flex min-h-screen flex-col">
      {/* top chrome */}
      <header className="sticky top-0 z-50 border-b-2 border-bone/15 bg-ink text-bone">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 md:px-6">
          <button type="button" onClick={() => navigate("#/")} aria-label="T-MINUS home" className="transition-transform hover:-rotate-2">
            <Wordmark onInk size="md" />
          </button>

          <nav aria-label="Application" className="hidden items-center gap-1.5 sm:flex">
            <TabButton active={activeTab === "console"} onClick={() => navigate("#/app")}>
              Console
            </TabButton>
            <TabButton active={activeTab === "receipts"} onClick={() => navigate("#/receipts")}>
              Receipts
            </TabButton>
          </nav>

          <WalletButton onOpen={() => setWalletOpen(true)} />
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="mt-auto border-t-2 border-ink/10 bg-bone px-4 py-4 md:px-6">
        <div className="mx-auto flex max-w-6xl flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-fog">
            T-MINUS · Lifecycle console
          </p>
          <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-fog-2">
            {env.dataCluster} data · {env.programMainnetExists ? "MAINNET program" : env.programDevnetExists ? "DEVNET program" : "program undeployed on MAINNET"}
          </p>
        </div>
      </footer>

      {/* mobile bottom nav */}
      <nav
        aria-label="Application"
        className="fixed inset-x-0 bottom-0 z-50 border-t-2 border-bone/15 bg-ink pb-[env(safe-area-inset-bottom)] sm:hidden"
      >
        <div className="grid h-16 grid-cols-2">
          <MobileTab active={activeTab === "console"} onClick={() => navigate("#/app")} label="Console">
            <svg width="17" height="17" viewBox="0 0 17 17" aria-hidden>
              <circle cx="8.5" cy="8.5" r="6.8" fill="none" stroke="currentColor" strokeWidth="2" />
              <path d="M8.5 4.8v3.7l2.6 1.6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </MobileTab>
          <MobileTab active={activeTab === "receipts"} onClick={() => navigate("#/receipts")} label="Receipts">
            <svg width="17" height="17" viewBox="0 0 17 17" aria-hidden>
              <path d="M2.5 2h12v10.2l-2 1.6-2-1.6-2 1.6-2-1.6-2 1.6-2-1.6V2z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
              <path d="M5.5 5.5h6M5.5 8.5h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </MobileTab>
        </div>
      </nav>
      <div className="h-16 sm:hidden" aria-hidden />

      <WalletModal open={walletOpen} onClose={() => setWalletOpen(false)} />
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={cn(
        "rounded-full px-4 py-2 font-mono text-[10.5px] font-bold uppercase tracking-[0.16em] transition-colors",
        active ? "bg-lime text-ink" : "text-bone-dim hover:text-bone",
      )}
    >
      {children}
    </button>
  );
}

function MobileTab({
  active,
  onClick,
  label,
  children,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex flex-col items-center justify-center gap-1 font-mono text-[9px] font-bold uppercase tracking-[0.14em] transition-colors",
        active ? "text-lime" : "text-bone-dim",
      )}
    >
      {children}
      {label}
    </button>
  );
}

/* ------------------------------ wallet ---------------------------------- */

function WalletButton({ onOpen }: { onOpen: () => void }) {
  useTMinusVersion();
  const src = useTMinus();
  const wallet = src.getWallet();

  if (wallet.connected && wallet.address) {
    return (
      <button
        type="button"
        onClick={onOpen}
        className="inline-flex h-10 items-center gap-2.5 rounded-full border-2 border-lime bg-ink px-4 font-mono text-[11px] font-bold tabular text-lime transition-transform hover:-translate-y-0.5"
        aria-label="Wallet connected — open wallet"
      >
        <span className="h-1.5 w-1.5 rounded-full bg-lime animate-pulse-ring" aria-hidden />
        {truncMid(wallet.address)}
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={onOpen}
      className="inline-flex h-10 items-center gap-2 rounded-full border-2 border-lime px-4 font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-lime transition-all hover:-translate-y-0.5 hover:bg-lime hover:text-ink"
    >
      <svg width="13" height="13" viewBox="0 0 13 13" aria-hidden>
        <rect x="0.8" y="2.5" width="11.4" height="8" rx="2" fill="none" stroke="currentColor" strokeWidth="1.9" />
        <path d="M0.8 5.2h7.2" stroke="currentColor" strokeWidth="1.9" />
      </svg>
      Connect
    </button>
  );
}

const PROVIDER_GLYPHS: Record<string, ReactNode> = {
  phantom: (
    <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden>
      <circle cx="11" cy="11" r="9" fill="none" stroke="currentColor" strokeWidth="2.2" />
      <path d="M6 13c1.6-2.6 8.4-2.6 10 0" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="8.2" cy="8.6" r="1.3" fill="currentColor" />
      <circle cx="13.8" cy="8.6" r="1.3" fill="currentColor" />
    </svg>
  ),
  solflare: (
    <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden>
      <path d="M11 1.8l9.2 9.2-9.2 9.2L1.8 11 11 1.8z" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" />
      <path d="M6.5 13.5c3-4 6-1.5 9-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  ),
  backpack: (
    <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden>
      <rect x="2" y="6.5" width="18" height="13" rx="3.5" fill="none" stroke="currentColor" strokeWidth="2.2" />
      <path d="M7.5 6.5V5a3.5 3.5 0 0 1 7 0v1.5" fill="none" stroke="currentColor" strokeWidth="2.2" />
    </svg>
  ),
};

function WalletModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  useTMinusVersion();
  const src = useTMinus();
  const wallet = src.getWallet();
  const { toast } = useToast();

  return (
    <Modal open={open} onClose={onClose} title={wallet.connected ? "Wallet" : "Connect a wallet"}>
      {!wallet.connected ? (
        <div>
          <p className="text-[13px] leading-relaxed text-fog">
            Pick where your SPACEX lives. T-MINUS never takes custody — the
            order escrow is a program you can cancel.
          </p>
          <ul className="mt-5 space-y-2.5">
            {WALLET_PROVIDERS.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  disabled={wallet.connecting}
                  onClick={async () => {
                    try {
                      await src.connectWallet(p.id);
                      toast({ title: "WALLET CONNECTED", tone: "lime" });
                    } catch (err) {
                      toast({
                        title: "CONNECTION FAILED",
                        body: err instanceof Error ? err.message : "Wallet rejected or missing.",
                        tone: "coral",
                      });
                    }
                  }}
                  className="flex w-full items-center justify-between rounded-xl border-2 border-ink bg-bone/60 px-4 py-3.5 transition-all hover:-translate-y-0.5 hover:bg-paper hover:shadow-[3px_3px_0_0_var(--color-ink)] disabled:opacity-50"
                >
                  <span className="flex items-center gap-3">
                    <span className="text-ink">
                      {PROVIDER_GLYPHS[p.id] ?? PROVIDER_GLYPHS.phantom}
                    </span>
                    <span className="font-mono text-[12px] font-bold uppercase tracking-[0.1em] text-ink">
                      {p.name}
                    </span>
                  </span>
                  {wallet.connecting && wallet.providerId === p.id ? (
                    <span
                      aria-hidden
                      className="h-4 w-4 animate-spin rounded-full border-2 border-ink border-t-transparent"
                    />
                  ) : (
                    <span aria-hidden className="font-bold text-ink">
                      →
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
          <p className="mt-5 font-mono text-[9px] uppercase leading-relaxed tracking-[0.12em] text-fog-2">
            Keys stay yours at every step — connection only shares your
            address.
          </p>
        </div>
      ) : (
        <div>
          <button
            type="button"
            onClick={() => {
              void navigator.clipboard?.writeText(wallet.address ?? "").catch(() => undefined);
              toast({ title: "ADDRESS COPIED", tone: "ink" });
            }}
            className="flex w-full items-center justify-between rounded-xl border-2 border-ink bg-ink px-4 py-3.5 text-left transition-transform hover:-translate-y-0.5"
          >
            <span className="font-mono text-[11.5px] font-bold tabular text-lime">
              {truncMid(wallet.address ?? "", 10, 6)}
            </span>
            <span className="font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-bone-dim">
              Copy
            </span>
          </button>

          <dl className="mt-4 space-y-2.5 rounded-xl border-2 border-ink bg-bone/60 px-4 py-4">
            <div className="flex items-center justify-between">
              <dt className="mlabel text-fog">SPACEX</dt>
              <dd className="font-mono text-[13px] font-bold tabular text-ink">
                {wallet.balances?.SPACEX.toFixed(4)}
              </dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="mlabel text-fog">SPCXx</dt>
              <dd className="font-mono text-[13px] font-bold tabular text-ink">
                {wallet.balances?.SPCXx.toFixed(4)}
              </dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="mlabel text-fog">SOL</dt>
              <dd className="font-mono text-[13px] font-bold tabular text-ink">
                {(wallet.balances?.SOL ?? 0).toFixed(4)}
              </dd>
            </div>
          </dl>

          <button
            type="button"
            onClick={() => {
              src.disconnectWallet();
              toast({ title: "WALLET DISCONNECTED", tone: "ink" });
            }}
            className="mt-4 w-full rounded-full border-2 border-coral px-4 py-3 font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-coral transition-colors hover:bg-coral hover:text-ink"
          >
            Disconnect
          </button>
          <p className="mt-4 font-mono text-[9px] uppercase leading-relaxed tracking-[0.12em] text-fog-2">
            Address and balances are live MAINNET reads. Place is not faked
            if the T-MINUS program is undeployed on this cluster.
          </p>
        </div>
      )}
    </Modal>
  );
}
