# T-MINUS PROJECT HISTORY

Append-only execution ledger. No secrets.

---

## 2026-09-20T22:25Z — PHASE 0 — Solana CLI install

- **action:** Install Agave/Solana CLI in Ubuntu WSL (`devmo`) via official `https://release.anza.xyz/stable/install`
- **reason:** Windows native PATH had no `solana`; Anchor docs require WSL on Windows
- **command:** `scripts/wsl-install-solana.sh`
- **result:** PASS
- **evidence:** `solana-cli 4.2.2 (src:e29e5d91; feat:21b0d33a, client:Agave)`
- **test:** installer printed version
- **decision:** Use WSL for program build/test/deploy
- **files changed:** `scripts/wsl-install-solana.sh`
- **known risks:** PATH must be exported in non-login shells
- **next step:** AVM + Anchor 1.2.0, keypairs, git

---

## 2026-09-20T22:37Z — PHASE 0 — AVM + Anchor 1.2.0

- **action:** Install AVM and `avm install latest`
- **reason:** Official Anchor Windows path is WSL
- **command:** `scripts/wsl-install-anchor.sh`
- **result:** PASS
- **evidence:** `anchor-cli 1.2.0`; `avm 1.2.0`; AVM reset Solana CLI to **4.1.2**
- **test:** `scripts/wsl-phase0-verify.sh` — cluster 4.3.0-rc.0, epoch **1039**
- **decision:** Keep WSL toolchain; do not use native Windows solana
- **files changed:** `scripts/wsl-install-anchor.sh`, `scripts/wsl-phase0-verify.sh`
- **known risks:** `cargo-build-sbf` reports platform-tools v1.54; build still succeeded
- **next step:** keypairs (already present), git ignore `.env`

---

## 2026-09-20T22:50Z — PHASE 0 — git + ignore + keys

- **action:** `git init -b main`; `git check-ignore -v .env`; confirm key pubkeys
- **reason:** Phase 0 pass criteria
- **command:** `git init`; `git check-ignore -v .env`
- **result:** PASS — `.gitignore:1:.env` ignores `.env`
- **evidence:** deploy `FrwqWhgEhbSnvKXzsG74qkB4ZsRiiheay7LcWBNd5DTj`; keeper `FbsV4KELsCki2ZujWfRPvu4kpWHDdr1bxAvGNhU13hPf`; program `HRLmVcuk6PRcVwB3UVpcbEC3LVVMhdLZfPvHtmL2PUdL`
- **test:** key files exist under `%USERPROFILE%\.tminus\keys` (not in git)
- **decision:** Remote origin `https://github.com/mohamedwael201193/T-MINUS`
- **files changed:** `.gitignore`
- **known risks:** deploy and keeper mainnet balances are **0 SOL**
- **next step:** Phase 1 Jupiter composition

---

## 2026-09-20T22:50Z — PHASE 1 — mint re-fetch + Jupiter quote + compose sim

- **action:** Re-fetch SPACEX mint, epoch, Jupiter quote, Swap V2 `/build` + memo stand-in, simulate without signing
- **reason:** Close G9/G10/G11/G12 from live data
- **command:** `pnpm sim:compose`; RPC `getAccountInfo`/`getEpochInfo`; lite-api quote
- **result:** PASS with honest simulation error
- **evidence:** `evidence/phase1-sim.json`, `evidence/mint-spacex.json`
  - epoch 1039, fee 100 bps, hook programId null, paused false, Token-2022
  - quote 200_000_000 → 76_706_836 SPCXx, Meteora DLMM
  - serialized **565** bytes, ALT `8CoUnad218pEqxme5jnn9CNu4BmaRAkP7Af8uT9ZBg29`
  - simulate `err=AccountNotFound`, `unitsConsumed=0` (taker/fee-payer account does not exist)
- **test:** labeled SIMULATION / MAINNET
- **decision:** Keep atomic Swap V2 + fill path; two-tx inventory fallback remains if a funded sim fails on CU/size
- **files changed:** `apps/keeper/scripts/sim-compose.ts`
- **known risks:** cannot get `err: null` until keeper is funded
- **next step:** program build

---

## 2026-09-20T23:03Z — PHASE 2 — `anchor build`

