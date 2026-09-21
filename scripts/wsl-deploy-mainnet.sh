#!/usr/bin/env bash
# Mainnet deploy. Refuses unless the payer has enough SOL for rent + fees.
# Never prints key material. Tiny later fills stay gated by KEEPER_SPEND_CAP_RAW.
set -euo pipefail
export PATH="$HOME/.local/share/solana/install/active_release/bin:$HOME/.cargo/bin:$PATH"
cd /mnt/d/route/sol/T-MINUS
WALLET="${ANCHOR_WALLET:-/mnt/c/Users/LOQ/.tminus/keys/user-fund.json}"
RPC="${SOLANA_RPC_URL:-https://api.mainnet-beta.solana.com}"
PROGRAM_ID="HRLmVcuk6PRcVwB3UVpcbEC3LVVMhdLZfPvHtmL2PUdL"
SO="target/deploy/tminus.so"
BYTES=$(wc -c < "$SO")
# Upgradeable loader programdata = 45 byte header + ELF
RENT_JSON=$(solana rent "$BYTES" --output json)
echo "so_bytes=$BYTES"
echo "rent_quote=$RENT_JSON"
PUB=$(solana-keygen pubkey "$WALLET")
echo "payer=$PUB"
LAMPORTS=$(solana balance "$PUB" --url "$RPC" --lamports | awk '{print $1}')
echo "payer_lamports=$LAMPORTS"
# Need programdata rent + ~0.05 SOL fees/buffer. Refuse below 1.9 SOL.
NEED=1900000000
if [ "${LAMPORTS:-0}" -lt "$NEED" ]; then
  echo "INSUFFICIENT_MAINNET_SOL have=$LAMPORTS need=$NEED"
  echo "Send at least 2.0 SOL to $PUB then re-run. Current balance cannot rent a ${BYTES}-byte program."
  solana program show "$PROGRAM_ID" --url "$RPC" || true
  exit 2
fi
mkdir -p target/deploy
cp /mnt/c/Users/LOQ/.tminus/keys/program.json target/deploy/tminus-keypair.json
solana config set --url "$RPC" --keypair "$WALLET"
anchor program deploy --provider.cluster mainnet --provider.wallet "$WALLET" --program-name tminus --program-keypair target/deploy/tminus-keypair.json
solana program show "$PROGRAM_ID" --url "$RPC"
echo MAINNET_DEPLOY_DONE
