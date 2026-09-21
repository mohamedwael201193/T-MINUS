#!/usr/bin/env bash
set -euo pipefail
export PATH="$HOME/.local/share/solana/install/active_release/bin:$HOME/.cargo/bin:$PATH"
cd /mnt/d/route/sol/T-MINUS

echo "=== VERSIONS ==="
solana --version
anchor --version
rustc --version
cargo --version
echo "solana_bin=$(command -v solana)"
echo "anchor_bin=$(command -v anchor)"

echo "=== PROGRAM-V4 HELP ==="
set +e
solana program-v4 --help
V4_RC=$?
set -e
echo "program_v4_help_exit=$V4_RC"

echo "=== PROGRAM SUBCOMMANDS ==="
solana program --help | head -n 120

echo "=== KEY PUBKEYS (no secrets) ==="
solana-keygen pubkey /mnt/c/Users/LOQ/.tminus/keys/program.json
solana-keygen pubkey /mnt/c/Users/LOQ/.tminus/keys/user-fund.json
solana-keygen pubkey /mnt/c/Users/LOQ/.tminus/keys/deploy.json
solana-keygen pubkey /mnt/c/Users/LOQ/.tminus/keys/keeper.json

echo "=== ELF ==="
ls -la target/deploy || true
if [ -f target/deploy/tminus.so ]; then
  wc -c target/deploy/tminus.so
  sha256sum target/deploy/tminus.so
else
  echo "ELF_MISSING"
fi