- **action:** Compile program; drop `spl-token-2022` v10 (does not compile on this SBF toolchain); parse pause/hook via TLV; Anchor 1.2 `CpiContext::new(Pubkey, ...)`
- **reason:** Phase 2 exit is a successful release build
- **command:** `scripts/wsl-anchor-build.sh`
- **result:** PASS
- **evidence:** `target/deploy/tminus.so`; IDL `idl/tminus.json`; rust unit tests 3/3
- **test:** `cargo test` ceil_ratio identity / round-up / zero-out
- **decision:** Program ID remains `HRLmVcuk6PRcVwB3UVpcbEC3LVVMhdLZfPvHtmL2PUdL`
- **files changed:** `programs/tminus/**`, `Anchor.toml`, `Cargo.toml`
- **known risks:** unexpected_cfg warnings from Anchor 1.2 macros
- **next step:** integration tests

---

## 2026-09-20T23:10Z — PHASE 3 — harvest-before-close + localnet tests

- **action:** Token-2022 close failed with 0x23 withheld fees; add `HarvestWithheldTokensToMint` (`[26,4]`) before escrow close
- **reason:** Real Token-2022 fee accounts cannot close while withheld > 0
- **command:** `anchor test --skip-build --validator legacy`
- **result:** PASS — 5/5
- **evidence:** place/cancel, under-delivery+fill, expire, failsafe, zero-amount
- **test:** local fee mint 100 bps, post-fee 990_000 on 1_000_000 in
- **decision:** Keep partial fills; harvest errors ignored so non-fee Token-2022 sources can still close
- **files changed:** `programs/tminus/src/lib.rs`, `tests/tminus.ts`
- **soSha256:** `34ce9c9cc0ae4c8fe288409121e3fe8d40e1fb0447e6bdc5f808ab19365baaf5`
- **known risks:** TLV pause/hook walker assumes packed extensions (true for live SPACEX; padded local mints skip)
- **next step:** API/keeper already scaffolded; migrate+smoke; then devnet

---

## 2026-09-20T23:08Z — PHASE 6 local — migrate + API smoke

- **action:** Apply SQL schema via `DIRECT_URL`; hit health/ready/feed/quote/receipts/keeper
- **reason:** Backend must talk to real Postgres and real Jupiter
- **command:** `pnpm --filter @tminus/api migrate`; `node --import tsx ./scripts/api-smoke.ts`
- **result:** PASS
- **evidence:** `evidence/api-smoke.json` — ready slot 448875455, db true, quote outAmount 76706836, feed MAINNET
- **test:** concurrent lease `TMINUS_DB_TEST=1` PASS
- **decision:** No API custody
- **files changed:** `apps/api/**`, `migrations/001_init.sql`
- **known risks:** PgBouncer requires `prepare: false`
- **next step:** Render deploy after secret scan + commit

---

## 2026-09-20T23:40Z — PHASE 6/9 — free Render web service (My Workspace)

- **action:** Deploy API+embedded keeper as one **free** Render web service after the operator switched Render API keys
- **reason:** Background workers are not free; starter quota on the previous workspace required paid instances
- **command:** `node scripts/render-free.mjs`; external GET probes; Chrome dashboard
- **result:** PASS
- **evidence:**
  - service `srv-dao6t2rtqb8s73e52mbg` plan **free**
  - URL `https://tminus-api-k2d2.onrender.com`
  - commit `985d4689468a5d80df7952fb1ffd8caf26a68f6a`
  - `/health` 200, `/ready` db true slot 448882554
  - `/v1/feed` MAINNET `verification_state=verified` deadline extracted `2027-03-12T23:59:00.000Z`
  - `/v1/quote` Jupiter outAmount 76706836
  - `/v1/keeper` halted false, send still disabled
  - `/v1/receipts` empty (honest; no fills sent)
  - `evidence/render-services.json`, `evidence/render-free-health.json`
- **test:** probes from this machine and Chrome `/health` + Render Live deploy
- **decision:** One-process architecture on free tier. `KEEPER_SEND_ENABLED=false`. Do not claim mainnet fills.
- **files changed:** `apps/api/src/index.ts`, `apps/keeper/src/run.ts`, `render.yaml`
- **deployment URL:** `https://tminus-api-k2d2.onrender.com`
- **known risks:** Free instances spin down when idle. Previous Ffcvv **starter** `tminus-api` / `tminus-keeper` could not be suspended from this key (404). Operator should confirm those paid services are stopped in the other workspace.
- **next step:** Devnet program deploy still blocked on faucet SOL; mainnet proof still blocked on 0 SOL + send enable

---

## 2026-09-20T23:42Z — PHASE 9 — dependency audit

