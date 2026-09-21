#!/usr/bin/env bash
set -euo pipefail
export PATH="$HOME/.local/share/solana/install/active_release/bin:$HOME/.cargo/bin:$PATH"
ROOT=/mnt/d/route/sol/T-MINUS
cd "$ROOT"
sed -i 's/\r$//' scripts/wsl-localnet-loader-invoke.sh scripts/localnet-loader-invoke.mjs || true
bash scripts/wsl-localnet-loader-invoke.sh
mkdir -p /mnt/d/route/sol/T-MINUS/.tmp-loader-exp
cp "$HOME/.tminus/loader-cost-exp/tight-payer.json" "$HOME/.tminus/loader-cost-exp/program-tight.json" /mnt/d/route/sol/T-MINUS/.tmp-loader-exp/
export TMINUS_LOADER_EXP=/mnt/d/route/sol/T-MINUS/.tmp-loader-exp
# Windows node.exe is on PATH from Anchor.toml test script
if command -v node >/dev/null 2>&1; then
  node scripts/localnet-loader-invoke.mjs
elif [ -x /mnt/d/Programs/nodejs/node.exe ]; then
  /mnt/d/Programs/nodejs/node.exe scripts/localnet-loader-invoke.mjs
else
  echo "NODE_MISSING"
  exit 2
fi
