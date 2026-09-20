# T-MINUS

Conditional conversion orders for PreStocks Token-2022 mints: escrow source tokens, fill at an executable destination ratio or after a failsafe timestamp, expire leftover to the owner.

Frontend is **not** built in this repository. It will arrive later in `FRONTEND/` from an external agent.

## What is real

| Piece | Status | Evidence |
|---|---|---|
| Anchor program `place` / `cancel` / `fill` / `expire` | Built and tested on **LOCALNET** | `evidence/program-build.json`, `anchor test --validator legacy` 5/5 |
| Token-2022 post-fee escrow + harvest-before-close | **LOCALNET** PASS | 100 bps fee mint fixture (not SPACEX) |
| Jupiter Swap V2 `/build` + extra ix composition | **SIMULATION** | `evidence/phase1-sim.json` — 565 bytes, ALT present, `err=AccountNotFound` because keeper has 0 SOL |
| API `/health` `/ready` `/v1/feed` `/v1/quote` | **LOCAL** against mainnet RPC + Supabase | `evidence/api-smoke.json` |
| Keeper worker | Implemented, **send disabled** by default | `KEEPER_SEND_ENABLED=false` |
| Devnet deploy | Not yet | Needs faucet SOL |
| Mainnet program deploy / fills | Not yet | Deploy and keeper wallets have **0 SOL**; spend cap 200_000_000 raw once funded |
| Frontend | Not built | Awaiting `FRONTEND/` |

## Program

- Program ID: `HRLmVcuk6PRcVwB3UVpcbEC3LVVMhdLZfPvHtmL2PUdL`
- IDL: `idl/tminus.json`
- Network for the ID: declared for localnet/devnet/mainnet; only localnet execution is proven so far

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
```

## Safety

- On-chain program is source of truth for escrow.
- API has no custody and exposes no keys.
- Keeper will not send transactions unless `KEEPER_SEND_ENABLED=true`.
- Feed staleness and issuer pause/hook halt keeper fills.
- Transfer-fee Token-2022 escrow accounts are harvested before close.
- Do not treat simulations as confirmed transactions.

## Known limitations

- Mainnet keeper/deploy wallets are unfunded (0 SOL).
- Phase 1 simulation did not return `err: null` because the taker account does not exist on mainnet.
- FRONTEND/ is intentionally absent.
- Public RPC + keyless Jupiter may 429.
- Issuer retains mint/freeze/pause/permanent-delegate powers on SPACEX; the program rejects pause and attached transfer hooks at fill/place time, and the keeper halts on those plus stale feed.