- **action:** `pnpm audit --prod`
- **result:** FAIL (recorded, not bypassed)
- **evidence:** 3 high + 2 moderate, all transitive: `bigint-buffer` via `@solana/spl-token` (no patched release), `toml` via `@coral-xyz/anchor`, `uuid`/`stream-json` via `@solana/web3.js`
- **decision:** Do not vendor-fork Solana SDK this phase. No direct dependency on the vulnerable packages. Re-audit when Anchor/web3.js ship updates.
- **next step:** keep building; do not claim a clean audit

---

## 2026-09-20T23:49Z — PHASE 3/5 — keeper pair filter + rust ratio tests

- **action:** Skip non-SPACEX/SPCXx orders; halt on transfer-fee bps change; add spend-cap helper tests; rust overflow tests
- **command:** `pnpm test`; `pnpm typecheck`; `scripts/wsl-cargo-test.sh`; `node scripts/live-status.mjs`
- **result:** PASS
- **evidence:** cargo `5 passed; 0 failed`; node tests sdk 4 / api 5 / keeper 7; `evidence/live-status.json` — program account **absent** on mainnet and devnet; wallets 0 SOL; Render `/health` 200 `/ready` db true
- **test:** ceil_ratio overflow, halt pause/hook/fee-change, spend cap, bounty-pair filter, invalid PDA
- **decision:** Do not deploy until SOL exists. Keep `KEEPER_SEND_ENABLED=false`.
- **files changed:** `apps/keeper/src/policy.ts`, `apps/keeper/src/loop.ts`, `programs/tminus/src/lib.rs`
- **known risks:** program ID is declared but not an on-chain executable yet
- **next step:** wait for faucet/mainnet SOL

---

## 2026-09-20T23:53Z — PHASE 3 — localnet 7/7 after dst mint writable + adversarial cases

- **action:** Mark Fill `dst_mint` mutable; add identical-mint and non-owner cancel tests; attempt devnet deploy
- **command:** `scripts/wsl-deploy-devnet.sh`; `scripts/wsl-anchor-test.sh`
- **result:** localnet PASS 7/7; devnet deploy FAIL (0 SOL, faucet rate-limited)
- **evidence:** mocha 7 passing (8s); concurrent lease PASS; Render live on `e039646` with `lastFeeBps=100`
- **test:** place/cancel/fill/expire/failsafe/zero/identical-mints/non-owner-cancel
- **decision:** Keep program off-chain until wallets are funded
- **files changed:** `programs/tminus/src/lib.rs`, `tests/tminus.ts`, `scripts/wsl-deploy-devnet.sh`
- **known risks:** still no on-chain program account
- **next step:** SOL for `FrwqWhgEhbSnvKXzsG74qkB4ZsRiiheay7LcWBNd5DTj`

---

## 2026-09-21T00:00Z — PHASE 7/9 — safety card, pause/hook tests, free Render live on 275eee9

- **action:** Extract mint TLV pause/hook checks; add feed-stale halt helper; Phase 7 live simulate-place (no send); CI rust+mock-guard
- **command:** `pnpm test`; `pnpm phase7`; `scripts/wsl-anchor-test.sh`; `node scripts/render-status.mjs`
- **result:** Render `tminus-api-k2d2` live on `275eee9`, plan free, `/ready` db true, keeper `lastFeeBps=100` send off; program still absent; wallets 0 SOL
- **evidence:** `evidence/live-status.json`; `evidence/phase7-safety.json`
- **test:** rust TLV pause/hook; mocha pause/hook/min-fill/invalid-ratio; keeper feed-stale
- **decision:** Do not enable `KEEPER_SEND_ENABLED`. Do not mark G13.
- **files changed:** `programs/tminus/src/lib.rs`, `tests/tminus.ts`, `apps/keeper/src/policy.ts`, `apps/keeper/src/loop.ts`, `.github/workflows/ci.yml`
- **known risks:** still no on-chain program account
- **next step:** SOL for deploy wallet; human authorize tiny mainnet spend after program exists

---

## 2026-09-21T00:15Z — PHASE 4 — DEVNET program live + place/cancel/fill/expire

