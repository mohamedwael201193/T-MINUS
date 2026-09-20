#!/usr/bin/env bash
set -euo pipefail
export PATH="$HOME/.local/share/solana/install/active_release/bin:$HOME/.cargo/bin:$PATH"
echo "=== VERSIONS ==="
solana --version
anchor --version
avm --version
echo "=== CLUSTER ==="
solana cluster-version
echo "=== EPOCH ==="
solana epoch-info
echo "=== CONFIG ==="
solana config get
echo "=== KEYS ==="
solana-keygen pubkey /mnt/c/Users/LOQ/.tminus/keys/deploy.json
solana-keygen pubkey /mnt/c/Users/LOQ/.tminus/keys/keeper.json
solana-keygen pubkey /mnt/c/Users/LOQ/.tminus/keys/program.json
ls -la /mnt/c/Users/LOQ/.tminus/keys/
echo "=== BUILD-SBF ==="
if command -v cargo-build-sbf >/dev/null 2>&1; then
  cargo-build-sbf --version || true
fi
echo PHASE0_VERIFY_DONE
