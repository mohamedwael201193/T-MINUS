#!/usr/bin/env bash
set -euo pipefail
export PATH="$HOME/.local/share/solana/install/active_release/bin:$HOME/.cargo/bin:$PATH"
cd /mnt/d/route/sol/T-MINUS
echo "=== features from cargo tree ==="
cargo tree -p tminus -e features --prefix none 2>/dev/null | head -80 || true
echo "=== grep anchor-spl Cargo.toml in registry ==="
find "$HOME/.cargo/registry/src" -path "*anchor-spl-1.2*" -name Cargo.toml | head -5
ANCHOR_SPL=$(find "$HOME/.cargo/registry/src" -path "*anchor-spl-1.2*" -name Cargo.toml | head -1)
if [ -n "$ANCHOR_SPL" ]; then
  echo "FILE=$ANCHOR_SPL"
  sed -n '1,80p' "$ANCHOR_SPL"
fi
echo "=== solana program deploy help ==="
solana program deploy --help | head -80
echo FEATURES_DONE
