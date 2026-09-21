#!/usr/bin/env bash
# Dump localnet program ELF and send a dummy instruction to prove executable.
set -euo pipefail
export PATH="$HOME/.local/share/solana/install/active_release/bin:$HOME/.cargo/bin:$PATH"
ROOT=/mnt/d/route/sol/T-MINUS
WORKDIR="$HOME/.tminus/loader-cost-exp"
PROG=$(solana-keygen pubkey "$WORKDIR/program-tight.json")
PAYER="$WORKDIR/tight-payer.json"
DUMP="$WORKDIR/dumped.so"
solana program dump "$PROG" "$DUMP" --url http://127.0.0.1:8899
echo "dump_bytes=$(wc -c < "$DUMP" | tr -d ' ')"
echo "dump_sha=$(sha256sum "$DUMP" | awk '{print $1}')"
echo "orig_sha=$(sha256sum $ROOT/target/deploy/tminus.so | awk '{print $1}')"
# Minimal invoke: empty data will fail inside the program but proves the loader can execute it.
set +e
OUT=$(solana program show "$PROG" --url http://127.0.0.1:8899)
set -e
echo "$OUT"
# Keep validator for dump only; caller may stop it.
