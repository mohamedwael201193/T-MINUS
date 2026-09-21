# T-MINUS

Conditional conversion orders for PreStocks Token-2022 mints: escrow source tokens, fill at an executable destination ratio or after a failsafe timestamp, expire leftover to the owner.

Frontend is **not** built in this repository. It will arrive later in `FRONTEND/` from an external agent.

## What is real

| Piece | Status | Evidence |
|---|---|---|
| Anchor program `place` / `cancel` / `fill` / `expire` | Built, tested on LOCALNET, **deployed DEVNET** | `evidence/program-build.json`, `evidence/devnet-e2e.json` |
| Token-2022 post-fee escrow + harvest-before-close | **LOCALNET** PASS | 100 bps fee mint fixture (not SPACEX) |
| Pause / transfer-hook rejection | **UNIT + LOCALNET** | rust TLV tests; mocha paused/hook mint fixtures |
| Jupiter Swap V2 `/build` + extra ix composition | **SIMULATION** | `evidence/phase1-sim.json` — **636** bytes with real `fill` ix, ALT present, `err=AccountNotFound` (no mainnet program / unfunded taker) |
| API `/health` `/ready` `/v1/feed` `/v1/quote` `/v1/keeper` `/v1/receipts` `/v1/orders/:pda` `/v1/program` | **LIVE FREE Render** | `https://tminus-api-k2d2.onrender.com` — receipts are **DEVNET** explorer-linked JSON; `/v1/orders?cluster=devnet` served open orders; `/v1/program` dual-cluster |
| Keeper worker | Embedded in the free web service, **send disabled** | `KEEPER_SEND_ENABLED=false`; `/v1/keeper` `halted: false` |
| Devnet deploy | **LIVE** (254,768-byte ELF `978c80e5…`) | Program executable; IDL `FMSPeg37…`; sigs in `evidence/devnet-e2e.json`. Local optimized `.so` is now **209,256** bytes (`838ebc5c…`) — smaller than the already-deployed devnet ELF; behavior tests 12/12 |
| Mainnet program deploy / fills | **NOT DEPLOYED** | Exact minimum safe balance **2.14859112 SOL** (`2,148,591,120` lamports). See `evidence/mainnet-deploy-rent.json` |
| Frontend | Not built | Awaiting `FRONTEND/` |

## Program

