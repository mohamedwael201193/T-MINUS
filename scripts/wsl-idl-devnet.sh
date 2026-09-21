#!/usr/bin/env bash
set -euo pipefail
export PATH="$HOME/.local/node/bin:$HOME/.local/share/solana/install/active_release/bin:$HOME/.cargo/bin:/usr/bin:/bin"
cd /mnt/d/route/sol/T-MINUS
if ! command -v node >/dev/null 2>&1; then
  mkdir -p "$HOME/.local"
  curl -fsSL https://nodejs.org/dist/v22.12.0/node-v22.12.0-linux-x64.tar.xz -o /tmp/node.tar.xz
  tar -xJf /tmp/node.tar.xz -C "$HOME/.local"
  ln -sfn "$HOME/.local/node-v22.12.0-linux-x64" "$HOME/.local/node"
fi
node --version
WALLET="/mnt/d/route/sol/T-MINUS/.tminus/user-fund.json"
anchor idl init HRLmVcuk6PRcVwB3UVpcbEC3LVVMhdLZfPvHtmL2PUdL \
  --filepath idl/tminus.json \
  --provider.cluster devnet \
  --provider.wallet "$WALLET"
echo IDL_INIT_DONE
