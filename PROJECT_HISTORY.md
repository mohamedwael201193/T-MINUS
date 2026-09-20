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
