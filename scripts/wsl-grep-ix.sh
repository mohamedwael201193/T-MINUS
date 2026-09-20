#!/usr/bin/env bash
set -euo pipefail
f=$(find /home/devmo/.cargo/registry/src -name instruction.rs | grep spl-token-2022-interface | head -1)
echo "FILE $f"
grep -n "TransferFee\|HarvestWithheld\|enum TokenInstruction" "$f" | head -80
echo "---"
g=$(find /home/devmo/.cargo/registry/src -path "*spl-token-2022-interface*" -name "transfer_fee.rs" | head -5)
echo "TF $g"
