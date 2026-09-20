#!/usr/bin/env bash
set -euo pipefail
export PATH="$HOME/.local/share/solana/install/active_release/bin:$HOME/.cargo/bin:$PATH"
solana airdrop 2 FrwqWhgEhbSnvKXzsG74qkB4ZsRiiheay7LcWBNd5DTj --url https://api.devnet.solana.com
solana balance FrwqWhgEhbSnvKXzsG74qkB4ZsRiiheay7LcWBNd5DTj --url https://api.devnet.solana.com
echo AIRDROP_DONE
