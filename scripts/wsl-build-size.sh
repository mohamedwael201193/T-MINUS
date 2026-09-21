#!/usr/bin/env bash
set -euo pipefail
export PATH="$HOME/.local/share/solana/install/active_release/bin:$HOME/.cargo/bin:$PATH"
cd /mnt/d/route/sol/T-MINUS
mkdir -p target/deploy evidence
cp /mnt/c/Users/LOQ/.tminus/keys/program.json target/deploy/tminus-keypair.json
BEFORE=254768
BEFORE_SHA="978c80e5ce1f4a8328f885c89f35d0c9d3b1aa93031903d2b8ee9c22d1cffff6"
anchor build
BYTES=$(wc -c < target/deploy/tminus.so)
SHA=$(sha256sum target/deploy/tminus.so | awk '{print $1}')
echo "BASELINE_BYTES=$BEFORE"
echo "BASELINE_SHA=$BEFORE_SHA"
echo "OPTIMIZED_BYTES=$BYTES"
echo "OPTIMIZED_SHA=$SHA"
echo "DELTA_BYTES=$((BYTES - BEFORE))"
python3 - <<PY || true
b=$BEFORE
a=$BYTES
print("delta_pct=%.2f" % (100.0 * (a-b) / b))
PY
echo ANCHOR_BUILD_SIZE_DONE