- **action:** Pay deploy + e2e from user-funded wallet `CpTxsgPjvaaPSaBKkijvB1h3hzgJmPiTsWNhuS7tRkgX` (devnet 5 SOL; mainnet 0). Seed never written to git.
- **command:** `scripts/wsl-deploy-devnet.sh`; `node --import tsx scripts/e2e-devnet.ts`
- **result:** Program executable on devnet; mock Token-2022 fee mint e2e PASS (post-fee 990000); IDL upload skipped after CLI path glitch
- **evidence:** `evidence/devnet-e2e.json`
- **test:** place, cancel, fill (separate filler), expire
- **decision:** Keep `KEEPER_SEND_ENABLED=false` on mainnet. Do not treat mock mints as SPACEX.
- **files changed:** `scripts/wsl-deploy-devnet.sh`, `scripts/e2e-devnet.ts`, README
- **known risks:** recovery phrase was pasted in chat (exposed); mainnet still unfunded
- **next step:** mainnet SOL for G13, or keep demo labeled DEVNET

---

## 2026-09-21T00:22Z — RECEIPTS — live API shows confirmed DEVNET explorer sigs

- **action:** Fetch confirmed e2e txs; upsert `receipts` via DIRECT_URL; probe public `/v1/receipts`
- **command:** `node --import tsx scripts/ingest-devnet-receipts.ts`; GET `https://tminus-api-k2d2.onrender.com/v1/receipts`
- **result:** 4 rows labeled DEVNET (place/cancel/fill/expire); CI `f7de504` success
- **evidence:** `evidence/devnet-receipts.json`
- **test:** live GET matches explorer sigs
- **decision:** On-chain IDL upload blocked (WSL `anchor idl` needs Node; not required for execution). Keep mainnet send off.
- **files changed:** `scripts/ingest-devnet-receipts.ts`
- **known risks:** receipts are DEVNET mock-mint, not SPACEX
- **next step:** mainnet SOL for G13

---

## 2026-09-21T00:28Z — DEVNET IDL + public program status

- **action:** Install user-local Node in WSL; `anchor idl init`; add `/v1/program` that reads both clusters
- **command:** `scripts/wsl-idl-devnet.sh`; `pnpm --filter @tminus/api test`
- **result:** IDL metadata `FMSPeg37dVKeHARb5gaBiN8epoJcinqSBHMqkLKu8f2n`; `/v1/program` mainnet exists=false, devnet executable=true; API tests 9/9
- **evidence:** `evidence/devnet-idl-meta.json`
- **test:** program-status unit + live `/v1/program` in server.test
- **decision:** Still no mainnet deploy. Keeper send off.
- **files changed:** `apps/api/src/server.ts`, `apps/api/src/program-status.ts`
- **known risks:** none new
- **next step:** mainnet SOL for G13

---

## 2026-09-21T00:33Z — LIVE VERIFY — Render /v1/program + matching program bytes

- **action:** Wait for free Render deploy of `136ba97`; dump on-chain program; probe user-fund tokens on both clusters
- **command:** `node scripts/render-wait-free.mjs`; `scripts/wsl-dump-program.sh`; `node scripts/live-status.mjs`
- **result:** Render live, `/v1/program` 200 (devnet executable, mainnet absent). On-chain ELF 254768 bytes sha256 `978c80e5ce1f4a8328f885c89f35d0c9d3b1aa93031903d2b8ee9c22d1cffff6` **exact-match** `target/deploy/tminus.so`. User-fund `CpTxsg…` mainnet 0 SOL and 0 token accounts; devnet ~3.500189854 SOL plus leftover mock Token-2022 balances from e2e. CI `136ba97` success.
- **evidence:** `evidence/render-free-health.json`; `evidence/devnet-program-bytes.json`; `evidence/live-status.json`
- **test:** public GET `/health` `/ready` `/v1/feed` `/v1/quote` `/v1/keeper` `/v1/receipts` `/v1/program` all 200
- **decision:** Keep `KEEPER_SEND_ENABLED=false`. Do not treat the funded wallet as mainnet-capable. Do not mark G13. Rotate the chat-pasted recovery phrase.
- **files changed:** `scripts/live-status.mjs`, `scripts/render-wait-free.mjs`, `scripts/wsl-dump-program.sh`
- **known risks:** recovery phrase exposed in chat; mainnet still unfunded
- **next step:** mainnet SOL + SPACEX inventory for G13, or keep demo labeled DEVNET

---

## 2026-09-21T00:40Z — KEEPER PATH — inventory plan + real fill compose + DEVNET partial fills

