"use client";

import { Wordmark } from "@/components/tminus/system/logo";
import { navigate } from "@/lib/tminus/router";
import { cn } from "@/lib/tminus/utils";

const LINKS = [
  { label: "Product", href: "#product" },
  { label: "How it works", href: "#how" },
  { label: "Proof", href: "#proof" },
];

export function LandingNav() {
  return (
    <header className="sticky top-0 z-50 border-b-2 border-ink bg-bone/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 md:px-6">
        <button
          type="button"
          onClick={() => navigate("#/")}
          className="transition-transform hover:-rotate-2"
          aria-label="T-MINUS home"
        >
          <Wordmark size="md" />
        </button>
        <nav aria-label="Landing" className="hidden items-center gap-7 md:flex">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="mlabel border-b-2 border-transparent text-fog transition-colors hover:border-ink hover:text-ink"
            >
              {l.label}
            </a>
          ))}
        </nav>
        <button
          type="button"
          onClick={() => navigate("#/app")}
          className={cn(
            "inline-flex h-10 items-center gap-2 rounded-full border-2 border-ink bg-ink px-5",
            "font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-bone",
            "transition-all hover:-translate-y-0.5 hover:shadow-[4px_4px_0_0_var(--color-lime)]",
          )}
        >
          Open App
          <span aria-hidden>→</span>
        </button>
      </div>
    </header>
  );
}
