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
