#!/usr/bin/env bash
set -euo pipefail
export PATH="$HOME/.local/share/solana/install/active_release/bin:$HOME/.cargo/bin:$PATH"
cd /mnt/d/route/sol/T-MINUS
WALLET="${ANCHOR_WALLET:-/mnt/c/Users/LOQ/.tminus/keys/deploy.json}"
PUB=$(solana-keygen pubkey "$WALLET")
echo "deploy_pubkey=$PUB"
solana balance "$PUB" --url https://api.devnet.solana.com
LAMPORTS=$(solana balance "$PUB" --url https://api.devnet.solana.com --lamports | awk '{print $1}')
if [ "${LAMPORTS:-0}" -lt 500000000 ]; then
  echo INSUFFICIENT_DEVNET_SOL
  solana airdrop 1 "$PUB" --url https://api.devnet.solana.com || true
  solana balance "$PUB" --url https://api.devnet.solana.com
  exit 2
fi
solana config set --url https://api.devnet.solana.com --keypair "$WALLET"
anchor deploy --provider.cluster devnet --provider.wallet "$WALLET"
solana program show HRLmVcuk6PRcVwB3UVpcbEC3LVVMhdLZfPvHtmL2PUdL --url https://api.devnet.solana.com
echo DEVNET_DEPLOY_DONE
