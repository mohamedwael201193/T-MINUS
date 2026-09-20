#!/usr/bin/env bash
set -euo pipefail
export PATH="$HOME/.local/share/solana/install/active_release/bin:$HOME/.cargo/bin:$PATH"
cd /mnt/d/route/sol/T-MINUS
mkdir -p target/deploy
cp /mnt/c/Users/LOQ/.tminus/keys/program.json target/deploy/tminus-keypair.json
anchor --version
anchor build
echo ANCHOR_BUILD_DONE
