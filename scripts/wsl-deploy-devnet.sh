#!/usr/bin/env bash
set -euo pipefail
export PATH="$HOME/.local/share/solana/install/active_release/bin:$HOME/.cargo/bin:$PATH"
cd /mnt/d/route/sol/T-MINUS
WALLET="${ANCHOR_WALLET:-/mnt/c/Users/LOQ/.tminus/keys/user-fund.json}"
if [ ! -f "$WALLET" ]; then
  WALLET="/mnt/c/Users/LOQ/.tminus/keys/deploy.json"
fi
PUB=$(solana-keygen pubkey "$WALLET")
echo "deploy_pubkey=$PUB"
solana balance "$PUB" --url https://api.devnet.solana.com
LAMPORTS=$(solana balance "$PUB" --url https://api.devnet.solana.com --lamports | awk '{print $1}')
if [ "${LAMPORTS:-0}" -lt 2000000000 ]; then
  echo INSUFFICIENT_DEVNET_SOL
  solana airdrop 1 "$PUB" --url https://api.devnet.solana.com || true
  solana balance "$PUB" --url https://api.devnet.solana.com
  exit 2
fi
mkdir -p target/deploy
cp /mnt/c/Users/LOQ/.tminus/keys/program.json target/deploy/tminus-keypair.json
solana config set --url https://api.devnet.solana.com --keypair "$WALLET"
anchor build
set +e
anchor program deploy --provider.cluster devnet --provider.wallet "$WALLET" --program-name tminus --program-keypair target/deploy/tminus-keypair.json
DEPLOY_RC=$?
set -e
LINUX_WALLET="$HOME/.tminus/user-fund.json"
mkdir -p "$HOME/.tminus"
cp "$WALLET" "$LINUX_WALLET"
chmod 600 "$LINUX_WALLET"
anchor idl init HRLmVcuk6PRcVwB3UVpcbEC3LVVMhdLZfPvHtmL2PUdL --filepath idl/tminus.json --provider.cluster devnet --provider.wallet "$LINUX_WALLET" || true
solana program show HRLmVcuk6PRcVwB3UVpcbEC3LVVMhdLZfPvHtmL2PUdL --url https://api.devnet.solana.com
if [ "$DEPLOY_RC" -ne 0 ]; then
  echo "deploy_cli_nonzero but program may already be live"
fi
echo DEVNET_DEPLOY_DONE