- **action:** Replace memo stand-in with real `fill` ix in Jupiter compose; choose inventory vs atomic swap in keeper policy; prove two `fillIx` inventory fills on DEVNET; live `/v1/orders` during the open window
- **command:** `pnpm test`; `pnpm sim:compose`; `node --import tsx scripts/e2e-devnet-keeper.ts`
- **result:** Compose **636** bytes (`fillStandInMemo: false`) still `AccountNotFound` on mainnet. DEVNET order `EpMA1LWpJXU67WBTF2LhhTX6ucYRsbf7z7sAaC8fikgC` escrow 990_000; partial fill 400_000 then close 590_000; owner dst 990_000. Live `/v1/orders?cluster=devnet` 200 open → 200 filledRaw=400000 → 404 after close. Receipts ingested (place + two fills).
- **evidence:** `evidence/phase1-sim.json`; `evidence/devnet-keeper-fill.json`
- **test:** sdk 6, api 9, keeper 13; secret-scan PASS
- **decision:** Keep Render `KEEPER_SEND_ENABLED=false`. `KEEPER_INVENTORY_WITHOUT_QUOTE` stays false on mainnet. G8 PASS DEVNET. G13 still blocked (0 mainnet SOL / 0 SPACEX).
- **files changed:** `apps/keeper/src/policy.ts`, `apps/keeper/src/loop.ts`, `apps/keeper/src/orders.ts`, `apps/keeper/scripts/sim-compose.ts`, `scripts/e2e-devnet-keeper.ts`, `packages/sdk/src/index.ts`
- **known risks:** recovery phrase exposed; mainnet unfunded
- **next step:** mainnet SOL + SPACEX inventory for G13

---

## 2026-09-21T00:50Z — FAILSAFE TICK — real keeper loop filled on DEVNET

- **action:** Place failsafe order (`failsafe_ts` in the past, floor 1e9, min_ratio 2e9) and a live control order; prove 1:1 fill on the control simulates `UnderDelivery` 6003; run `tick()` with send enabled locally against DEVNET, inventory-without-quote, filler keypair
- **command:** `node --import tsx scripts/e2e-devnet-failsafe-tick.ts`; `node scripts/render-wait-free.mjs`
- **result:** `tick()` sent fill `5cZurXQR…`; failsafe PDA closed; owner dst 990_000; memcmp found both open orders; receipt ingested with `failsafeFlag: true`. Render still live on `8da78a6`, `KEEPER_SEND_ENABLED=false`, CI success. Control order cancelled.
- **evidence:** `evidence/devnet-failsafe-tick.json`; `evidence/render-free-health.json`
- **test:** on-chain UnderDelivery vs failsafe tick fill
- **decision:** Do not enable Render send. G13 still blocked.
- **files changed:** `scripts/keeper-tick-once.ts`, `scripts/e2e-devnet-failsafe-tick.ts`
- **known risks:** recovery phrase exposed; mainnet unfunded
- **next step:** mainnet SOL + SPACEX inventory for G13

---

## 2026-09-21T00:55Z — DOUBLE FILL + skip GPA on missing program

- **action:** Stop keeper `getProgramAccounts` when the program is not executable (live `/v1/keeper` showed RPC 413 data-allowance). Prove duplicate fills on DEVNET: concurrent 1 confirm / 1 fail, sequential second fill Custom 3012 after close.
- **command:** `pnpm --filter @tminus/keeper test`; `node --import tsx scripts/e2e-devnet-double-fill.ts`
- **result:** Race wins=1 fails=1. Sequential drain `2FMcQp6…` then reject `UKx5QSW…`. Keeper tests 14/14. Mainnet still 0 SOL / program absent.
- **evidence:** `evidence/devnet-double-fill.json`; `evidence/live-status.json`
- **test:** `shouldScanProgramAccounts`; DEVNET double-fill
- **decision:** Keep Render send off. Localnet mocha airdrop flaked this run; do not claim 12/12 localnet.
- **files changed:** `apps/keeper/src/orders.ts`, `apps/keeper/src/loop.ts`, `scripts/e2e-devnet-double-fill.ts`, `tests/tminus.ts`
- **known risks:** public RPC quota; mainnet unfunded
- **next step:** mainnet SOL + SPACEX inventory for G13

---

## 2026-09-21T01:06Z — MAINNET PREFLIGHT — 0.032 SOL cannot rent the program

