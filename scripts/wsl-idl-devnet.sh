#!/usr/bin/env bash
set -euo pipefail
export PATH="/mnt/d/Programs/nodejs:$HOME/.local/share/solana/install/active_release/bin:$HOME/.cargo/bin:/usr/bin:/bin"
cd /mnt/d/route/sol/T-MINUS
WALLET='D:\route\sol\T-MINUS\.tminus\user-fund.json'
echo "node=$(command -v node)"
node --version
anchor idl init HRLmVcuk6PRcVwB3UVpcbEC3LVVMhdLZfPvHtmL2PUdL \
  --filepath idl/tminus.json \
  --provider.cluster devnet \
  --provider.wallet "$WALLET" || \
anchor idl upgrade HRLmVcuk6PRcVwB3UVpcbEC3LVVMhdLZfPvHtmL2PUdL \
  --filepath idl/tminus.json \
  --provider.cluster devnet \
  --provider.wallet "$WALLET"
echo IDL_DONE
