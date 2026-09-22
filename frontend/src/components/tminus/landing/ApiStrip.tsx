"use client";

import { Eyebrow } from "@/components/tminus/system/primitives";
import { Reveal } from "@/components/tminus/system/Reveal";

const ENDPOINTS = [
  ["GET /v1/actions", "Issuer + chain + market list"],
  ["GET /v1/actions/:asset", "One lifecycle action"],
  ["GET /v1/actions/:asset/evidence", "Source, hash, fingerprint"],
  ["GET /v1/actions/:asset/events", "Persisted issuer transitions"],
  ["GET /v1/actions/:asset/executable", "Signable Jupiter snapshot"],
  ["GET /v1/actions/:asset/status", "Stage and refusals"],
];

export function ApiStrip() {
  return (
    <section id="api" aria-label="Public API" className="scroll-mt-20 border-b-2 border-ink">
      <div className="mx-auto max-w-6xl px-4 py-16 md:px-6 md:py-20">
        <Reveal>
          <Eyebrow>Public API</Eyebrow>
          <h2 className="mt-5 font-display text-[clamp(2rem,4.6vw,3.4rem)] uppercase leading-[0.95] text-ink">
            Lifecycle as an interface.
          </h2>
          <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-fog">
            Trading, wallets, and analytics already exist. This API exposes issuer-event state, fingerprints, and signing eligibility.
          </p>
        </Reveal>
        <div className="mt-8 grid gap-2 sm:grid-cols-2">
          {ENDPOINTS.map(([path, note]) => (
            <div key={path} className="flex items-baseline justify-between gap-3 rounded-xl border-2 border-ink/15 bg-paper px-4 py-3">
              <code className="font-mono text-[11px] font-bold text-ink">{path}</code>
              <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-fog">{note}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