- **action:** Confirm Phantom inbound SOL, refuse a doomed mainnet deploy, gate `scripts/wsl-deploy-mainnet.sh` at 1.9 SOL, fix CI keeper tests that imported `config.ts` without a keypair, airdrop the localnet payer before mint creation
- **command:** `pnpm preflight:mainnet`; `scripts/wsl-deploy-mainnet.sh`; `GET /v1/feed/refresh`; keeper tests with `KEEPER_KEYPAIR_PATH=/dev/null`
- **result:** Inbound `57c5k5Ff…` credited **0.04414954 SOL**. Phantom swap `4ZDgQRy9…` spent **0.011716281 SOL** for **1,827,211 raw SPACEX** (scaled UI ~0.009). Remaining **0.032433259 SOL**. `solana rent 254768` = **1.294871680 SOL**. Deploy **refused** (no buffer upload). Render `ddc6542` live; `/v1/keeper` `lastRpcError=null` after skipping GPA on a missing program; feed refreshed, halt cleared. CI `ddc6542` node job failed on missing keeper keypair — fixed by scanning policy without loading config + ephemeral keypair when send is off.
- **evidence:** `evidence/mainnet-deploy-preflight.json`; `evidence/live-status.json`
- **test:** keeper 14/14 under CI env
- **decision:** Do not enable Render send. Do not mark G13. Next deploy attempt only after **2.0 SOL** lands on `CpTxsg…`; then place the dust SPACEX already held.
- **files changed:** `scripts/wsl-deploy-mainnet.sh`, `scripts/mainnet-preflight.mjs`, `apps/keeper/src/scan-policy.ts`, `apps/keeper/src/config.ts`, `tests/tminus.ts`
- **known risks:** recovery phrase exposed in chat — do not leave extra funds after the tiny proof
- **next step:** 2.0 SOL on `CpTxsgPjvaaPSaBKkijvB1h3hzgJmPiTsWNhuS7tRkgX`

---

## 2026-09-21T01:28Z — SIZE + RENT — optimized ELF 209,256 bytes; min deploy 2.14859112 SOL

- **action:** Measure mainnet `SysvarRent`, shrink `.so` without changing ix behavior, re-run cargo/mocha/node tests, recompute upgradeable deploy peak
- **command:** `anchor build` with `opt-level=z` and `anchor-spl` default-features off; `pnpm test`; `scripts/wsl-anchor-test.sh`; `node scripts/mainnet-rent.mjs`
- **result:** ELF **254,768 → 209,256** bytes (−17.86%, sha `838ebc5c…`). `opt-level=3` was **252,512** (worse). Mainnet rent is **5080** lamports/byte-year, **1-year** exemption. Peak during `solana program deploy` = buffer 1.06385868 + programdata 1.06389932 + program 0.00083312 = **2.12859112 SOL**. Plus **0.02 SOL** fee buffer → **2.14859112 SOL** (`2,148,591,120` lamports). After success, buffer is refunded; **1.06473244 SOL** stays locked. cargo 10/10, mocha 12/12, node 6+9+14.
- **evidence:** `evidence/program-size-opt.json`; `evidence/mainnet-deploy-rent.json`; `evidence/program-build.json`
- **test:** LOCALNET 12/12 on sha `838ebc5c…`
- **decision:** Keep overflow-checks. Do not enable Render send. Do not start a mainnet buffer upload.
- **files changed:** `Cargo.toml`, `programs/tminus/Cargo.toml`, `programs/tminus/src/lib.rs`, `scripts/mainnet-rent.mjs`, `scripts/wsl-deploy-mainnet.sh`
- **known risks:** optimized local ELF no longer byte-matches the already-deployed **devnet** 254,768-byte program
- **next step:** mainnet deploy when the payer holds at least 2.14859112 SOL

---

## 2026-09-21T01:55Z — PRESTOCKS-FIRST — Option B + live frontend adapter

