# T-MINUS environment variables

Do not put secret values in this file, in git, or in chat.

| Variable | Purpose | Required | Source | Local | Render |
|---|---|---|---|---|---|
| `RENDER_API_KEY` | Deploy/inspect Render services | When deploying keeper/API | Operator | `.env` | Render dashboard (not needed on the box) |
| `VERCEL_TOKEN` | Later frontend deploy only | No until Phase 10 | Operator | `.env` | Not used by keeper |
| `GITHUB_TOKEN` | Repo/API access | For CI push/inspect | Operator PAT | `.env` | GitHub Actions secret |
| `GITHUB_REPO` | Canonical remote | Yes | `https://github.com/mohamedwael201193/T-MINUS` | `.env` | same |
| `DATABASE_URL` | Supabase transaction-mode pooler (PgBouncer `:6543`) | Yes if keeper/API persist receipts/jobs | Operator | `.env` | Render secret |
| `DIRECT_URL` | Supabase session-mode pooler (`:5432`) for migrations | Yes for migrations | Operator | `.env` | Render secret / CI |
| `SOLANA_NETWORK` | `mainnet-beta` or `devnet` | Yes | This repo | `.env` | Render |
| `SOLANA_RPC_URL` | JSON-RPC | Yes | Public default until a paid RPC is provided | `.env` | Render |
| `SOLANA_WS_URL` | Optional logs subscribe | Optional | Same provider | `.env` | Render |
| `PROGRAM_ID` | Deployed program | After Phase 2 deploy | `solana program show` | `.env` | Render |
| `KEEPER_KEYPAIR_PATH` | Filesystem path to keeper keypair JSON | Local keeper | Operator-generated | path only | Prefer `KEEPER_KEYPAIR_JSON` on Render |
| `KEEPER_KEYPAIR_JSON` | Raw keypair byte array as JSON | Render keeper | Operator-generated | never | Render secret |
| `ANCHOR_WALLET` | Deployer keypair path | Deploy only | Operator-generated | path only | never |
| `JUPITER_API_BASE` | Swap V2 | Yes | `https://api.jup.ag` | `.env` | Render |
| `JUPITER_LITE_API_BASE` | Quote / Trigger V1 probes | Yes | `https://lite-api.jup.ag` | `.env` | Render |
| `JUPITER_API_KEY` | Raises rate limit | Optional | Jupiter portal | `.env` | Render |
| `PRESTOCKS_METRICS_URL` | Live token metrics | Yes | `https://prestocks.com/api/metrics` | `.env` | Render |
| `SPACEX_MINT` / `SPCXX_MINT` | Demo pair | Yes | On-chain / issuer | `.env` | Render |
| `TOKEN_2022_PROGRAM` | TokenzQd… | Yes | Public | `.env` | Render |
| `KEEPER_POLL_MS` | Loop interval | Yes | Default `5000` | `.env` | Render |
| `KEEPER_MAX_IN_FLIGHT` | Concurrent fill attempts | Yes | Default `1` | `.env` | Render |
| `KEEPER_SPEND_CAP_RAW` | Max source raw per fill | Yes before mainnet fills | Operator | `.env` | Render |
| `FEED_STALE_MS` | Halt if feed older than this | Yes | Default `300000` | `.env` | Render |
| `KEEPER_EMBEDDED` | Run keeper inside the API process | Free Render | `true` on the free web service | `false` locally unless combining | `true` |
| `LOG_LEVEL` / `PORT` | Process | Yes | Default `info` / `3000` | `.env` | Render |

## Safe handling

- Commit `.env.example` only.
- Never print `.env`.
- Rotate any secret that was pasted in chat.
- Do not store private keys in source. Prefer a file path or a Render secret file.
- `DATABASE_URL` uses `:6543?pgbouncer=true`. `DIRECT_URL` uses `:5432` for migrations only.

## What not to commit

`.env`, keypair JSON, Render/Vercel/GitHub tokens, database passwords, program upgrade authority keys.
