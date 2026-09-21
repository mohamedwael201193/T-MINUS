#!/usr/bin/env bash
set -euo pipefail
export PATH="$HOME/.local/share/solana/install/active_release/bin:$HOME/.cargo/bin:$PATH"
cd /mnt/d/route/sol/T-MINUS
echo "=== solana program deploy help (rent-related) ==="
solana program deploy --help | sed -n '1,120p'
echo "=== current so ==="
ls -l target/deploy/tminus.so
sha256sum target/deploy/tminus.so
echo "=== solana rent so bytes ==="
BYTES=$(wc -c < target/deploy/tminus.so)
solana rent "$BYTES" --url https://api.mainnet-beta.solana.com
echo "=== solana rent programdata ==="
solana rent $((BYTES + 45)) --url https://api.mainnet-beta.solana.com
echo "=== solana rent buffer ==="
solana rent $((BYTES + 37)) --url https://api.mainnet-beta.solana.com
echo "=== solana rent program account ==="
solana rent 36 --url https://api.mainnet-beta.solana.com
echo RENT_CLI_DONE