- **action:** Re-research live PreStocks (catalog, metrics, issuer pages, ecosystem, Stocklana). Choose architecture Option B. Add `/v1/prestocks` and `/v1/balances`. Wire `frontend/` `BackendSource` as the default production path (Phantom + live feed/quote/receipts). Refuse MAINNET place. Label DEVNET receipts as protocol proofs, not SPACEX fills. XAI classified EXPIRED (deadline 12 Sep 2026 passed). Eligibility: Pre* mints only.
- **reason:** Strongest honest PreStocks submission is lifecycle intelligence + proven protocol, not a 2.14859112 SOL mainnet-program badge. Ecosystem (71 apps) has swap/wallets/analytics/bots, not Token-2022 conversion clocks.
- **source used:** https://prestocks.com/api/prestocks ; /api/metrics ; /spacex ; /xai ; /openai ; /ecosystem ; hackathons.solana.com/stocklana ; live API https://tminus-api-k2d2.onrender.com
- **result:** In progress — API catalog + frontend adapter written. Render does not serve `/v1/prestocks` until this commit deploys. MAINNET program still absent. Payer still ~0.032 SOL.
- **evidence:** `evidence/mainnet-architecture-decision.json`
- **test:** pending this turn (`lifecycle-classify` + API server tests)
- **decision:** Do not spend 2.14859112 SOL. Do not fake MAINNET place. Keep `LocalDesignSource` behind `NEXT_PUBLIC_TMINUS_SOURCE=design` only.
- **files changed:** `apps/api/src/prestocks-catalog.ts`, `apps/api/src/lifecycle-classify.ts`, `apps/api/src/balances.ts`, `apps/api/src/server.ts`, `frontend/src/lib/tminus/adapters/backendSource.ts`, `frontend/src/lib/tminus/adapters/context.tsx`, lifecycle/order/receipt UI, README, IMPLEMENTATION_PLAN, FRONTEND_NOTES
- **known risks:** frontend nested install is a heavy Next template; Render deploy lag; `/api/prestocks` is a root array with `contract_address` (not `{tokens:[].splMint}`)
- **next step:** run API tests, browser QA against live Render after deploy, do not push secrets

---

## 2026-09-21T02:10Z — COMMIT + PUSH — 48f272b on origin/main

- **action:** API tests 16/16. Live catalog parse: official `/api/prestocks` is a root array with `contract_address`. SPACEX CONVERSION_WINDOW to 12 Mar 2027; XAI EXPIRED 12 Sep 2026. Committed frontend BackendSource + Option B decision. Pushed to GitHub so Render can pick up `/v1/prestocks` and `/v1/balances`.
- **result:** `48f272b` on `main`. Secret-scan PASS. Did not commit wallet screenshots, nested frontend `.git`, or `.env`.
- **evidence:** `evidence/prestocks-catalog-live.json`; `evidence/mainnet-architecture-decision.json`
- **test:** `pnpm test` sdk 6 + api 16 + keeper 14
- **decision:** Still Option B. Still do not spend 2.14859112 SOL.
- **known risks:** Render free deploys lag; frontend `node_modules` not installed in this workspace yet; browser QA not closed
- **next step:** wait for Render `/v1/prestocks`; install frontend deps; browser QA paths 1–7

---

## 2026-09-21T02:25Z — BROWSER QA START — live catalog on Render + console

- **action:** Render `/v1/prestocks` is live after `48f272b`. Frontend on localhost:3001. Landing shows MAINNET + SPACEX $120.69 + MAR 12 2027. Console lists official Pre* assets; XAI EXPIRED; Jupiter executable ratio **0.7671** (display units, not raw). SET ORDER without wallet toasts connect. Receipts labeled DEVNET-SRC/DST with real explorer sig `5cZurXQR…`. Fixed OrderTicket syntax, SSR crash on empty feed, raw/display quote ratio.
- **result:** Paths 1 (landing→app) and XAI lifecycle work. Place still honestly refused. Phantom connect not yet exercised in this Chrome session.
- **test:** api 16/16 earlier; visual Chrome snapshot of `#/` and `#/app`
- **decision:** Still Option B. Do not mark certification complete.
- **next step:** wallet connect/reject, receipts explorer tab, mobile viewport, commit remaining frontend fixes, keep history

---

## 2026-09-21T03:00Z — RECEIPTS HONEST + FRONTEND CERT SLICE

