#!/usr/bin/env bash
set -euo pipefail
export PATH="$HOME/.local/node/bin:$HOME/.local/share/solana/install/active_release/bin:$HOME/.cargo/bin:/usr/bin:/bin"
cd /mnt/d/route/sol/T-MINUS
anchor idl fetch HRLmVcuk6PRcVwB3UVpcbEC3LVVMhdLZfPvHtmL2PUdL --provider.cluster devnet --out /tmp/tminus-idl-devnet.json
wc -c /tmp/tminus-idl-devnet.json
cp /tmp/tminus-idl-devnet.json /mnt/d/route/sol/T-MINUS/evidence/devnet-idl.json
echo IDL_FETCH_DONE
