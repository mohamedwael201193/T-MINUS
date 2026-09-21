# T-MINUS — FRONTEND NOTES

Production frontend for **T-MINUS**. Default adapter is **BackendSource**
against `https://tminus-api-k2d2.onrender.com`. Local design simulation
remains behind `NEXT_PUBLIC_TMINUS_SOURCE=design` (not the production path).

---

## 1. Architecture

```
src/
  components/tminus/            ← ALL UI (pure React + TS + Tailwind classes)
    TMinusApp.tsx               ← root: providers + hash view router
    system/                     ← design system primitives
      primitives.tsx            ← Button, Panel, Eyebrow, Label, StatusChip, Stat
      logo.tsx                  ← dial mark + wordmark
      Countdown.tsx             ← live mission clock (+ useElapsedFraction)
      Dial.tsx                  ← the chronograph instrument (SVG)
      RatioBand.tsx             ← floor/needle/target spectrum
      Sparkline.tsx             ← ratio history trace
      StateRail.tsx             ← order state machine (+ stepsForOrder)
      ReceiptCard.tsx           ← the paper execution ticket
      Reveal.tsx, Modal.tsx, Grain.tsx, toast.tsx
    landing/                    ← marketing page sections
      Landing.tsx               ← section composition (nav → hero → … → footer)
      Hero.tsx + HeroMachine.tsx← hero + the signature SVG instrument
      Problem, MentalModel, LifecycleMap, OrderExplainer,
      WhyToolsFail, ProofTeaser, Safety, FinalCta, LandingFooter
    app/                        ← application surfaces
      AppShell.tsx              ← top chrome, tabs, wallet button + modal, mobile bottom nav
      ConsoleView.tsx           ← lifecycle panel + ticket + orders + latest proof
      LifecyclePanel.tsx        ← asset switcher (SPACEX live / OPENAI terms-pending)
      OrderTicket.tsx           ← THE order form (validation, plain-English summary)
      MyOrders.tsx              ← order cards, filters, cancel dialog
      OrderDetail.tsx           ← state machine + rule + activity + advanced panel
      ReceiptsView.tsx          ← the proof ledger
  lib/tminus/
    domain/types.ts             ← THE product vocabulary (LifecycleAsset,
                                  ConversionOrder, ExecutionReceipt, …)
    data/                       ← design data (domain-driven names)
      lifecycleData.ts  marketState.ts  orderState.ts
      receiptData.ts    walletState.ts
    adapters/
      sources.ts                ← TMinusSource interface — THE integration boundary
      localDesignSource.ts      ← design-phase implementation + market/order
                                  simulation engine (fills orders live)
      context.tsx               ← React binding (TMinusProvider, useTMinus,
                                  useTMinusVersion via useSyncExternalStore)
    router.ts                   ← hash views + useNow() ticking clock
    utils.ts                    ← cn + formatters (fmtRatio, fmtDate, countdown…)
  app/globals.css               ← design tokens (@theme), utilities, keyframes
  app/layout.tsx                ← fonts: Anton / Space Grotesk / JetBrains Mono
  app/page.tsx                  ← mounts <TMinusApp/> (thin host)
```

**Views** (hash-routed inside one route, mirroring the production URL plan):
`#/` landing · `#/app` console · `#/order/:id` order detail · `#/receipts` proof ledger.

**Portability note.** The UI tree contains **no Next.js-specific code**
(no next/link, next/image, next/font, no API routes, no server
components). Everything under `components/tminus` and `lib/tminus` can
be dropped into a Vite app as-is; you only need to (1) mount
`<TMinusApp/>`, (2) port the ~40 lines of font loading from
`app/layout.tsx` into `index.html` `<head>`, (3) copy the `@theme`
token block + utilities from `app/globals.css` into your Tailwind v4
entry CSS. In this sandbox the product is served through the existing
Next dev server (single-route requirement), which is why the host files
live under `src/app/`.

---

## 2. The data adapter boundary (the one thing that matters)

