# T-MINUS — MASTER IMPLEMENTATION PLAN

Single source of truth. Verified-at **2026-09-21**. Live state wins over older rows.

**Current architecture decision (Option B):** full T-MINUS protocol on **DEVNET** + real PreStocks **MAINNET** lifecycle/market data + honest network labels. Do **not** spend **2.14859112 SOL** on a mainnet program until that spend is proven to add sponsor value. See `evidence/mainnet-architecture-decision.json`.

Frontend exists at `frontend/` (Next.js). Production path is `BackendSource` against `https://tminus-api-k2d2.onrender.com`. `LocalDesignSource` is opt-in via `NEXT_PUBLIC_TMINUS_SOURCE=design` (tests/fixtures only).

---

## 0. Executive Summary

T-MINUS is a **conditional conversion order** for PreStocks Token-2022 mints: escrow source tokens, fill when the **executable destination ratio** meets the user’s target, or after a user-set failsafe time at no worse than the user’s floor. Permissionless fillers. TypeScript keeper on Render. Off-chain lifecycle feed. Frontend in `frontend/` wired to the live API.

**Chosen architecture (one):** Anchor program with four instructions (`place`, `cancel`, `fill`, `expire`) using `token_interface::transfer_checked`; keeper obtains Jupiter **Swap API V2 `GET /swap/v2/build`** instructions and composes them with `fill` in one v0 transaction using returned ALTs. Recurring V1 is unmaintained; Trigger V1 still rejects transfer-fee mints; Trigger V2 docs exclude transfer-fee mints. Pyth is out of the money path.

**Mainnet program:** not deployed. Toolchain: Solana CLI **4.1.2** and Anchor **1.2.0** in WSL (`devmo`). Native Windows has no `solana`/`anchor`.

---

## 1. Frozen Product Definition

- One program, one keeper, one lifecycle feed, one frontend (`frontend/`).
- Core loop: connect → see lifecycle → place order → escrow PreStocks → filler/keeper → ratio or failsafe → destination delivered → receipt.
- Instructions: `place`, `cancel`, `fill`, `expire`.
- Real PreStocks Token-2022. Conditional conversion. Deadline failsafe. User floor. Permissionless fillers. Real receipts.
- No pooled capital, auction, vault, lending, LLM in the money path, Tessera/Clawpump/Meteora bounty artifacts.
- Frontend production path uses live API/RPC. Design simulation is opt-in only.
- Honesty: failsafe does **not** guarantee conversion regardless of liquidity. MAINNET place is refused while the program is undeployed.

Demo pair: **SPACEX → SPCXx**.

---

## 2. Non-Negotiable Rules

1. On-chain program is source of truth for escrow and fill math.
2. No fake balances, signatures, orders, receipts, or liquidity on the production path.
3. Transfer fees accounted on every Token-2022 transfer; store **post-fee received raw**.
4. Ratios in **raw units**; UI converts using a **pinned effective multiplier**.
5. Owner can always `cancel` while unpaused and unfrozen.
6. No admin withdrawal of user escrow.
7. Fill cannot under-deliver vs the active floor (`min_ratio` or `failsafe_floor`).
8. After `hard_expiry`, anyone may `expire` remaining escrow to owner.
9. Keeper has no extra custody beyond a filler wallet + optional inventory.
10. Secrets stay in `.env` / host secrets. Never in markdown.
11. Jupiter hedge uses **Swap V2 `/build`**, not `/order`+`/execute` (those return an assembled tx we cannot inject `fill` into).
12. If a proof gate fails, stop. Do not scrape a workaround.

---

## 3. Current Verified System Facts

