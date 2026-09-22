import test from "node:test";
import assert from "node:assert/strict";
import { explorerAddress, rpcForCluster, declaredProgramId } from "./program-status.ts";

test("devnet explorer URLs stay labeled", () => {
  assert.equal(
    explorerAddress("devnet", "HRLmVcuk6PRcVwB3UVpcbEC3LVVMhdLZfPvHtmL2PUdL"),
    "https://explorer.solana.com/address/HRLmVcuk6PRcVwB3UVpcbEC3LVVMhdLZfPvHtmL2PUdL?cluster=devnet"
  );
  assert.equal(
    explorerAddress("mainnet-beta", "HRLmVcuk6PRcVwB3UVpcbEC3LVVMhdLZfPvHtmL2PUdL"),
    "https://explorer.solana.com/address/HRLmVcuk6PRcVwB3UVpcbEC3LVVMhdLZfPvHtmL2PUdL"
  );
});

test("devnet RPC does not silently reuse mainnet", () => {
  assert.equal(
    rpcForCluster("devnet", "https://api.mainnet-beta.solana.com"),
    "https://api.devnet.solana.com"
  );
  assert.equal(
    rpcForCluster("mainnet-beta", "https://paid.example/mainnet"),
    "https://paid.example/mainnet"
  );
});

test("declared program id is the on-chain T-MINUS id", () => {
  assert.equal(declaredProgramId(), "HRLmVcuk6PRcVwB3UVpcbEC3LVVMhdLZfPvHtmL2PUdL");
});

test("unreachable RPC still returns labeled explorer and exists=false", async () => {
  const { readProgramStatus } = await import("./program-status.ts");
  const st = await readProgramStatus("http://127.0.0.1:1", declaredProgramId(), "devnet");
  assert.equal(st.exists, false);
  assert.equal(st.executable, false);
  assert.match(st.explorer, /cluster=devnet/);
});