```
UI components
   │  use only:  useTMinus()  ·  useTMinusVersion()  ·  domain types
   ▼
TMinusSource  (src/lib/tminus/adapters/sources.ts)
   │  implemented by
   ├── LocalDesignSource   (opt-in — NEXT_PUBLIC_TMINUS_SOURCE=design)
   └── BackendSource       (default — live API + Phantom + real receipts)
```

Rules the UI already follows — keep them:
- **Components never import from `data/`** — only through a
  `TMinusSource` (via context or props).
- **`LocalDesignSource` implements the interface plus `start()/stop()`**
  (its simulation loop). A real source can no-op those.
- **Version-based reactivity**: `useTMinusVersion()` wraps
  `useSyncExternalStore(source.subscribe, source.getVersion, () => 0)`.
  A polling/WebSocket backend just bumps `version` and notifies.
- **SSR safety**: the design source is fully deterministic at
  construction (seeded history, fixed ISO timestamps). Live values
  (Date.now, Math.random) only run inside `tick()`, which starts
  post-mount. Countdowns render a stable placeholder until mounted.

**Current production factory:** `adapters/context.tsx` calls
`createBackendSource()` unless `NEXT_PUBLIC_TMINUS_SOURCE=design`.

MAINNET place is **refused** while program `HRLm…` is not executable on
mainnet. Receipts from `/v1/receipts` are labeled **DEVNET** and open
real explorer URLs. Lifecycle catalog is `/v1/prestocks` (Pre* mints only).

---

## 3. Every real-API integration point

| # | Surface | Today (design state) | Replace with |
|---|---|---|---|
| 1 | Asset list + lifecycle facts | `data/lifecycleData.ts` (SPACEX + OPENAI) | Signed lifecycle feed (destinations, ratios, deadlines, tranche calendar, issuer-power snapshots, source hashes) |
| 2 | Executable ratio + history + market events | `LocalDesignSource.stepMarket()` scripted walk | Live quote pipeline (Jupiter price API, fee-aware; cross-checked vs executable delivery) |
| 3 | Order list / create / cancel | `LocalDesignSource` (in-memory, engine fills) | Program accounts: `place` / `cancel` instructions; owner-scoped order PDAs via RPC/getProgramAccounts |
| 4 | Order state machine | engine transitions on ticks | On-chain `Order.status` + fill events; TARGET_REACHED/EXECUTING become keeper status events or optimistic UI |
| 5 | Receipts | `data/receiptData.ts` + engine-generated | Keeper receipt ledger reads (signature, slot, route, feed hash) |
| 6 | Wallet | `data/walletState.ts` (visual-only connect) | `@solana/wallet-adapter-react` behind `connectWallet/disconnectWallet`; balances from RPC |
| 7 | Countdown clocks | client `Date.now()` vs feed dates | same — dates just come from the feed |
| 8 | Notices → toasts | engine notices array | backend/keeper event stream |

## 4. Wallet integration points

- `AppShell.tsx → WalletButton + WalletModal` — visual states done
  (disconnected / connecting 900ms / connected with balances +
  copy + disconnect). The provider list is `data/walletState.ts →
  WALLET_PROVIDERS` (Phantom/Solflare/Backpack — replace glyphs with
  real adapter metadata).
- `TMinusSource.connectWallet()` is the ONLY place a real adapter
  should be called. It currently resolves after a timeout and sets a
  design address — swap the body.
- Order placement gates on `wallet.connected` (`OrderTicket.onSubmit`)
  — keep that gate; it opens the modal instead of submitting.

## 5. Order integration points

- `OrderTicket.tsx` — validation bounds live in
  `TARGET_BOUNDS / FLOOR_BOUNDS / AMOUNT_BOUNDS / DEADLINE_ISO` at the
  top of the file. `AMOUNT_BOUNDS.max` is hard-wired to the design
  balance; wire it to the live wallet balance.
- `onSubmit → source.createOrder(input)` — replace with: build tx →
  wallet sign → `place` instruction → optimistic PLACED order from the
  returned account. The engine already models the async arming
  (PLACED → ARMED at +1.6s → WATCHING at +3.4s) — mirror real
  confirmation timing there.
- Cancel dialogs (`MyOrders.tsx`, `OrderDetail.tsx`) call
  `source.cancelOrder(id)` — swap for the `cancel` instruction; note
  the disclosed 1% fee on the escrow-return leg is already in the copy.

