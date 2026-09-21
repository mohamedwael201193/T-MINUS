#!/usr/bin/env bash
set -euo pipefail
export PATH="$HOME/.local/node/bin:$HOME/.local/share/solana/install/active_release/bin:$HOME/.cargo/bin:/usr/bin:/bin"
cd /mnt/d/route/sol/T-MINUS
solana program dump HRLmVcuk6PRcVwB3UVpcbEC3LVVMhdLZfPvHtmL2PUdL /tmp/tminus-devnet.so --url https://api.devnet.solana.com
node -e '
const fs = require("fs");
const crypto = require("crypto");
const onchain = fs.readFileSync("/tmp/tminus-devnet.so");
const out = {
  label: "DEVNET_PROGRAM_BYTES",
  programId: "HRLmVcuk6PRcVwB3UVpcbEC3LVVMhdLZfPvHtmL2PUdL",
  onchainBytes: onchain.length,
  onchainSha256: crypto.createHash("sha256").update(onchain).digest("hex"),
};
if (fs.existsSync("target/deploy/tminus.so")) {
  const local = fs.readFileSync("target/deploy/tminus.so");
  out.localBytes = local.length;
  out.localSha256 = crypto.createHash("sha256").update(local).digest("hex");
  out.exactMatch = Buffer.compare(local, onchain) === 0;
} else {
  out.localBytes = null;
  out.exactMatch = false;
}
fs.writeFileSync("evidence/devnet-program-bytes.json", JSON.stringify(out, null, 2) + "\n");
console.log(JSON.stringify(out, null, 2));
'
echo DUMP_DONE
