# T-MINUS

Conditional conversion orders for PreStocks Token-2022 mints: escrow source tokens, fill at an executable destination ratio or after a failsafe timestamp, expire leftover to the owner.

Frontend is **not** built in this repository. It will arrive later in `FRONTEND/` from an external agent.

## What is real

| Piece | Status | Evidence |
|---|---|---|
| Anchor program `place` / `cancel` / `fill` / `expire` | Built, tested on LOCALNET, **deployed DEVNET** | `evidence/program-build.json`, `evidence/devnet-e2e.json` |
| Token-2022 post-fee escrow + harvest-before-close | **LOCALNET** PASS | 100 bps fee mint fixture (not SPACEX) |
| Pause / transfer-hook rejection | **UNIT + LOCALNET** | rust TLV tests; mocha paused/hook mint fixtures |
| Jupiter Swap V2 `/build` + extra ix composition | **SIMULATION** | `evidence/phase1-sim.json` — 565 bytes, ALT present, `err=AccountNotFound` because keeper has 0 SOL |
| API `/health` `/ready` `/v1/feed` `/v1/quote` `/v1/keeper` `/v1/receipts` | **LIVE FREE Render** | `https://tminus-api-k2d2.onrender.com` — `evidence/render-free-health.json` |
| Keeper worker | Embedded in the free web service, **send disabled** | `KEEPER_SEND_ENABLED=false`; `/v1/keeper` `halted: false` |
| Devnet deploy | **LIVE** | Program `HRLmVcuk6PRcVwB3UVpcbEC3LVVMhdLZfPvHtmL2PUdL` executable; place/cancel/fill/expire sigs in `evidence/devnet-e2e.json` |
| Mainnet program deploy / fills | Not yet | Deploy and keeper wallets have **0 SOL**; spend cap 200_000_000 raw once funded |
| Frontend | Not built | Awaiting `FRONTEND/` |

## Program

- Program ID: `HRLmVcuk6PRcVwB3UVpcbEC3LVVMhdLZfPvHtmL2PUdL`
- IDL: `idl/tminus.json`
- Network for the ID: **DEVNET executable**; localnet tests also pass. Mainnet account still absent.
- Upgrade authority (devnet): `CpTxsgPjvaaPSaBKkijvB1h3hzgJmPiTsWNhuS7tRkgX`

## Live service (FREE Render)

- API: `https://tminus-api-k2d2.onrender.com`
- Dashboard: `https://dashboard.render.com/web/srv-dao6t2rtqb8s73e52mbg`
- Plan: **free** web service. Keeper runs in-process (`KEEPER_EMBEDDED=true`). Render free instances spin down when idle.
- Proven 2026-09-20T23:58Z from outside the process: `/health` 200, `/ready` db true, live Jupiter quote, live PreStocks feed, keeper poll writing health rows on commit `275eee9`. Receipts empty because no fills have been sent.

## Setup

Toolchain is WSL Ubuntu user `devmo` (Anchor does not support native Windows).

```
solana-cli 4.1.2
anchor-cli 1.2.0
avm 1.2.0
```

Copy `.env.example` to `.env`. Never commit `.env` or keypair JSON.

```
pnpm install
pnpm test
pnpm --filter @tminus/sdk typecheck
pnpm --filter @tminus/api typecheck
pnpm --filter @tminus/keeper typecheck
pnpm secret-scan
pnpm --filter @tminus/api migrate
```

Program tests (WSL):

```
./scripts/wsl-anchor-build.sh
./scripts/wsl-anchor-test.sh
```

Jupiter composition simulation (does not send):

```
pnpm sim:compose
pnpm phase7
```

## Safety card (Phase 7, no send)

Tiny proof, if later authorized:

| Item | Value |
|---|---|
| Source mint | `PreANxuXjsy2pvisWWMNB6YaJNzr7681wJJr2rHsfTh` (SPACEX, Token-2022) |
| Destination mint | `Xs3oZwbHvqis4NYcf4YKWmEia2eC84wSiVrcYcTqpH8` (SPCXx) |
| Size | **200_000_000 raw** = 1 display |
| Expected place fee | 100 bps withheld on transfer into escrow |
| Cancel | owner `cancel` while open and unpaused |
| Expire | anyone after `hard_expiry` |
| Keeper send | **off** until the program account exists and a tiny spend is authorized |
| Spend cap | `KEEPER_SPEND_CAP_RAW=200000000` |
| Deploy wallet | `FrwqWhgEhbSnvKXzsG74qkB4ZsRiiheay7LcWBNd5DTj` |
| Keeper wallet | `FbsV4KELsCki2ZujWfRPvu4kpWHDdr1bxAvGNhU13hPf` |
| Abort | issuer pause, attached transfer hook, or fee-bps change vs keeper baseline |

Failsafe does **not** guarantee conversion regardless of liquidity.

## Known limitations

- Mainnet keeper/deploy wallets are unfunded (0 SOL).
- Phase 1 simulation did not return `err: null` because the taker account does not exist on mainnet.
- FRONTEND/ is intentionally absent.
- Public RPC + keyless Jupiter may 429.
- Issuer retains mint/freeze/pause/permanent-delegate powers on SPACEX; the program rejects pause and attached transfer hooks at fill/place time, and the keeper halts on those plus stale feed.
