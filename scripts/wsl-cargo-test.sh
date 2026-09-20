#!/usr/bin/env bash
set -euo pipefail
export PATH="$HOME/.local/share/solana/install/active_release/bin:$HOME/.cargo/bin:$PATH"
cd /mnt/d/route/sol/T-MINUS
echo "=== CARGO TEST ==="
cargo test --manifest-path programs/tminus/Cargo.toml -- --nocapture
echo "=== TOOLS ==="
command -v node || true
command -v pnpm || true
command -v solana-test-validator || true
ls -la target/deploy || true
ls -la target/idl || true
sha256sum target/deploy/tminus.so || true
echo CARGO_TEST_DONE