## 6. Receipt integration points

- `ReceiptCard.tsx` renders `ExecutionReceipt` 1:1 including `eventKind`
  (`fill` / `cancel` / `expire` / `place`) and `network`.
- “View on explorer” is a real `<a href={receipt.explorerUrl}>` when the
  API provides a cluster-correct URL. No `window.open`, no placeholder toast.
- “COPY SIG” copies `receipt.signature`.
- Landing `ProofTeaser` prefers a live fill. If none exists it shows the
  design fixture labeled **SIMULATION** (not a chain signature).

## 7. Lifecycle feed integration points

- `LifecyclePanel.tsx` (SPACEX card) — every Stat maps to a feed field
  (`price, destinationPrice, transferFeeBps, windowClosesAt, tranches`).
- OPENAI tab is the **TERMS_PENDING** pattern — when a lifecycle event
  publishes, the same panel flips to the live layout unchanged.
- `Hero.tsx` live strip + `HeroMachine.tsx` dial consume
  `getMarket()` + `useElapsedFraction(windowOpenedAt, windowClosesAt)`.
- `LifecycleMap.tsx` station positions are computed from the window
  clock; the tranche chips map to `asset.tranches`.

## 8. Environment variables

```
NEXT_PUBLIC_TMINUS_API=https://tminus-api-k2d2.onrender.com
NEXT_PUBLIC_TMINUS_SOURCE=      # omit for live BackendSource; `design` for fixtures
```

`BackendSource` reads `/v1/prestocks`, `/v1/feed`, `/v1/feed/refresh`,
`/v1/quote`, `/v1/receipts`, `/v1/program`, `/v1/balances`. Wallet is
injected Phantom/Solflare/Backpack — no secret in the browser.

## 9. Components that should NOT be rewritten during integration

The entire `system/` layer and every presentational surface is
data-source agnostic — integrate behind the adapter, don't touch:
`Button, Panel, Eyebrow, Label, StatusChip, Stat, Countdown, Dial,
RatioBand, Sparkline, StateRail (+stepsForOrder), ReceiptCard, Reveal,
Modal, Grain, toast`, all `landing/*` sections, `AppShell`,
`ConsoleView`, `OrderCard`, `OrderDetail` chrome, `ReceiptsView`.
Realistic rewrite candidates: only the *bodies* of the source methods.

## 10. Known frontend assumptions

1. **One design holder.** The console assumes the connected wallet is
   the order owner (orders are visible pre-connect as session state).
   Real integration should scope `listOrders()` to the connected owner.
2. **Executable ratio** is a single scalar per asset (post-fee, size-0
   assumption). A size-aware ladder (depth curve) may replace it; the
   UI consumes only `executableRatio` + `history`.
3. **Raw-unit math** is display-only: `amount × rawMultiplier` shown in
   the advanced panel. The program stores raw — keep the multiplier
   pinned from the feed.
4. **Failsafe dates** are date-precision (UTC midnight). The program
   uses `failsafe_ts` seconds — the UI converts.
5. **Fee on cancel** (1% return leg) is disclosed in copy and applied
   to the design wallet balance; mirror whatever the program does.
6. **No persistence** — design state is in-memory per page load
   (deliberate: deterministic first frames, no hydration mismatches).
7. **Design-phase honesty labels**: the app footer and receipts ledger
   carry “design-phase build · onchain integration in progress”, and
   the advanced panel marks its values as design-phase. Remove/adjust
   these when live.
8. Receipts/signatures/addresses in `data/` are **design values** —
   realistic in shape, not real transactions. Nothing claims mainnet.
9. The market simulation (quiet → tranche climb → settle) exists so
   order state transitions are demonstrable end-to-end; delete
   `stepMarket/stepOrders` when the real feed lands.
10. Mobile bottom nav shows Console/Receipts only; the order-detail
    back link and in-page anchors cover the rest.

---

## Dev commands

```
npx next dev -p 3001
npx next build
npx tsc --noEmit
```

Default production adapter is `BackendSource`. Do not claim MAINNET
place while `programMainnetExists` is false.
