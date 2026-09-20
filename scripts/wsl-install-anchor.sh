#!/usr/bin/env bash
set -euo pipefail
export PATH="$HOME/.local/share/solana/install/active_release/bin:$HOME/.cargo/bin:$PATH"
if ! command -v avm >/dev/null 2>&1; then
  echo "INSTALLING_AVM"
  cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
fi
avm --version
echo "INSTALLING_ANCHOR_LATEST"
avm install latest
avm use latest
anchor --version
echo ANCHOR_INSTALL_DONE
