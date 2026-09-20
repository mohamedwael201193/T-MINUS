#!/usr/bin/env bash
set -euo pipefail
export PATH="$HOME/.local/share/solana/install/active_release/bin:$HOME/.cargo/bin:$PATH"
solana --version
solana cluster-version
solana epoch-info
solana config set --url https://api.mainnet-beta.solana.com
solana config get