- **action:** Classify live `/v1/receipts` by `payload.kind` (fill/cancel/expire/place). Receipts ledger uses a real `<a href>` explorer URL (`cluster=devnet`). Landing proof teaser prefers a live fill; design fixtures are labeled SIMULATION and no longer carry fake chain signatures. One-shot `GET /v1/feed/refresh` on BackendSource start. Removed hardcoded landing tranche `DEC 08 · FULL`. Dust wallet min amount 0.0001. Secret-scan skips `.next`. README/plan/FRONTEND_NOTES match Option B + `frontend/`.
- **reason:** Cancel/expire were labeled TARGET MET; `window.open` was popup-blocked; production path must not invent tranches or signatures.
- **source used:** live `https://tminus-api-k2d2.onrender.com/v1/receipts`; Chrome tabs localhost:3001 and explorer `5cZurXQR…?cluster=devnet`
- **result:** Ledger shows **4 fills · 8 on-chain**. Place/cancel/expire badges match API kinds. Explorer tab opened **Success** on DEVNET for keeper failsafe fill `5cZurXQR…`. SET ORDER while disconnected toasts CONNECT A WALLET FIRST. Connected session earlier showed live MAINNET dust **0.0091 SPACEX** and refused oversize 0.01. XAI EXPIRED / HALTED. Landing: PRESTOCKS · LIFECYCLE ORDERS + live 0.7671 / MAR 12 2027. `npx next build` PASS (types skipped by delivered `ignoreBuildErrors`). `pnpm test` sdk 6 + api 16 + keeper 14. secret-scan PASS files=418.
- **evidence:** Chrome explorer https://explorer.solana.com/tx/5cZurXQRKMZGWoLhpyamUjGQ9dZn61UgckDf7osoVwk34U6kVMNJ6XuAGiSH7GDoiWaTa2BKV9EXjFHHvVKAuwXw?cluster=devnet
- **test:** node tests 6+16+14; secret-scan; next build; browser paths 1, 2, 6, wallet-gate, XAI expired, mobile 390×844
- **decision:** Still Option B. Do not spend 2.14859112 SOL. Do not fake MAINNET place. Phantom re-approve after reload is human-only.
- **files changed:** `frontend/src/lib/tminus/adapters/backendSource.ts`, `ReceiptCard.tsx`, `ReceiptsView.tsx`, `ConsoleView.tsx`, `ProofTeaser.tsx`, `receiptData.ts`, `OrderTicket.tsx`, `LifecycleMap.tsx`, `frontend/package.json`, `scripts/secret-scan.mjs`, `.gitignore`, README, IMPLEMENTATION_PLAN, FRONTEND_NOTES, PROJECT_HISTORY
- **known risks:** delivered Next config still `typescript.ignoreBuildErrors=true`; no frontend unit tests; MAINNET program absent so paths 3–5 (live fill/cancel/failsafe on PreStocks) cannot close
- **next step:** push this commit; keep Option B; do not mark the goal complete while the mainnet program remains a funded human decision

---

## 2026-09-21T03:35Z — COMPILE FIX + SELECTED PRESTOCK + TRUSTED WALLET

- **action:** Dev server crashed with `mapReceipt` defined twice after extracting `receiptMap.ts`. Removed the local duplicate. Shared selected PreStock between lifecycle panel and order ticket. Phantom `connect({ onlyIfTrusted: true })` restores a trusted session on reload. XAI SET ORDER is disabled (window closed). Stopped inventing an XAI→SPACEX destination. Added receipt mapping tests to `pnpm test`.
- **reason:** Switching assets used to leave a SPACEX ticket in place; reload dropped a connected wallet; XAI destination was hardcoded, not verified.
- **result:** After reload, Chrome shows **Wallet connected** and live **0.0091 SPACEX**. SET ORDER on SPACEX toasts **PLACE NOT SENT** (no mainnet program). XAI ticket reads **XAI CONVERSION IS HALTED**. Receipt tests 5/5.
- **test:** `node --import tsx --test frontend/src/lib/tminus/adapters/receiptMap.test.ts` PASS 5; compile recovered (`GET / 200`)
- **decision:** Still Option B. Do not spend 2.14859112 SOL.
- **files changed:** `backendSource.ts`, `receiptMap.ts`, `receiptMap.test.ts`, `sources.ts`, `localDesignSource.ts`, `LifecyclePanel.tsx`, `OrderTicket.tsx`, `prestocks-catalog.ts`, `package.json`, `.gitignore`, PROJECT_HISTORY
- **known risks:** Render still serves the old catalog until this commit deploys. MAINNET place/fill remain human-blocked.
- **next step:** commit + push; keep goal open

---

## 2026-09-21T03:48Z — HMR GUARD — getSelectedAssetId crash

- **action:** Fast Refresh kept a pre-revision BackendSource in `useState`, so `LifecyclePanel` called `getSelectedAssetId` on an object that lacked it. Recreate the adapter when those methods are missing; ticket/panel fall back to `spacex`.
- **result:** Console reloads clean — no error messages. SPACEX window + 0.7671 still live. Wallet trusted session still connected.
- **test:** Chrome `#/app` after reload; list_console_messages errors empty
- **decision:** Still Option B.
- **next step:** push this guard

---



