"use client";

import { useTMinus, useTMinusVersion } from "@/lib/tminus/adapters/context";
import { fmtRatio, fmtUsd } from "@/lib/tminus/utils";
import { SPACEX_ASSET_ID } from "@/lib/tminus/data/lifecycleData";
import { Eyebrow, Label, Panel } from "@/components/tminus/system/primitives";
import { Countdown } from "@/components/tminus/system/Countdown";
import { Reveal } from "@/components/tminus/system/Reveal";

const BABYSIT_LOOP = [
  "Watch the book",
  "Recalculate the ratio",
  "Wait",
  "Repeat, daily, for months",
  "Hope you’re at the screen",
  "Swap in time — or don’t",
];

export function Problem() {
  useTMinusVersion();
  const src = useTMinus();
  const asset = src.getAsset(SPACEX_ASSET_ID)!;
  const market = src.getMarket(SPACEX_ASSET_ID);
  const ratio = market.executableRatio;
  const discount = ratio != null ? (1 - ratio) * 100 : null;

  return (
    <section id="product" aria-label="The problem" className="scroll-mt-20 border-b-2 border-ink">
      <div className="mx-auto max-w-6xl px-4 py-16 md:px-6 md:py-24">
        <Reveal>
          <Eyebrow>The problem</Eyebrow>
          <h2 className="mt-5 max-w-3xl font-display text-[clamp(2.2rem,5.4vw,4.2rem)] uppercase leading-[0.95] text-ink">
            The deadline is the whole game.
          </h2>
          <p className="mt-5 max-w-2xl text-[16.5px] leading-relaxed text-fog">
            A PreStocks token isn’t an ordinary position. When the issuer
            publishes a conversion window, holders must trade out before the
            deadline or the token is scheduled to expire worthless. Jupiter
            will still quote a swap. It will not tell you the window is closed.{" "}
            <span className="font-semibold text-ink">
              The missing layer is the corporate action, not another chart.
            </span>
          </p>
        </Reveal>

        <div className="mt-12 grid gap-6 lg:grid-cols-2">
          {/* the position, in numbers */}
          <Reveal delay={80}>
            <Panel tone="paper" shadow="lg" className="h-full p-6 md:p-7">
              <div className="flex items-center justify-between">
                <Label>SPACEX, right now</Label>
                <span className="rounded-full border-2 border-ink bg-ink px-2.5 py-1 font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-bone">
                  Token-2022
                </span>
              </div>
              <dl className="mt-6 grid grid-cols-2 gap-x-4 gap-y-6">
                <div>
                  <dt className="mlabel text-fog">PreStock price</dt>
                  <dd className="mt-1.5 font-mono text-2xl font-bold tabular text-ink">
                    {fmtUsd(asset.price)}
                  </dd>
                </div>
                <div>
                  <dt className="mlabel text-fog">Destination · {asset.destinationSymbol}</dt>
                  <dd className="mt-1.5 font-mono text-2xl font-bold tabular text-ink">
                    {asset.destinationPrice != null ? fmtUsd(asset.destinationPrice) : "—"}
                  </dd>
                </div>
                <div>
                  <dt className="mlabel text-fog">Executable today</dt>
                  <dd className="mt-1.5 flex items-baseline gap-2">
                    <span className="font-mono text-2xl font-bold tabular text-ink">
                      {ratio != null ? fmtRatio(ratio) : "—"}
                    </span>
                    {discount != null ? (
                      <span className="font-mono text-[11px] font-bold text-coral-ink">
                        {discount.toFixed(1)}% below parity
                      </span>
                    ) : null}
                  </dd>
                </div>
                <div>
                  <dt className="mlabel text-fog">Window closes</dt>
                  <dd className="mt-1.5 font-mono text-2xl font-bold tabular text-ink">
                    MAR 12 2027
                  </dd>
                  <dd className="mt-1">
                    <Countdown
                      to={asset.windowClosesAt ?? ""}
                      format="days"
                      className="text-[11.5px] text-fog"
                    />
                  </dd>
                </div>
              </dl>
              <p className="mt-7 border-t-2 border-dashed border-ink/15 pt-4 font-mono text-[10px] uppercase leading-relaxed tracking-[0.08em] text-fog">
                1% transfer fee · {asset.holders.toLocaleString()} holders · convert
                into the issuer-prescribed destination only
              </p>
            </Panel>
          </Reveal>

          {/* the babysit loop vs set once */}
          <Reveal delay={160}>
            <Panel tone="paper" shadow="lg" className="flex h-full flex-col p-6 md:p-7">
              <Label>Without T-MINUS</Label>
              <ul className="mt-4 space-y-2.5" aria-label="The manual babysitting loop">
                {BABYSIT_LOOP.map((step, i) => (
                  <li
                    key={step}
                    className="flex items-center gap-3 rounded-lg border-2 border-ink/15 bg-bone/60 px-3.5 py-3"
                  >
                    <span className="font-mono text-[10px] font-bold tabular text-fog-2">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="font-mono text-[11.5px] uppercase tracking-[0.06em] text-fog line-through decoration-ink/30 decoration-2">
                      {step}
                    </span>
                    {i === BABYSIT_LOOP.length - 1 ? (
                      <span aria-hidden className="ml-auto font-mono text-[11px] font-bold text-coral">
                        ↻
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
              <div className="mt-6 flex-1" />
              <div className="rounded-xl border-2 border-ink bg-lime p-5 shadow-[4px_4px_0_0_var(--color-ink)]">
                <p className="font-display text-[clamp(1.6rem,3vw,2.1rem)] uppercase leading-none text-ink">
                  With T-MINUS:
                </p>
                <p className="mt-1.5 font-display text-[clamp(1.6rem,3vw,2.1rem)] uppercase leading-none text-ink">
                  the gate speaks first.
                </p>
                <p className="mt-3 font-mono text-[10px] uppercase leading-relaxed tracking-[0.1em] text-ink/70">
                  Issuer instruction, mint state, fee-aware route — then a
                  signature, or a refusal. You stay present. Unattended escrow
                  is the DEVNET protocol proof, not Mainnet custody.
                </p>
              </div>
            </Panel>
          </Reveal>
        </div>

        {/* the fine print */}
        <Reveal delay={220}>
          <div className="mt-6 flex flex-col gap-4 rounded-2xl border-2 border-ink bg-bone-deep p-5 md:flex-row md:items-center md:gap-8 md:p-6">
            <div className="flex items-center gap-3 md:shrink-0">
              <span
                aria-hidden
                className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-ink bg-amber"
              >
                <svg width="18" height="18" viewBox="0 0 18 18">
                  <path d="M9 1.5L17 16H1L9 1.5z" fill="none" stroke="var(--color-ink)" strokeWidth="2" strokeLinejoin="round" />
                  <path d="M9 6.5v4.5M9 13.2v.3" stroke="var(--color-ink)" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </span>
              <p className="font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-ink">
                The fine print bites
              </p>
            </div>
            <p className="text-[14.5px] leading-relaxed text-fog">
              PreStocks tokens carry a 1% transfer fee that ordinary trigger
              orders can’t even see — trigger platforms reject these mints
              outright. Your trigger fires “on price” and quietly underfills
              on reality.{" "}
              <span className="font-semibold text-ink">
                T-MINUS works from the executable ratio — the number that
                actually lands.
              </span>
            </p>
            <code className="mt-1 block flex-1 rounded-lg border-2 border-ink/80 bg-ink px-4 py-3 font-mono text-[10.5px] leading-relaxed text-lime md:mt-0">
              <span className="text-bone-dim">$</span> jupiter trigger →{" "}
              <span className="text-coral">ERROR</span>: Mint PreANxu…uAWq
              <span className="text-bone-dim"> has transfer fee</span>
            </code>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
