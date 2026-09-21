"use client";

import { navigate } from "@/lib/tminus/router";
import { Wordmark } from "@/components/tminus/system/logo";

export function LandingFooter() {
  return (
    <footer className="bg-bone">
      <div className="mx-auto max-w-6xl px-4 py-14 md:px-6">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <Wordmark size="md" />
            <p className="mt-4 max-w-xs text-[13.5px] leading-relaxed text-fog">
              Lifecycle orders for tokenized pre-IPO assets. Set the price.
              Set the clock. T-MINUS watches.
            </p>
            <p className="mt-5 inline-flex items-center gap-2 rounded-full border-2 border-ink bg-paper px-3 py-1.5 font-mono text-[9.5px] font-bold uppercase tracking-[0.16em] text-ink">
              <span className="h-1.5 w-1.5 rounded-full bg-lime animate-pulse-ring" aria-hidden />
              System watching
            </p>
          </div>

          <nav aria-label="Product">
            <p className="mlabel text-fog-2">Product</p>
            <ul className="mt-4 space-y-2.5">
              <li><FooterLink href="#product">The problem</FooterLink></li>
              <li><FooterLink href="#lifecycle">Lifecycle</FooterLink></li>
              <li><FooterLink href="#how">How orders work</FooterLink></li>
            </ul>
          </nav>

          <nav aria-label="App">
            <p className="mlabel text-fog-2">App</p>
            <ul className="mt-4 space-y-2.5">
              <li><FooterLink href="#/app" hash>Console</FooterLink></li>
              <li><FooterLink href="#/receipts" hash>Proof ledger</FooterLink></li>
            </ul>
          </nav>

          <nav aria-label="Protocol">
            <p className="mlabel text-fog-2">Protocol</p>
            <ul className="mt-4 space-y-2.5">
              <li><FooterLink href="#safety">Safety · custody</FooterLink></li>
              <li><FooterLink href="#proof">Proof</FooterLink></li>
            </ul>
          </nav>
        </div>

        <div className="mt-12 flex flex-col gap-2.5 border-t-2 border-ink/10 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-fog">
            © 2026 T-MINUS — PreStocks ecosystem
          </p>
          <p className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-fog-2">
            MAINNET PreStocks data · DEVNET protocol proofs · no fake mainnet program
          </p>
        </div>
      </div>
    </footer>
  );
}

function FooterLink({
  href,
  children,
  hash = false,
}: {
  href: string;
  children: React.ReactNode;
  hash?: boolean;
}) {
  return (
    <a
      href={href}
      onClick={(e) => {
        if (hash) {
          e.preventDefault();
          navigate(href);
        }
      }}
      className="font-mono text-[11px] uppercase tracking-[0.1em] text-fog transition-colors hover:text-ink"
    >
      {children}
    </a>
  );
}
