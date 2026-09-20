#!/usr/bin/env bash
set -euo pipefail
export PATH="$HOME/.local/share/solana/install/active_release/bin:$HOME/.cargo/bin:$PATH"
if ! command -v solana >/dev/null 2>&1; then
  echo "INSTALLING_SOLANA"
  curl -sSfL https://release.anza.xyz/stable/install | sh
else
  echo "SOLANA_ALREADY"
fi
export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"
solana --version
if ! grep -q 'solana/install/active_release/bin' "$HOME/.bashrc" 2>/dev/null; then
  echo 'export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"' >> "$HOME/.bashrc"
fi
echo SOLANA_INSTALL_DONE
