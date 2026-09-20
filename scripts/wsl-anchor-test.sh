#!/usr/bin/env bash
set -euo pipefail
export PATH="$HOME/.local/share/solana/install/active_release/bin:$HOME/.cargo/bin:$PATH"
cd /mnt/d/route/sol/T-MINUS
export ANCHOR_WALLET=/mnt/c/Users/LOQ/.tminus/keys/deploy.json
export ANCHOR_PROVIDER_URL=http://127.0.0.1:8899
/mnt/d/Programs/nodejs/node.exe --version
solana-test-validator --version
pkill -f solana-test-validator || true
sleep 2
anchor test --skip-build --validator legacy
echo ANCHOR_TEST_DONE