| ID | Fact | Source | When | Status |
|---|---|---|---|---|
| V1 | OS Windows 10/11 build 26200; PowerShell 5.1.26100 | `OSVersion` | 2026-09-20 | PASS |
| V2 | Node v24.12.0, npm 11.6.2, pnpm 10.34.5 | CLI | same | PASS |
| V3 | rustc/cargo 1.93.0 | CLI | same | PASS |
| V4 | **solana-cli 4.1.2**, **anchor-cli 1.2.0**, **avm 1.2.0** in WSL `devmo` | CLI | 2026-09-20 22:50Z | **PASS** |
| V5 | gh 2.92.0; git 2.55.0; Docker 29.7.2; Vercel CLI 57.0.0; uv 0.11.3 | CLI | same | PASS |
| V6 | render CLI and supabase CLI **absent** | CLI | same | FAIL (optional CLIs) |
| V7 | Global `tsc` not installed; no `solders`/`solana` Python packages | CLI | same | FAIL (until workspace deps) |
| V8 | GitHub `mohamedwael201193/T-MINUS` public, `main`, size 0, only `README.md` (“# T-MINUS”), 1 commit, 0 issues. Token authenticates as `mohamedwael201193` | `gh api` | same | PASS (empty, usable) |
| V9 | `d:\route\sol` is **not** a git repo | `git status` | same | PASS |
| V10 | SPACEX mint `PreANxuXjsy2pvisWWMNB6YaJNzr7681wJJr2rHsfTh` Token-2022 decimals 9; mint/freeze/permanentDelegate/fee/hook/pause authority `WV9PJN7XTmTLVwbutCLFxp8TyePee6Xq5mRq6Fti5Wc`; hook `programId` **None**; paused **false**; fee **100 bps** (`newerTransferFee.epoch` 1039); older 50 bps epoch 1032 | `getAccountInfo jsonParsed` mainnet | same | PASS |
| V11 | Cluster **epoch 1039** (`slotIndex` 10006/432000) | `getEpochInfo` | same | PASS (fee-doubling epoch **is now**) |
| V12 | `scaledUiAmountConfig.multiplier` **1**, `newMultiplier` **5**, `newMultiplierEffectiveTimestamp` **1781065800** (2026-06-10T04:30:00Z, already past) | RPC | same | PASS (unit hazard) |
| V13 | Jupiter prices **200_000_000 raw SPACEX ≈ 1 display ≈ $117.74** | lite-api quote `swapUsdValue` | same | PASS |
| V14 | SPCXx `Xs3oZwbHvqis4NYcf4YKWmEia2eC84wSiVrcYcTqpH8` Token-2022 **decimals 8**; no `transferFeeConfig` in parsed extensions | RPC | same | PASS |
| V15 | Quote 200_000_000 SPACEX → 76_706_836 SPCXx raw (**0.76706836**), impact ~0.01%, route **Meteora DLMM** direct | lite-api `/swap/v1/quote` | same | PASS (G9 small size) |
| V16 | Swap V2 `GET https://api.jup.ag/swap/v2/build` HTTP 200: `swapInstruction` + `setupInstructions` + `computeBudgetInstructions` + `addressesByLookupTableAddress` | live API | same | PASS (ix available; **not** yet composed with our `fill`) |
| V17 | Trigger V1 `POST lite-api.jup.ag/trigger/v1/createOrder` → `"Mint PreANxu… has transfer fee"` `code` 2 HTTP 500 | live API | same | PASS (gap still real) |
| V18 | Trigger V2 `GET api.jup.ag/trigger/v2` HTTP 404; official docs: Token-2022 **except transfer-fee/hook unless whitelisted**; Recurring V1 **unmaintained** | docs + HTTP | same | PASS (docs); Recurring live accept **not re-proven** (422 on guessed body) |
| V19 | Keyless Jupiter rate limit **0.5 RPS** (docs) | [Jupiter rate limits](https://dev.jup.ag/docs/llms.txt) | same | PASS |
| V20 | PreStocks metrics `https://prestocks.com/api/metrics` HTTP 200; SPACEX holders 10108, price 117.74, circ 43712.53 | API | same | PASS |
| V21 | Products table (Chrome a11y): SpaceX $117.74 vs mark $153.88, **−23.5%**; Information vs Explore (Explore = wallet menu) | DevTools snapshot of open tab | same | PASS |
| V22 | SPACEX page: must swap into **$SPCXx** or any token before **11:59pm UTC 12 March 2027** or expire worthless | Jev keep-open observe `https://prestocks.com/spacex` | same | PASS |
| V23 | Browser: Jev/Harness attach to **system Chrome Default**. Cursor `user-chrome-devtools` is **the same Chrome**. No separate Cursor browser. No Solana/Jupiter/GitHub/Render/Supabase MCP | doctor + MCP catalog | same | PASS |
| V24 | Reusable patterns exist conceptually at `d:\route\EMBER\services\payday` and `d:\route\relay\apps\worker` (TS keepers, receipts). They are **EVM/Base**, not Solana — copy **journal/idempotency/honesty**, not code | filesystem | same | PASS |
| V25 | KeeperHub MCP is **Base/Tempo USDC**, not Solana | MCP schema | same | Do not use on money path |

**G-gates (user list) as of this plan:**

| Gate | Result | Consequence |
|---|---|---|
| G1 escrow Token-2022 into program ATA | **PASS LOCALNET + DEVNET** (100 bps mock fee mint, not SPACEX) | Phase 3–4 |
| G2 `transfer_checked` + 100 bps fee | **PASS LOCALNET + DEVNET**; live mint fee **100 bps** epoch 1039 | Phase 3–4 |
| G3 post-fee received recorded | **PASS LOCALNET + DEVNET** `escrowed_raw == ATA amount == 990_000` on 1_000_000 in | Phase 3–4 |
| G4 raw vs UI | **HAZARD PROVEN**: RPC multiplier 1 vs Jupiter 1 display = 2e8 raw | Program stores raw; pin effective multiplier 5 while timestamp ≤ now |
| G5 cancel recover | **PASS LOCALNET + DEVNET** after harvest-withheld-to-mint then close | Phase 3–4 |
| G6 fill respects min_ratio | **PASS LOCALNET** under-delivery rejected; min dst accepted; **DEVNET** fill delivered 990_000 | Phase 3–4 |
| G7 failsafe timestamp branch | **PASS LOCALNET + DEVNET expire + DEVNET keeper tick fill** after failsafe_ts; control order 1:1 fill rejected `UnderDelivery` 6003 | Phase 3–4 |
| G8 partial fills safe | **PASS LOCALNET + DEVNET** two fills (400_000 then 590_000) on 990_000 escrow; harvest-before-close on final fill. **DEVNET** concurrent/second fill: 1 win + reject (`evidence/devnet-double-fill.json`) | Phase 3–4 |
| G9 Jupiter destination route | **PASS** at 1-display size, outAmount **76706836** 2026-09-21 00:31Z live `/v1/quote` | Re-quote every fill |
| G10 compose swap+fill one tx | **ASSEMBLY PASS / SIM err AccountNotFound**: `/build` + **real `fill` ix** (not memo) serializes **636** bytes; mainnet program/taker missing | Atomic path kept; inventory fallback used on DEVNET |
| G11 tx size/compute | **PASS size** 636 ≤ 1232; CU not measured (`unitsConsumed` 0 on AccountNotFound) | Phase 1 |
| G12 ALTs | **PASS**: `/build` ALT `8CoUnad218pEqxme5jnn9CNu4BmaRAkP7Af8uT9ZBg29` loaded | Phase 1 |
| G13 mainnet tiny SPACEX→SPCXx via T-MINUS | **NOT RUN** — program absent; exact min deploy **2.14859112 SOL**; dust SPACEX **1,827,211 raw** already held; keeper send off | Phase 8 |
| G14 explorer receipts | **PASS DEVNET** — live `/v1/receipts` includes original e2e plus keeper `fillIx` partial+close sigs; not SPACEX/mainnet | Phase 5–8 |

---

## 4. Current Unknowns

1. Whether post-lockup 1:1 ever materialises (issuer promise, not code).
2. Whether “expire worthless” is ever enforced (XAI precedent).
3. Sponsor reading of SPCXx vs PreStocks exclusivity (plain reading: public stock destination).
4. Jupiter lifting transfer-fee Trigger exclusion.
5. Recurring V1 current request schema (docs: unmaintained; 422 on guessed JSON). **Do not architect on Recurring.**
6. Paid RPC / Jupiter API key (not provided). Public RPC + keyless Jupiter may 429.
7. Keeper/deploy keypair (must be generated locally; never invent).
8. Anchor/Solana CLI versions after install.
9. Whether `GET /swap/v2/build` + our `fill` fits 1232 bytes / CU after ALTs.
10. DATABASE_URL connectivity not probed from this agent (would risk logging). Phase 0 migrates with `DIRECT_URL`.
11. Transfer-hook `programId` currently null; issuer can attach later.
12. Exact SEC 424B4 tranche text (third-party in old research). Feed must hash primary sources when used.

---

## 5. Architecture

```
Holder wallet  --place/cancel-->  Order program (PDA + escrow ATA)
Filler/keeper  --[Jupiter /build ixs] + fill-->  same program
Anyone         --expire-->  remaining escrow to owner
Keeper/API     --HTTP-->  feed snapshots + receipts (Postgres)
frontend/      -->  live API + Phantom + receipts (BackendSource; MAINNET place refused)
```

**Jupiter path (chosen):** `GET {JUPITER_API_BASE}/swap/v2/build?inputMint&outputMint&amount&taker` → assemble v0 message: compute budget + setup + **our fill** + swap (order decided in Phase 5 simulation) + ALTs. Do not use `/order`+`/execute` for fills.

**Fallback if G10/G11 fail:** filler already holds SPCXx; `fill` only; rebalance Jupiter in a **second** tx. Disclose. Do not silently switch.

**Feed:** Postgres + HTTP. Fields: destination mint, conversion ratio if any, deadline, event type, lockup calendar, issuer-power snapshot, source URL, source SHA-256, fetched_at, verification_state. Stale > `FEED_STALE_MS` → keeper **halts new fills**. Not required for on-chain cancel/expire.

**Database:** Supabase Postgres **is required** for receipts, feed snapshots, and keeper idempotency leases. It is **not** required for escrow correctness. **No Redis.**

**API (minimal):** `GET /health`, `GET /ready`, `GET /v1/feed`, `GET /v1/orders/:pda`, `GET /v1/receipts`, `GET /v1/keeper`, `GET /v1/quote`. Read-mostly. Place/cancel/fill are **wallet transactions**, not API custody.

**Render:** one web service (API + health) and one worker (keeper), or one process with both if simpler. Prefer **two** processes, one repo.

---

## 6. Repository Structure

Create only in implementation phases (not now):

```
T-MINUS/
  IMPLEMENTATION_PLAN.md    # this file
  .env / .env.example / .gitignore
  docs/ENVIRONMENT.md
  README.md
  Anchor.toml
  programs/tminus/          # Anchor program
  tests/                    # program + invariant tests
  apps/api/                 # TS HTTP
  apps/keeper/              # TS worker
  packages/sdk/             # IDL types, pdas, ratio math
  frontend/                 # Next.js · BackendSource against live API
  .github/workflows/ci.yml
```

Remote: https://github.com/mohamedwael201193/T-MINUS (`main`). Local `d:\route\sol\T-MINUS` is the git working tree.

---

## 7. Environment

See `docs/ENVIRONMENT.md`. Secrets live in `.env` (gitignored). Public mint IDs are listed there.

**Missing for signing:** `KEEPER_KEYPAIR_PATH` / `ANCHOR_WALLET` files do not exist. Generate in Phase 0; do not put key material in git.

---

## 8. Phase Map

| Phase | Name | Depends |
|---|---|---|
| 0 | Environment + toolchain | — |
| 1 | Token-2022 / Jupiter composition proofs (no product code freeze) | 0 |
| 2 | Solana program | 0, 1 G2/G4 understanding |
| 3 | Program tests + invariants | 2 |
| 4 | Local/devnet e2e | 3 |
| 5 | Keeper | 4 |
| 6 | API + Postgres | 5 (can overlap after 4) |
| 7 | Mainnet prep / safety | 6 |
| 8 | Mainnet tiny proof | 7 + human spend approval |
| 9 | Hardening | 8 |
| 10 | External frontend integration | 9 + `FRONTEND/` present |
| 11 | Full e2e certification | 10 |
| 12 | Hackathon submission pack | 11 |

Hackathon deadline (from product doc, OFFICIAL as of 20 Sep): **Fri 25 Sep 2026 4:00 PM ET**. If Phase 2 slips past Tue 22 Sep, execute **§38 fallback** from `STOCKLANA_WINNING_PRODUCT_FINAL.md` (delegation, reduced claims) instead of a fake program.

---

# PHASE 0 — Environment + toolchain verification

## 0.0 RESOURCES REQUIRED

MCP:
- `user-chrome-devtools` `list_pages` (confirm Chrome still attached if using Jev)
- No Solana MCP exists in this session

Skills:
- `browser-pick` (`C:\Users\LOQ\.cursor\skills\browser-pick\SKILL.md`)
- `jev` keep-open runner if a docs page must be watched

Docs:
- https://solana.com/docs/intro/installation
- https://www.anchor-lang.com/docs/installation
- `T-MINUS/docs/ENVIRONMENT.md`

Browser:
- Only if installer pages fail; do not open junk tabs

CLIs:
- `rustc`, `cargo`, `node`, `pnpm`, `gh`, `docker`, `vercel` (present)
- Install: `solana`, `avm`, `anchor`
- Optional later: `supabase` CLI, `render` CLI (API key is enough)

External sources:
- GitHub repo (already empty/usable)
- Public RPC `https://api.mainnet-beta.solana.com`

## 0.1 Objective

Make this machine able to build and test an Anchor program. Persist versions. Confirm `.env` present and gitignored.

## 0.2 Why This Phase Exists

Phase 2 cannot start without Solana/Anchor. Guessing versions is forbidden.

## 0.3 Preconditions

Rust 1.93 present. `.env` exists. Human has not forbidden installs.

## 0.4 Inputs

Official installers. Existing `.env`.

## 0.5 Exact Implementation Steps

1. Confirm `.gitignore` ignores `.env`.
2. Install Solana CLI via official Windows instructions; `solana --version`.
3. `solana config set --url https://api.mainnet-beta.solana.com`.
4. Install AVM; `avm install latest` (or the version Anchor docs name); `anchor --version`.
5. `pnpm init` is **not** this phase’s product scaffold unless authorized to start Phase 2 immediately after.
6. `solana-keygen new --outfile` **deploy** and **keeper** keypairs under a local secrets dir outside git. Set `ANCHOR_WALLET` and `KEEPER_KEYPAIR_PATH` to those paths in `.env`.
7. `Get-Content .env.example` vs `.env` — every required key present, no secrets in git `git status`.
8. Optional: `psql` or `pnpm dlx prisma` against `DIRECT_URL` only after Phase 6 schema exists.

## 0.6 Files To Create/Modify

`.env` paths only. Do not commit keypairs.

## 0.7 Onchain Changes

None.

## 0.8 Backend Changes

None.

## 0.9 Database Changes

None.

## 0.10 Security Constraints

Keypairs never in repo or chat. GitHub PAT already appeared in chat — **rotate**.

## 0.11 Tests

```
solana --version
anchor --version
solana cluster-version
git check-ignore -v .env
```

Expected: versions print; cluster responds; `.env` ignored.

## 0.12 Real-World Verification

`solana epoch-info` matches ~epoch 1039 (±1).

## 0.13 Failure Conditions

Installer blocked; PATH not updated; antivirus quarantine.

## 0.14 Pass Criteria

`solana` and `anchor` on PATH; versions recorded in the evidence log (append to this plan §3, do not create extra research files).

## 0.15 Evidence To Save

CLI version strings; `solana address` of deploy key (pubkey only).

## 0.16 Rollback

Uninstall AVM/Solana if the wrong toolchain was installed; do not delete user keypairs.

## 0.17 Stop/Ask Human Conditions

Cannot write keypairs; operator refuses CLI install; RPC 429 persistent.

---

# PHASE 1 — Protocol / Token-2022 / Jupiter final proof

## 1.0 RESOURCES REQUIRED

MCP:
- `user-chrome-devtools` snapshot if a UI quote must be seen
- cursor `WebFetch` for Jupiter docs only

Skills:
- `jev` / `browser-pick` for issuer pages (Information, not Explore)
- `jev` keep-open: `C:\Users\LOQ\.cursor\skills\jev\scripts\run_keepopen.py`

Docs:
- https://developers.jup.ag/docs/swap/build/index.md
- https://developers.jup.ag/docs/trigger/index.md
- Token-2022 transfer fee + scaled UI (Solana docs)

Browser:
- `https://prestocks.com/spacex` (already proven)
- `https://dev.jup.ag/docs/swap/build/index.md` if docs change

CLIs:
- `solana`, `spl-token` if present, `curl.exe` for Jupiter `/build` + `solana simulate` after a fixture tx is built in a **temporary script under `apps/keeper` only after Phase 0**

External sources:
- RPC `getAccountInfo` SPACEX mint
- `https://lite-api.jup.ag/swap/v1/quote`
- `https://api.jup.ag/swap/v2/build`
- `https://lite-api.jup.ag/trigger/v1/createOrder`

## 1.1 Objective

Close G9 (reconfirm), G10/G11/G12 as far as possible **without** the product program: build a **dummy** tx that is Jupiter `/build` ixs + a memo (stand-in for fill), simulate.

## 1.2 Why This Phase Exists

If swap+extra ix cannot fit, keeper design must switch to inventory fallback **before** writing fill CPI fantasies.

## 1.3 Preconditions

Phase 0 pass. Filler pubkey exists.

## 1.4 Inputs

SPACEX/SPCXx mints from `.env`. Taker = keeper pubkey.

## 1.5 Exact Implementation Steps

1. Re-fetch mint extensions; abort if hook `programId` became non-null.
2. Quote 200_000_000 raw; record outAmount.
3. `GET /swap/v2/build` with real taker.
4. Assemble v0 tx with returned ALTs; append a Memo ix.
5. `solana simulate` (or `@solana/web3.js` simulate). Record CU and size.
6. If fail: retry with `maxAccounts` reduced per Jupiter docs; then fallback architecture.

## 1.6 Files To Create/Modify

`apps/keeper/scripts/sim-compose.ts` only (no program).

## 1.7 Onchain Changes

None (simulate only).

## 1.8 Backend Changes

None.

## 1.9 Database Changes

None.

## 1.10 Security Constraints

Do not sign/send. Dummy taker must be our key, not a user.

## 1.11 Tests

Command: `pnpm --filter keeper sim:compose`  
Expected: simulation `err: null` or documented CU overflow.  
Failure: change to two-tx fallback in this plan (edit §5) before Phase 2 fill design assumes atomic hedge.

## 1.12 Real-World Verification

Compare simulated accounts with `/build` response.

## 1.13 Failure Conditions

401/403 Jupiter (need API key); 429; simulation account-in-use; tx too large.

## 1.14 Pass Criteria

Written CU, byte size, ALT list. G10 marked PASS only if simulation succeeds with a placeholder ix; G11 PASS if under limits.

## 1.15 Evidence To Save

JSON: quote, build (strip long ALT arrays if needed), simulation logs. Append hashes/timestamps to §3.

## 1.16 Rollback

Delete the sim script if it encodes secrets.

## 1.17 Stop/Ask Human Conditions

Need `JUPITER_API_KEY` after repeated 401/429. Need paid RPC if public RPC cannot simulate.

---

# PHASE 2 — Solana program implementation

## 2.0 RESOURCES REQUIRED

MCP: none required  
Skills: none  
Docs: Anchor token_interface; Token-2022 transfer_checked  
Browser: none  
CLIs: `anchor`, `solana`  
External: Token-2022 program `TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb`

## 2.1 Objective

Ship the smallest Anchor program that satisfies invariants below.

## 2.2 Why This Phase Exists

Escrow must be on-chain. Jupiter cannot hold PreStocks trigger orders.

## 2.3 Preconditions

Phase 0. Phase 1 composition result known (atomic vs two-tx).

## 2.4 Inputs

IDL-bound schemas in this section.

## 2.5 Exact Implementation Steps

Implement **only** these accounts, ixs, errors, events.

### Program IDs

Declared in `Anchor.toml` after `anchor keys list`.

### Accounts

`Order` PDA seeds: `["order", owner, src_mint, dst_mint, nonce_u64_le]`

```
Order {
  discriminator: 8
  owner: Pubkey
  src_mint: Pubkey
  dst_mint: Pubkey
  escrow_ata: Pubkey
  nonce: u64
  src_decimals: u8
  dst_decimals: u8
  src_multiplier_e9: u64    // pinned at place; e.g. 5_000_000_000 for ×5
  escrowed_raw: u64         // post-fee received
  filled_raw: u64           // source consumed
  min_ratio_e9: u64         // dst_raw_out >= src_raw_in * min_ratio_e9 / 1e9
  failsafe_floor_e9: u64
  failsafe_ts: i64
  hard_expiry_ts: i64
  min_fill_raw: u64
  status: u8                // 0 open, 1 closed
  bump: u8
}
```

Escrow ATA: associated token account of Order PDA, Token-2022, `src_mint`.

### Instructions

**place**  
Signers: owner.  
Transfer `amount_raw` from owner ATA → escrow ATA via `transfer_checked`.  
`escrowed_raw = escrow_ata.amount - amount_before` (measure, do not trust `amount_raw`).  
Reject if `src_mint` transfer hook program is Some. Reject if paused.  
`failsafe_floor_e9 <= min_ratio_e9`. `failsafe_ts <= hard_expiry_ts`. `min_fill_raw > 0`.

**cancel**  
Signer: owner. Status open. Return remaining (`escrowed_raw - filled_raw` vs actual ATA amount — use **ATA amount**) via `transfer_checked` to owner. Close ATA rent to owner. Close Order.

**fill**  
Signer: filler.  
`fill_src_raw` ≤ remaining. ≥ `min_fill_raw` unless remaining < min_fill (then remaining must be filled entirely).  
Active floor: if `clock.unix_timestamp >= failsafe_ts` use `failsafe_floor_e9` else `min_ratio_e9`.  
Filler transfers `dst_raw` to **owner** dst ATA with `transfer_checked` where  
`dst_raw >= ceil(fill_src_raw * active_floor_e9 / 1e9)` using u128.  
Then `transfer_checked` `fill_src_raw` escrow → filler (fee will reduce what filler receives — **user’s remaining decreases by fill_src_raw actually leaving escrow**, measure ATA delta).  
Update `filled_raw`. If remaining 0, close.

**expire**  
No owner signature. `clock.unix_timestamp >= hard_expiry_ts`. Same return path as cancel to owner.

### Events

`OrderPlaced`, `OrderCancelled`, `OrderFilled { src_delta, dst_delta, ratio_e9, failsafe_used }`, `OrderExpired`.

### Errors

`Paused`, `HookAttached`, `FeeUnaccounted`, `UnderDelivery`, `Unauthorized`, `StatusClosed`, `TooEarlyExpire`, `FillTooSmall`, `Overflow`, `StaleMultiplier` (if place-time multiplier disagrees with mint when we choose to re-read — **v1: pin at place, do not silently rescale**).

### Invariants

- Escrow ATA owner = Order PDA.
- No instruction moves escrow except cancel/fill/expire as above.
- `filled_raw` never exceeds initial `escrowed_raw`.
- Fill dst uses **owner** as destination, never keeper.

## 2.6 Files To Create/Modify

`programs/tminus/**`, `Anchor.toml`, `Cargo.toml`.

## 2.7 Onchain Changes

Devnet deploy only in this phase if tests pass locally first (prefer local validator in Phase 3 then deploy Phase 4).

## 2.8 Backend Changes

None.

## 2.9 Database Changes

None.

## 2.10 Security Constraints

No `unchecked_account`. Token program must be Token-2022. Mint accounts parsed. Filler cannot pick dst mint different from Order.

## 2.11 Tests

See Phase 3. Phase 2 exit: `anchor build` succeeds.

## 2.12 Real-World Verification

`anchor keys list` program id recorded (not mainnet).

## 2.13 Failure Conditions

Cannot compile token_interface; Windows path issues.

## 2.14 Pass Criteria

Release build + IDL committed (no secrets).

## 2.15 Evidence To Save

`anchor build` log; IDL sha256.

## 2.16 Rollback

`anchor clean`; revert commit.

## 2.17 Stop/Ask Human Conditions

Need upgrade authority policy (keep **immutable** unless human says otherwise). Default: **keep upgrade authority** for hackathon hotfix, transfer or burn after cert.

---

# PHASE 3 — Program tests + fuzzing + invariants

## 3.0 RESOURCES REQUIRED

MCP: none  
Skills: none  
Docs: Anchor test  
Browser: none  
CLIs: `anchor test`  
External: local validator (solana-test-validator)

## 3.1 Objective

Close G1–G8 on a **local fee mint** that clones SPACEX extensions as far as Anchor test allows.

## 3.2 Why This Phase Exists

Mainnet is not a testbed.

## 3.3 Preconditions

Phase 2 build green.

## 3.4 Inputs

Test fixtures: fee 100 bps mint; scaled UI if possible.

## 3.5 Exact Implementation Steps

1. Unit: ratio u128 ceil; partial remaining.
2. `place` post-fee = 99% of input at 100 bps (exact withheld formula: `floor(amount * bps / 10000)` per Token-2022 — **assert against ATA**, not a guessed formula if they differ).
3. cancel returns ATA amount.
4. fill under-delivery fails.
5. fill at failsafe_ts uses floor.
6. expire before ts fails; after succeeds.
7. double-fill remaining 0 fails.
8. If partial-fill accounting disagrees with ATA by even 1 raw → **remove partial fills** (set `min_fill_raw` = full remaining only).

## 3.6 Files To Create/Modify

`tests/*.ts`

## 3.7 Onchain Changes

Local only.

## 3.8 Backend Changes

None.

## 3.9 Database Changes

None.

## 3.10 Security Constraints

Malicious filler, wrong mint, replay (PDA nonce).

## 3.11 Tests

```
anchor test
```

Expected: all pass. Failure: do not deploy.

## 3.12 Real-World Verification

None (local).

## 3.13 Failure Conditions

Validator won’t start on Windows.

## 3.14 Pass Criteria

G1–G7 local PASS. G8 PASS or **removed** with plan edit.

## 3.15 Evidence To Save

Test output in CI artifact.

## 3.16 Rollback

Revert fill math.

## 3.17 Stop/Ask Human Conditions

Windows validator blocked → use Docker solana image (Docker **is** installed 29.7.2).

---

# PHASE 4 — Local/devnet end-to-end

## 4.0 RESOURCES REQUIRED

MCP: none  
Skills: none  
Docs: Solana devnet faucet  
Browser: https://explorer.solana.com/?cluster=devnet  
CLIs: `anchor deploy --provider.cluster devnet`  
External: devnet RPC

## 4.1 Objective

Deploy program; run place/cancel/fill/expire against a **devnet mock fee mint** (not PreStocks). Label DEVNET.

## 4.2 Why This Phase Exists

Need a program ID and explorer links before mainnet.

## 4.3 Preconditions

Phase 3 pass. Devnet SOL in deploy wallet.

## 4.4 Inputs

Devnet URL. Airdrop.

## 4.5 Exact Implementation Steps

1. Airdrop / fund.
2. Deploy.
3. Create mock Token-2022 fee mint or use a known devnet mint — **do not claim it is SPACEX**.
4. Script: place, cancel; place, fill; place, warp/wait, expire.
5. Explorer links in README evidence table.

## 4.6 Files To Create/Modify

`scripts/e2e-devnet.ts`, README evidence (after this phase).

## 4.7 Onchain Changes

Devnet program + txs.

## 4.8 Backend Changes

None required.

## 4.9 Database Changes

None required.

## 4.10 Security Constraints

No mainnet key reuse if possible.

## 4.11 Tests

Same script must be idempotent on second run (new nonce).

## 4.12 Real-World Verification

Explorer shows token balances change.

## 4.13 Failure Conditions

Devnet congestion; airdrop fail.

## 4.14 Pass Criteria

Four explorer signatures.

## 4.15 Evidence To Save

Signatures, program id.

## 4.16 Rollback

Abandon that program id; redeploy.

## 4.17 Stop/Ask Human Conditions

Need SOL; faucet blocked.

---

# PHASE 5 — Keeper implementation

## 5.0 RESOURCES REQUIRED

MCP: none (KeeperHub MCP is **not** Solana)  
Skills: none  
Docs: Jupiter `/build`; this plan §5  
Browser: none  
CLIs: `pnpm`, `tsx`  
External: Jupiter Swap V2, Solana RPC, program IDL

## 5.1 Objective

Deterministic worker: discover open `Order` accounts; quote; if fillable, build atomic tx; send; persist receipt; halt on issuer-power change.

## 5.2 Why This Phase Exists

Permissionless fill still needs **one** reliable filler for the demo.

## 5.3 Preconditions

Phase 4 program id. Phase 1 composition result.

## 5.4 Inputs

`KEEPER_KEYPAIR_PATH`, `PROGRAM_ID`, Jupiter bases, `FEED_STALE_MS`.

## 5.5 Exact Implementation Steps

1. Poll `getProgramAccounts` filters for `status=open`.
2. Load feed row; if stale or pause/hook/fee-bps changed vs snapshot → **halt fills**, log, still allow observing.
3. Quote executable ratio for `min_fill_raw` (or remaining).
4. Fillable if quote_ratio ≥ active floor **after estimated src-out fee**.
5. Idempotency key: `order_pda + filled_raw`. Lease row in Postgres (`UPDATE … WHERE leased_until < now`).
6. Build tx (atomic or two-tx per Phase 1).
7. Simulate; send; confirm; write receipt `{pda, sig, slot, src_delta, dst_delta, route, feed_hash}`.
8. Retries: only if on-chain `filled_raw` unchanged. Never retry blindly after unknown send.
9. Health: last poll, last fill, last rpc error, last jupiter error.
10. Copy EMBER/relay **ideas**: slot journal, enable-gate, no LLM.

## 5.6 Files To Create/Modify

`apps/keeper/**`

## 5.7 Onchain Changes

Fill txs as filler.

## 5.8 Backend Changes

Keeper process.

## 5.9 Database Changes

Tables: `keeper_leases`, `receipts` (Phase 6 can land schema first if overlapping).

## 5.10 Security Constraints

Spend cap. No sweeping user ATAs. Cannot cancel for users.

## 5.11 Tests

- Unit: fillability math.
- Duplicate-execution: two workers, one lease wins.
- RPC timeout: no double spend (lease + filled_raw).
- Jupiter 429: backoff.
- Restart mid-flight: confirm sig or resimulate.

## 5.12 Real-World Verification

Devnet fill via keeper.

## 5.13 Failure Conditions

Quote says fillable, simulate fails.

## 5.14 Pass Criteria

One devnet fill receipt with explorer sig.

## 5.15 Evidence To Save

Receipt JSON.

## 5.16 Rollback

Stop worker; users still cancel.

## 5.17 Stop/Ask Human Conditions

Need Jupiter API key; need inventory USDC/SPCXx for hedge.

---

# PHASE 6 — Backend API + persistence

## 6.0 RESOURCES REQUIRED

MCP: none (no Supabase MCP in session)  
Skills: none  
Docs: `docs/ENVIRONMENT.md`  
Browser: https://supabase.com/dashboard/project/mmxffkmsdyackrxtmeiq (operator; already open in Chrome)  
CLIs: `pnpm`; optional `supabase` CLI (absent — use SQL editor or `psql` if installed)  
External: `DATABASE_URL`, `DIRECT_URL`

## 6.1 Objective

Minimal API on Render-ready Node.

## 6.2 Why This Phase Exists

Frontend and receipts need HTTP. Protocol does not.

## 6.3 Preconditions

Postgres reachable. Do not log URLs.

## 6.4 Inputs

Schema:

```
feed_snapshots (id, token_symbol, payload jsonb, source_url, source_sha256, fetched_at, verification_state)
receipts (id, order_pda, sig, slot, payload jsonb, created_at)
keeper_leases (order_pda pk, filled_raw, leased_until, worker_id)
```

## 6.5 Exact Implementation Steps

1. Migrate via `DIRECT_URL`.
2. Implement endpoints in §5 Architecture.
3. `/health` liveness; `/ready` = RPC+DB ping.
4. `/v1/quote` proxies Jupiter quote (no cache > 2s).
5. `/v1/feed` returns latest snapshot; `Cache-Control: max-age=15`.
6. Auth: public GET. No private keys. No place-via-API.

## 6.6 Files To Create/Modify

`apps/api/**`, SQL migrations.

## 6.7 Onchain Changes

None.

## 6.8 Backend Changes

This phase.

## 6.9 Database Changes

Tables above only.

## 6.10 Security Constraints

Parameterized SQL. No RLS bypass with service role in the browser.

## 6.11 Tests

`pnpm test` API; `/health` 200; migration on DIRECT_URL.

## 6.12 Real-World Verification

Render deploy preview **after** human ok (Phase 9 can be first Render). Local `pnpm start` sufficient here.

## 6.13 Failure Conditions

PgBouncer prepared-statement issues → use transaction pooler correctly or DIRECT for migrations only.

## 6.14 Pass Criteria

curl health/ready/feed against local.

## 6.15 Evidence To Save

Migration version; sample feed JSON (no secrets).

## 6.16 Rollback

Drop tables in a migration down.

## 6.17 Stop/Ask Human Conditions

DB auth failure (password/host). Ask without echoing URL.

---

# PHASE 7 — Mainnet preparation and safety review

## 7.0 RESOURCES REQUIRED

MCP: none  
Skills: `jev-review` if diff review wanted  
Docs: this §25  
Browser: Solscan mint pages  
CLIs: `solana program show`  
External: mainnet RPC

## 7.1 Objective

Checklist before any mainnet user funds.

## 7.2 Why This Phase Exists

Issuer powers and fee epoch already changed once.

## 7.3 Preconditions

Devnet e2e + keeper fill. Human written spend cap.

## 7.4 Inputs

Re-fetch mint (fee, pause, hook, multiplier). Re-quote.

## 7.5 Exact Implementation Steps

1. Re-run V10–V17 live.
2. Simulate mainnet place of **min display** (200_000_000 raw) without sending.
3. Write a one-page safety card: wallet, amount, expected fee 100 bps, cancel path.
4. Confirm upgrade authority holder.

## 7.6 Files To Create/Modify

README safety card (no secrets).

## 7.7 Onchain Changes

None yet.

## 7.8 Backend Changes

Mainnet RPC URL in Render secrets (not yet deploy required).

## 7.9 Database Changes

None.

## 7.10 Security Constraints

See §25.

## 7.11 Tests

Simulation only.

## 7.12 Real-World Verification

Mint still no hook program.

## 7.13 Failure Conditions

Hook attached; paused; RPC disagree.

## 7.14 Pass Criteria

Human replies **authorize Phase 8** with max raw amount.

## 7.15 Evidence To Save

Fresh mint JSON hash; quote.

## 7.16 Rollback

Do not deploy.

## 7.17 Stop/Ask Human Conditions

**Always stop for spend amount.**

---

# PHASE 8 — Mainnet small-value proof

## 8.0 RESOURCES REQUIRED

MCP: none  
Skills: `jev` optional to watch explorer  
Docs: explorer  
Browser: https://solscan.io / https://explorer.solana.com  
CLIs: keeper, solana  
External: Jupiter, program, PreStocks mint

## 8.1 Objective

G13/G14: one trigger-path fill and one failsafe-path fill at tiny size. Real SPCXx. Real receipts.

## 8.2 Why This Phase Exists

Hackathon demo.

## 8.3 Preconditions

Explicit human authorization. Spend cap. Phase 7 pass.

## 8.4 Inputs

1 display SPACEX = **200_000_000 raw** (Jupiter/UI). Account for 100 bps on place and on fill-out.

## 8.5 Exact Implementation Steps

1. Deploy program mainnet if not deployed (upgrade authority documented).
2. Order A: min_ratio just below live executable ratio → keeper fill.
3. Order B: min_ratio unfillable; failsafe_ts = now+short; floor = live-ish → fill.
4. Order C optional resting.
5. Never claim guaranteed conversion.

## 8.6 Files To Create/Modify

README signatures.

## 8.7 Onchain Changes

Mainnet program + orders.

## 8.8 Backend Changes

Keeper pointed at mainnet.

## 8.9 Database Changes

Receipts rows.

## 8.10 Security Constraints

Cap. Simulate each tx. Explorer verify before next.

## 8.11 Tests

Explorer: owner dst ATA increased; escrow decreased; events.

## 8.12 Real-World Verification

Two signatures.

## 8.13 Failure Conditions

NO_ROUTES; slippage; fee mismatch.

## 8.14 Pass Criteria

G5 cancel also demonstrated on a third dust order.

## 8.15 Evidence To Save

Sigs, receipt JSON, program id.

## 8.16 Rollback

Cancel open orders.

## 8.17 Stop/Ask Human Conditions

Any loss beyond expected fees; pause/hook.

---

# PHASE 9 — Production hardening

## 9.0 RESOURCES REQUIRED

MCP: none  
Skills: none  
Docs: Render deploy  
Browser: Render dashboard (login in system Chrome + Jev if needed)  
CLIs: `vercel` unused; Render API with `RENDER_API_KEY`  
External: Render

## 9.1 Objective

Keeper+API on Render; structured logs; health; secret scan; mock-import guard for later frontend.

## 9.2 Why This Phase Exists

Laptop keepers die.

## 9.3 Preconditions

Phase 8 or honest devnet-only label.

## 9.4 Inputs

Render API key in `.env`.

## 9.5 Exact Implementation Steps

1. Dockerfile or `pnpm start`.
2. Env in Render: copy from `.env.example` names.
3. CI: install, typecheck, lint, unit, `anchor test`, build, `gitleaks` or equivalent, fail if `FRONTEND` imports mock in prod flag.

## 9.6 Files To Create/Modify

`.github/workflows/ci.yml`, `Dockerfile`, `render.yaml` if used.

## 9.7 Onchain Changes

None.

## 9.8 Backend Changes

Deploy.

## 9.9 Database Changes

None.

## 9.10 Security Constraints

No secrets in GH Actions logs.

## 9.11 Tests

CI green on `main`.

## 9.12 Real-World Verification

Public `/health`.

## 9.13 Failure Conditions

Render native env CRLF; Windows vs Linux.

## 9.14 Pass Criteria

Health 200 from public URL.

## 9.15 Evidence To Save

Render service URL.

## 9.16 Rollback

Previous deploy.

## 9.17 Stop/Ask Human Conditions

Need Render service IDs created in dashboard.

---

# PHASE 10 — External frontend integration

## 10.0 RESOURCES REQUIRED

MCP: `user-chrome-devtools` for UI QA; not Playwright Chromium  
Skills: `browser-pick`, `jev`, `vercel-react-best-practices`  
Docs: this section  
Browser: local Vite app in **system Chrome** if login/wallet; do not assume Cursor browser is isolated  
CLIs: `pnpm` in `FRONTEND/`  
External: wallet adapter, program id, API URL

## 10.1 Objective

Connect `FRONTEND/` to real program, wallet, feed, receipts. Remove mocks.

## 10.2 Why This Phase Exists

External UI will ship fake data. That is expected until this phase.

## 10.3 Preconditions

`T-MINUS/FRONTEND/` exists. Phases 5–6 done. **Do not redesign** unless correctness requires it.

## 10.4 Inputs

Inventory of mocks (scripted grep: `mock`, `fake`, `simulate`, `dummy`).

## 10.5 Exact Implementation Steps

1. Inspect FRONTEND completely.
2. List every mock/fake tx/balance.
3. Map screens to place/cancel/fill/expire/feed/receipts.
4. Wire wallet + program IDs.
5. Remove fake success/balances/receipts.
6. Loading/error states.
7. Provenance badges: MAINNET / DEVNET only when true.
8. Information vs Explore: never label Explore as product page.

## 10.6 Files To Create/Modify

Only `FRONTEND/` and env `VITE_*` (no secrets in VITE).

## 10.7 Onchain Changes

None except user txs.

## 10.8 Backend Changes

CORS if needed.

## 10.9 Database Changes

None.

## 10.10 Security Constraints

No secret keys in Vite. Feed hash displayed.

## 10.11 Tests

Manual Jev goals: open app, connect, see live quote (not typed). Fresh wallet perspective.

## 10.12 Real-World Verification

Place from UI matches explorer.

## 10.13 Failure Conditions

Frontend missing; only mocks.

## 10.14 Pass Criteria

Grep for mock imports in production entry is empty.

## 10.15 Evidence To Save

Mock inventory checklist, all struck through.

## 10.16 Rollback

Feature flag `VITE_USE_MOCKS` default false.

## 10.17 Stop/Ask Human Conditions

FRONTEND/ not delivered — superseded: `frontend/` is live behind BackendSource.

---

# PHASE 11 — Full end-to-end certification

## 11.0 RESOURCES REQUIRED

MCP: chrome-devtools snapshot  
Skills: `jev-ship` optional  
Docs: hackathon how-it-works  
Browser: https://hackathons.solana.com/hackathons/stocklana  
CLIs: full suite  
External: all live APIs

## 11.1 Objective

Walk the demo script with real state. No simulated fills.

## 11.2 Why This Phase Exists

Judges.

## 11.3 Preconditions

Phase 10 or UI-less demo honestly labelled.

## 11.4 Inputs

Pitch script from product doc (do not invent new claims).

## 11.5 Exact Implementation Steps

Run checklist §MASTER. Film later (not this agent unless asked).

## 11.6 Files To Create/Modify

Evidence table in README.

## 11.7–9

None extra.

## 11.10 Security Constraints

No last-minute admin backdoor.

## 11.11 Tests

Restart keeper; duplicate fill; stale feed halt; cancel; expire (devnet if mainnet expiry too slow).

## 11.12 Real-World Verification

Live Trigger rejection still shows transfer fee.

## 11.13 Failure Conditions

Any mock in demo path.

## 11.14 Pass Criteria

All checklist items `verified` or explicitly `blocked` with reason.

## 11.15 Evidence To Save

This plan updated checkboxes with evidence pointers (URLs/sigs), not new essay files.

## 11.16 Rollback

Unsubmit nothing yet.

## 11.17 Stop/Ask Human Conditions

Claim vs evidence mismatch.

---

# PHASE 12 — Hackathon submission / evidence / demo certification

## 12.0 RESOURCES REQUIRED

MCP: none  
Skills: `jev` if submission UI needs clicks in logged-in Chrome  
Docs: hackathon submit rules  
Browser: hackathons.solana.com (system Chrome — login cookies)  
CLIs: `gh`  
External: GitHub public repo

## 12.1 Objective

Submit GitHub + demo + video links. Original work declared.

## 12.2 Why This Phase Exists

Deadline Fri 25 Sep 2026 4pm ET.

## 12.3 Preconditions

Phase 11. Human owns the account.

## 12.4 Inputs

Repo URL. Program id. Signatures.

## 12.5 Exact Implementation Steps

1. Push `T-MINUS` to GitHub (human authorize push).
2. README: program id, two sigs, honesty table, no fake liquidity.
3. Submit; keep edit window.
4. Do not enter Tessera/Clawpump/Meteora.

## 12.6 Files To Create/Modify

README only.

## 12.7–9

None.

## 12.10 Security Constraints

No keys in repo.

## 12.11 Tests

Clone fresh; `pnpm i` + documented commands work.

## 12.12 Real-World Verification

Incognito clone (no secrets).

## 12.13 Failure Conditions

Private repo; empty README.

## 12.14 Pass Criteria

Submission confirmation page.

## 12.15 Evidence To Save

Submission URL.

## 12.16 Rollback

Edit submission.

## 12.17 Stop/Ask Human Conditions

Need DoraHacks/hackathon login in Chrome — use Jev only to **navigate**, human submits.

---

## 25. Security review (threat → impact → mitigation → test)

| Threat | Impact | Mitigation | Test |
|---|---|---|---|
| Issuer permanentDelegate | Escrow drained | Disclose; same as wallet; halt on authority change | Feed snapshot mismatch → halt |
| Freeze/pause | Fills fail | Halt; cancel when possible | LOCALNET paused mint + keeper `issuer_paused` |
| Transfer hook attached | Unexpected CPI | `place`/`fill` reject Some(programId) | LOCALNET hook mint + rust TLV |
| Fee change 50→100 already live | Misprice | Always measure ATA delta | 100 bps fixture |
| Multiplier 1 vs 5 | 5× misprice | Pin `src_multiplier_e9` at place; UI shows raw+display | Unit test 2e8 = 1 display |
| Filler underpay | Theft | On-chain ceil ratio | Under-delivery tx fails |
| Duplicate fill | Double spend | `filled_raw` + ATA + lease | Two keepers |
| Malicious mint | Wrong asset | Whitelist src/dst at place (PreStocks + SPCXx for demo) | Reject other mint |
| Stale quote | Bad fill for filler | Simulate; slippage; floor on-chain protects user | Stale quote sim |
| Stale feed | Wrong deadline UX | `FEED_STALE_MS` halt | Clock inject |
| Keeper compromise | Can only valid-fill | No withdraw ix | Code review |
| Malicious RPC | Wrong sim | Confirm on-chain; optional 2nd RPC later | — |
| Frontend spoof | User signs wrong | Show PDA + mints in UI; warn | QA |
| Receipt spoof | PR lie | Receipts include sig; UI fetches chain | Replay sig |
| Replay | Extra fill | PDA state | Replay ix |
| Integer overflow | Wrong ratio | u128 | Fuzz |
| Upgrade authority | Rug | Document holder; freeze after cert | `solana program show` |

---

# MASTER CERTIFICATION CHECKLIST

Legend: `[ ] not started`  `[x] verified`  `[!] blocked`

### PRODUCT
- [x] Conditional conversion only; no auction/vault/lending
- [x] Honest failsafe wording
- [x] PreStocks + SPCXx only on bounty path

### TECH
- [x] Tool audit recorded (this plan §3) — Solana/Anchor **blocked** until Phase 0
- [x] Repo scaffolded and pushed

### SOLANA
- [x] Program deployed (devnet) — `HRLmVcuk6PRcVwB3UVpcbEC3LVVMhdLZfPvHtmL2PUdL` executable; e2e sigs in `evidence/devnet-e2e.json`
- [!] Program deployed (mainnet) — **absent**: account `HRLmVcuk6PRcVwB3UVpcbEC3LVVMhdLZfPvHtmL2PUdL` does not exist on mainnet (`evidence/live-status.json`)

### TOKEN-2022
- [x] Live mint extensions fetched 2026-09-20 (100 bps, epoch 1039, hook null, multiplier hazard)
- [x] Escrow post-fee proven in tests

### JUPITER
- [x] Trigger V1 rejects transfer-fee mint
- [x] Swap quote + `/build` ixs for SPACEX→SPCXx
- [x] Swap+fill simulated
- [!] Swap+fill executed — **blocked on mainnet** (no program, 0 SOL). **DEVNET** keeper `tick()` inventory fill executed (`evidence/devnet-failsafe-tick.json`)

### KEEPER
- [x] Deterministic worker
- [x] Idempotent
- [x] Halt on issuer-power change
- [x] DEVNET `tick()` sent an inventory fill (failsafe path); Render send remains **off**
- [x] Skip `getProgramAccounts` when the program account is not executable (avoids public-RPC 413 on mainnet)

### BACKEND
- [x] Health/ready
- [x] Feed endpoint
- [x] `/v1/program` reports per-cluster executable (devnet true, mainnet false)
- [x] Render or explicit local-only label

### DATABASE
- [x] Migrations on DIRECT_URL
- [x] Not used as escrow truth

### SECURITY
- [x] Threat table tests mapped (halt/pause/hook/fee-change/spend-cap/non-bounty-pair)
- [x] Keys not in git (`.env` ignored; secret-scan PASS)
- [ ] Chat-pasted tokens rotated

### TESTING
- [x] `anchor test` LOCALNET 12/12 (airdrop payer first; includes drained-escrow second fill)
- [x] Failure-mode list in Phase 3–5 (under-delivery, double-fill, expire, halt, spend cap, pause, hook, stale feed)

### MAINNET
- [!] Tiny fill authorized and done — **blocked**: program absent; exact min deploy **2.14859112 SOL**; dust SPACEX on wallet; `KEEPER_SEND_ENABLED=false`

### RECEIPTS
- [x] Explorer-linked JSON — DEVNET place/cancel/fill/expire plus keeper `fillIx` and failsafe-tick fills at `/v1/receipts`

### FRONTEND INTEGRATION
- [x] `frontend/` delivered
- [x] BackendSource is the default production path
- [x] Live `/v1/prestocks` `/v1/feed` `/v1/quote` `/v1/receipts` `/v1/program` `/v1/balances`
- [x] Phantom connect (injected); MAINNET balances via API
- [x] Honest MAINNET / DEVNET labels; no fake place
- [ ] MAINNET program place/cancel (blocked: Option B — 2.14859112 SOL not spent)
- [x] Receipts labeled by eventKind (place/cancel/expire/fill); explorer is a real `<a href>`
- [x] Landing proof teaser uses a live fill or a labeled SIMULATION fixture (no fake chain sigs)
- [ ] Phantom approve in this Chrome session (human-only extension prompt)
- [ ] Full browser QA paths 3–5 (fill/cancel/failsafe) on MAINNET (blocked: no mainnet program)

### NO-MOCK GUARANTEE
- [x] Production path uses live RPC/Jupiter/chain (Render `/ready` `/v1/quote` `/v1/feed`)

### SUBMISSION
- [ ] GitHub + demo + video

---

## Human blockers now

1. **Mainnet program deploy** exact minimum safe balance is **2.14859112 SOL** (`2,148,591,120` lamports) for the optimized 209,256-byte ELF: buffer 1.06385868 + programdata 1.06389932 + program 0.00083312 + 0.02 fee buffer. After success, buffer rent is refunded and **1.06473244 SOL** stays locked. Measured from mainnet `SysvarRent` (5080 lamports/byte-year, 1-year exemption) via `getMinimumBalanceForRentExemption`. Evidence: `evidence/mainnet-deploy-rent.json`.
2. **Tiny mainnet fill** will use the dust SPACEX already held (not 1 display / ~$117). Needs the program on mainnet, leftover fee SOL, and `KEEPER_SEND_ENABLED=true` under `KEEPER_SPEND_CAP_RAW=200000000` only after deploy.
3. **Frontend** exists at `frontend/` and is wired to the live API. Phantom **approve** is a human-only Chrome extension step. MAINNET place remains refused under Option B.
4. Rotate Render/GitHub/DB secrets that were pasted in chat. The recovery phrase pasted in chat should be treated as **exposed** — do not keep large mainnet funds on that wallet.

Do not enable keeper send on mainnet until the program account exists there and a tiny spend is explicitly authorized.