- Program ID: `HRLmVcuk6PRcVwB3UVpcbEC3LVVMhdLZfPvHtmL2PUdL`
- IDL: `idl/tminus.json` (also initialized on **devnet**: [`FMSPeg37…f2n`](https://explorer.solana.com/address/FMSPeg37dVKeHARb5gaBiN8epoJcinqSBHMqkLKu8f2n?cluster=devnet))
- Network for the ID: **DEVNET executable** (254,768-byte ELF). Localnet tests pass on the optimized **209,256-byte** ELF. Mainnet account still absent.
- Upgrade authority (devnet): `CpTxsgPjvaaPSaBKkijvB1h3hzgJmPiTsWNhuS7tRkgX`

## Devnet explorer

- Program: https://explorer.solana.com/address/HRLmVcuk6PRcVwB3UVpcbEC3LVVMhdLZfPvHtmL2PUdL?cluster=devnet
- Place: https://explorer.solana.com/tx/4bQGKezkzwM7576eAnDtkDDPzQPff9qCB6nz8a4hDdVwCTfDqZqFQnLL8JeEzTQz8RrHcc6iirb88ygtM5M2eTPK?cluster=devnet
- Cancel: https://explorer.solana.com/tx/27RpwuFScXheLTScUEckuB8vgZKF7KCRSGC4E22BgWP1KRnfUirXJD5rJsGUCGq2ay3a8JbtKW9inVWnQFWyMTf6?cluster=devnet
- Fill: https://explorer.solana.com/tx/26YLJiQh51AeQH2XNXqGgruM3L5KthHNNk83z1iSsNL4WiLnDYbmPD4ffaZX997sibXvc8doRZZKDJSARcc9mv7x?cluster=devnet
- Expire: https://explorer.solana.com/tx/3H6f11sD5F3vzVgTD287CW4xcUWePNjkwCRiLdDJDEB251cyuD56Y2GPyzjLCWcTPePGVaJD8u7D8ZSJUBTRY8Zm?cluster=devnet
- Keeper `fillIx` partial: https://explorer.solana.com/tx/3Hjih2B1D932mKZfBC2WTXM9feET7hjESDom3XoGWC2PFz1SgMBcygCWn6xjeRMexrrR71PJwmRc8JBpc6pSRDDq?cluster=devnet
- Keeper `fillIx` close: https://explorer.solana.com/tx/2BRjKVVtexSTan4FjjtzSSJwvnk1MSgWUamACDqoArTZ2K8b1tmhxMnGnaLjLjcsBFfshbUxCvhh4iWAYUhnDi6r?cluster=devnet
- Keeper `tick()` failsafe fill: https://explorer.solana.com/tx/5cZurXQRKMZGWoLhpyamUjGQ9dZn61UgckDf7osoVwk34U6kVMNJ6XuAGiSH7GDoiWaTa2BKV9EXjFHHvVKAuwXw?cluster=devnet
- Double-fill winner: https://explorer.solana.com/tx/3izkZKftK3gD8dci6ahszq5U41W1V18th8P1uwHFAmnWpVRunVXMZhkJ1BkDHPGf3dpSLRnSQB3MmBhgnA2XEizC?cluster=devnet
- Double-fill sequential drain: https://explorer.solana.com/tx/2FMcQp6wtVkHzLVvfdK6vQDpMCdBDQbRNQkK5zxsDgNgkYsodEND9F9NfC52zvRXFGrmhpSpsuBvSMtmBFULBjNw?cluster=devnet
- Fixture mints are **not** SPACEX. Post-fee escrow was 990_000 raw on 1_000_000 in at 100 bps. Keeper inventory fills were 400_000 then 590_000. Failsafe tick filled 990_000 after `failsafe_ts`.

## Live service (FREE Render)

- API: `https://tminus-api-k2d2.onrender.com`
- Dashboard: `https://dashboard.render.com/web/srv-dao6t2rtqb8s73e52mbg`
- Plan: **free** web service. Keeper runs in-process (`KEEPER_EMBEDDED=true`). Render free instances spin down when idle.
- Proven 2026-09-21T00:32Z on commit `136ba97`: `/health` 200, `/ready` db true, `/v1/receipts` returns 4 **DEVNET** rows with explorer sigs. `/v1/program` reports devnet executable, mainnet absent. Keeper send remains off.

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
| Deploy wallet | `FrwqWhgEhbSnvKXzsG74qkB4ZsRiiheay7LcWBNd5DTj` (0 SOL both clusters) |
| Keeper wallet | `FbsV4KELsCki2ZujWfRPvu4kpWHDdr1bxAvGNhU13hPf` (0 SOL both clusters) |
| User-fund / upgrade authority | `CpTxsgPjvaaPSaBKkijvB1h3hzgJmPiTsWNhuS7tRkgX` (mainnet 0.032433259 SOL + 1,827,211 raw SPACEX; exact deploy minimum **2.14859112 SOL**) |
| Abort | issuer pause, attached transfer hook, or fee-bps change vs keeper baseline |

Failsafe does **not** guarantee conversion regardless of liquidity.

## Known limitations

- Mainnet program is **not deployed**. Exact minimum safe deploy balance is **2.14859112 SOL** for the 209,256-byte ELF (`evidence/mainnet-deploy-rent.json`). Tiny SPACEX inventory is already on the payer.
- Phase 1 simulation did not return `err: null` because the program account does not exist on mainnet.
- FRONTEND/ is intentionally absent.
- Public RPC + keyless Jupiter may 429.
- Issuer retains mint/freeze/pause/permanent-delegate powers on SPACEX; the program rejects pause and attached transfer hooks at fill/place time, and the keeper halts on those plus stale feed.
