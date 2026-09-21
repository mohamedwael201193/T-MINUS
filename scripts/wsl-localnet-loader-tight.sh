#!/usr/bin/env bash
# Tight-wallet LOCALNET deploy: prove loader-v3 does not need 2x ELF rent in the payer.
set -euo pipefail
export PATH="$HOME/.local/share/solana/install/active_release/bin:$HOME/.cargo/bin:$PATH"
ROOT=/mnt/d/route/sol/T-MINUS
cd "$ROOT"
SO="$ROOT/target/deploy/tminus.so"
WORKDIR="$HOME/.tminus/loader-cost-exp"
EVIDENCE="$ROOT/evidence/localnet-loader-tight.json"

LEDGER="$WORKDIR/ledger"
if ! solana cluster-version --url http://127.0.0.1:8899 >/dev/null 2>&1; then
  pkill -f "solana-test-validator" || true
  sleep 1
  rm -rf "$LEDGER"
  nohup solana-test-validator --ledger "$LEDGER" --reset --quiet >/tmp/tminus-localnet-validator.log 2>&1 &
  for i in $(seq 1 60); do
    if solana cluster-version --url http://127.0.0.1:8899 >/dev/null 2>&1; then
      echo "validator_ready after ${i}s"
      break
    fi
    sleep 1
  done
fi
solana cluster-version --url http://127.0.0.1:8899 >/dev/null
solana config set --url http://127.0.0.1:8899 >/dev/null

BYTES=$(wc -c < "$SO" | tr -d ' ')
rent_lamports() {
  solana rent "$1" --url http://127.0.0.1:8899 --lamports | grep -Eo '[0-9]+' | tail -n1
}
RENT_PD=$(rent_lamports $((BYTES + 45)))
RENT_PROG=$(rent_lamports 36)
# Safe tight budget: programdata + program + 0.02 SOL fees
NEED=$((RENT_PD + RENT_PROG + 20000000))
echo "bytes=$BYTES rent_programdata=$RENT_PD rent_program=$RENT_PROG need=$NEED"

TIGHT="$WORKDIR/tight-payer.json"
PROG="$WORKDIR/program-tight.json"
solana-keygen new --no-bip39-passphrase --force -o "$TIGHT" >/dev/null
solana-keygen new --no-bip39-passphrase --force -o "$PROG" >/dev/null
TIGHT_PUB=$(solana-keygen pubkey "$TIGHT")
PROG_PUB=$(solana-keygen pubkey "$PROG")

# Fund from airdrop in exact lamports if possible; otherwise airdrop 2 then leave the rest.
solana airdrop 2 "$TIGHT_PUB" --url http://127.0.0.1:8899 >/dev/null
sleep 1
HAVE=$(solana balance "$TIGHT_PUB" --url http://127.0.0.1:8899 --lamports | awk '{print $1}')
echo "tight_payer=$TIGHT_PUB have=$HAVE need=$NEED program=$PROG_PUB"

if [ "$HAVE" -lt "$NEED" ]; then
  echo "TIGHT_FUND_FAIL have=$HAVE need=$NEED"
  exit 2
fi

BEFORE=$HAVE
set +e
OUT=$(solana program deploy "$SO" \
  --url http://127.0.0.1:8899 \
  --keypair "$TIGHT" \
  --program-id "$PROG" \
  --upgrade-authority "$TIGHT" 2>&1)
RC=$?
set -e
AFTER=$(solana balance "$TIGHT_PUB" --url http://127.0.0.1:8899 --lamports | awk '{print $1}')
SHOW=$(solana program show "$PROG_PUB" --url http://127.0.0.1:8899 2>&1 || true)
echo "tight_deploy_rc=$RC after=$AFTER"
echo "$SHOW"

export BYTES TIGHT_PUB PROG_PUB NEED BEFORE AFTER RC RENT_PD RENT_PROG SHOW OUT
python3 - "$ROOT/evidence/localnet-loader-tight.json" <<'PY'
import json, os, sys, time
need = int(os.environ["NEED"])
have = int(os.environ["BEFORE"])
after = int(os.environ["AFTER"])
out = {
  "label": "LOCALNET_LOADER_TIGHT",
  "at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
  "soBytes": int(os.environ["BYTES"]),
  "payer": os.environ["TIGHT_PUB"],
  "programId": os.environ["PROG_PUB"],
  "localnetRent": {
    "programDataLamports": int(os.environ["RENT_PD"]),
    "programLamports": int(os.environ["RENT_PROG"]),
    "needLamports": need,
    "needSol": need / 1e9,
  },
  "haveBeforeLamports": have,
  "haveAfterLamports": after,
  "deployExit": int(os.environ["RC"]),
  "deltaLamports": have - after,
  "provedTwoXNotRequired": int(os.environ["RC"]) == 0 and have < 2 * int(os.environ["RENT_PD"]),
  "show": os.environ.get("SHOW", ""),
  "deployOut": (os.environ.get("OUT") or "")[:2000],
}
with open(sys.argv[1], "w", encoding="utf-8") as f:
    json.dump(out, f, indent=2)
print(json.dumps(out, indent=2))
PY
