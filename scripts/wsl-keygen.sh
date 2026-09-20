#!/usr/bin/env bash
set -euo pipefail
export PATH="$HOME/.local/share/solana/install/active_release/bin:$HOME/.cargo/bin:$PATH"
WIN_KEYS="/mnt/c/Users/LOQ/.tminus/keys"
mkdir -p "$WIN_KEYS"
chmod 700 "$WIN_KEYS" || true
for name in deploy keeper program; do
  out="$WIN_KEYS/${name}.json"
  if [ ! -f "$out" ]; then
    solana-keygen new --no-bip39-passphrase --silent --outfile "$out"
  fi
  echo "${name}_pubkey $(solana-keygen pubkey "$out")"
done
echo KEYGEN_DONE
