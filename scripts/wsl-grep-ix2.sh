#!/usr/bin/env bash
set -euo pipefail
f=/home/devmo/.cargo/registry/src/index.crates.io-1949cf8c6b5b557f/spl-token-2022-interface-2.1.0/src/instruction.rs
grep -n "TransferFeeExtension\|fn pack\|enum TokenInstruction" "$f" | head -60
echo "==== pack impl ===="
# show TokenInstruction pack for TransferFeeExtension
python3 - <<'PY'
from pathlib import Path
p=Path("/home/devmo/.cargo/registry/src/index.crates.io-1949cf8c6b5b557f/spl-token-2022-interface-2.1.0/src/instruction.rs")
text=p.read_text()
# extract enum variants in order until TransferFeeExtension
start=text.find("pub enum TokenInstruction")
print(text[start:start+3500])
PY
echo "==== harvest_withheld fn ===="
sed -n '370,395p' /home/devmo/.cargo/registry/src/index.crates.io-1949cf8c6b5b557f/spl-token-2022-interface-2.1.0/src/extension/transfer_fee/instruction.rs
echo "==== extension type ===="
grep -n "TransferFeeConfig =" /home/devmo/.cargo/registry/src/index.crates.io-1949cf8c6b5b557f/spl-token-2022-interface-2.1.0/src/extension/mod.rs | head
