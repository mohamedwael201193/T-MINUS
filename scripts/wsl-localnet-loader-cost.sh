#!/usr/bin/env bash
# Temporary LOCALNET loader-v3 vs loader-v4 cost experiment.
# Uses a FRESH program keypair. Does not touch production program ID.
set -euo pipefail
export PATH="$HOME/.local/share/solana/install/active_release/bin:$HOME/.cargo/bin:$PATH"
ROOT=/mnt/d/route/sol/T-MINUS
cd "$ROOT"
SO="$ROOT/target/deploy/tminus.so"
EVIDENCE="$ROOT/evidence/localnet-loader-cost.json"
WORKDIR="$HOME/.tminus/loader-cost-exp"
mkdir -p "$WORKDIR" "$ROOT/evidence"

if [ ! -f "$SO" ]; then
  echo "ELF missing; building optimized tminus.so"
  anchor build --no-idl
fi
BYTES=$(wc -c < "$SO" | tr -d ' ')
SHA=$(sha256sum "$SO" | awk '{print $1}')
echo "so_bytes=$BYTES sha256=$SHA"

LEDGER="$WORKDIR/ledger"
pkill -f "solana-test-validator" || true
sleep 1
rm -rf "$LEDGER"
solana-test-validator --ledger "$LEDGER" --reset --quiet >/tmp/tminus-localnet-validator.log 2>&1 &
VAL_PID=$!
echo "validator_pid=$VAL_PID"
for i in $(seq 1 60); do
  if solana cluster-version --url http://127.0.0.1:8899 >/dev/null 2>&1; then
    echo "validator_ready after ${i}s"
    break
  fi
  sleep 1
done
solana config set --url http://127.0.0.1:8899 >/dev/null

PAYER="$WORKDIR/payer.json"
PROG_V3="$WORKDIR/program-v3.json"
solana-keygen new --no-bip39-passphrase --force -o "$PAYER" >/dev/null
solana-keygen new --no-bip39-passphrase --force -o "$PROG_V3" >/dev/null
PAYER_PUB=$(solana-keygen pubkey "$PAYER")
PROG_V3_PUB=$(solana-keygen pubkey "$PROG_V3")
echo "payer=$PAYER_PUB"
echo "program_v3=$PROG_V3_PUB"

solana airdrop 5 "$PAYER_PUB" --url http://127.0.0.1:8899 >/dev/null
sleep 2
BEFORE=$(solana balance "$PAYER_PUB" --url http://127.0.0.1:8899 --lamports | awk '{print $1}')
echo "before_lamports=$BEFORE"

BAL_LOG="$WORKDIR/v3-balances.txt"
: > "$BAL_LOG"
(
  while true; do
    TS=$(date +%s%3N)
    BAL=$(solana balance "$PAYER_PUB" --url http://127.0.0.1:8899 --lamports 2>/dev/null | awk '{print $1}')
    echo "$TS $BAL" >> "$BAL_LOG"
    sleep 0.2
  done
) &
POLL_PID=$!

set +e
DEPLOY_OUT=$(solana program deploy "$SO" \
  --url http://127.0.0.1:8899 \
  --keypair "$PAYER" \
  --program-id "$PROG_V3" \
  --upgrade-authority "$PAYER" 2>&1)
DEPLOY_RC=$?
set -e
kill "$POLL_PID" >/dev/null 2>&1 || true
wait "$POLL_PID" 2>/dev/null || true
sleep 0.5
AFTER=$(solana balance "$PAYER_PUB" --url http://127.0.0.1:8899 --lamports | awk '{print $1}')
MIN_BAL=$(awk 'NF>=2 {print $2}' "$BAL_LOG" | sort -n | head -1)
echo "deploy_rc=$DEPLOY_RC after_lamports=$AFTER min_sampled_lamports=$MIN_BAL"

set +e
SHOW_V3=$(solana program show "$PROG_V3_PUB" --url http://127.0.0.1:8899 2>&1)
set -e
echo "$SHOW_V3"

ACCOUNT_V3=$(solana account "$PROG_V3_PUB" --url http://127.0.0.1:8899 --output json 2>/dev/null || true)

set +e
V4_HELP=$(solana program-v4 --help 2>&1)
V4_HELP_RC=$?
set -e
V4_RESULT="cli_absent"
V4_OUT=""
PROG_V4_PUB=""
BEFORE_V4=""
AFTER_V4=""
if [ "$V4_HELP_RC" -eq 0 ]; then
  PROG_V4="$WORKDIR/program-v4.json"
  solana-keygen new --no-bip39-passphrase --force -o "$PROG_V4" >/dev/null
  PROG_V4_PUB=$(solana-keygen pubkey "$PROG_V4")
  BEFORE_V4=$(solana balance "$PAYER_PUB" --url http://127.0.0.1:8899 --lamports | awk '{print $1}')
  set +e
  V4_OUT=$(solana program-v4 deploy "$SO" \
    --url http://127.0.0.1:8899 \
    --keypair "$PAYER" \
    --program-keypair "$PROG_V4" 2>&1)
  V4_RC=$?
  set -e
  AFTER_V4=$(solana balance "$PAYER_PUB" --url http://127.0.0.1:8899 --lamports | awk '{print $1}')
  V4_RESULT="exit_$V4_RC"
else
  V4_RC=$V4_HELP_RC
  V4_OUT="$V4_HELP"
fi

export BYTES SHA PAYER_PUB PROG_V3_PUB DEPLOY_RC BEFORE AFTER MIN_BAL SHOW_V3 DEPLOY_OUT ACCOUNT_V3
export V4_HELP_RC V4_RESULT PROG_V4_PUB BEFORE_V4 AFTER_V4 V4_OUT
python3 - "$EVIDENCE" <<'PY'
import json, os, sys, time
path = sys.argv[1]
out = {
  "label": "LOCALNET_LOADER_COST",
  "at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
  "soBytes": int(os.environ["BYTES"]),
  "sha256": os.environ["SHA"],
  "payer": os.environ["PAYER_PUB"],
  "loaderV3": {
    "programId": os.environ["PROG_V3_PUB"],
    "deployExit": int(os.environ["DEPLOY_RC"]),
    "beforeLamports": int(os.environ["BEFORE"]),
    "afterLamports": int(os.environ["AFTER"]),
    "minSampledLamports": int(os.environ.get("MIN_BAL") or 0),
    "deltaLamports": int(os.environ["BEFORE"]) - int(os.environ["AFTER"]),
    "peakSpendLamports": int(os.environ["BEFORE"]) - int(os.environ.get("MIN_BAL") or os.environ["AFTER"]),
    "show": os.environ.get("SHOW_V3", ""),
    "deployOut": (os.environ.get("DEPLOY_OUT") or "")[:4000],
    "account": os.environ.get("ACCOUNT_V3", ""),
  },
  "loaderV4": {
    "cliHelpExit": int(os.environ["V4_HELP_RC"]),
    "result": os.environ["V4_RESULT"],
    "programId": os.environ.get("PROG_V4_PUB") or None,
    "beforeLamports": int(os.environ["BEFORE_V4"]) if os.environ.get("BEFORE_V4") else None,
    "afterLamports": int(os.environ["AFTER_V4"]) if os.environ.get("AFTER_V4") else None,
    "outputHead": (os.environ.get("V4_OUT") or "")[:2000],
  },
}
with open(path, "w", encoding="utf-8") as f:
    json.dump(out, f, indent=2)
print(json.dumps(out, indent=2))
PY

echo LOCALNET_LOADER_COST_DONE
