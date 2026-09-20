#!/usr/bin/env bash
set -euo pipefail
export PATH="$HOME/.local/share/solana/install/active_release/bin:$HOME/.cargo/bin:$PATH"
echo "BEFORE $(cargo-build-sbf --version || true)"
set +e
cargo-build-sbf --tools-version v1.57 --install-only
echo "install_exit=$?"
set -e
echo "AFTER $(cargo-build-sbf --version || true)"
ls -la "$HOME/.cache/solana" 2>/dev/null || true
ls -la "$HOME/.local/share/solana/install/active_release/bin" | head
