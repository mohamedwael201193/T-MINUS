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
              PreStocks Asset Lifecycle & Action Engine. Issuer event, chain, market, then a signature or a halt.
            </p>
          </div>
          <nav aria-label="Product">
            <p className="mlabel text-fog-2">Product</p>
            <ul className="mt-4 space-y-2.5">
              <li><FooterLink href="#product">The problem</FooterLink></li>
              <li><FooterLink href="#lifecycle">Lifecycle</FooterLink></li>
              <li><FooterLink href="#how">The desk</FooterLink></li>
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
            <p className="mlabel text-fog-2">Proof</p>
            <ul className="mt-4 space-y-2.5">
              <li><FooterLink href="#proof">Mainnet conversion</FooterLink></li>
              <li><FooterLink href="#api">Public API</FooterLink></li>
              <li><FooterLink href="#safety">Safety</FooterLink></li>
            </ul>
          </nav>
        </div>
        <div className="mt-12 flex flex-col gap-2.5 border-t-2 border-ink/10 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-fog">
            © 2026 T-MINUS — PreStocks ecosystem
          </p>
          <p className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-fog-2">
            MAINNET conversion proven · DEVNET protocol proofs · no unattended Mainnet custody
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
