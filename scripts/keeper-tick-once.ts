import { Connection } from "@solana/web3.js";
import { env } from "../apps/keeper/src/config.ts";
import { tick, state } from "../apps/keeper/src/loop.ts";
import { log } from "../apps/keeper/src/log.ts";

async function main() {
  const connection = new Connection(env.solanaRpc, "confirmed");
  log("tick_once_start", {
    network: env.solanaNetwork,
    rpc: env.solanaRpc.includes("devnet") ? "devnet" : "other",
    send_enabled: env.sendEnabled,
    inventory_without_quote: env.inventoryWithoutQuote,
    program: env.programId,
    src: env.spacexMint,
    dst: env.spcxxMint,
  });
  await tick(connection);
  console.log(
    JSON.stringify({
      label: "KEEPER_TICK_ONCE",
      halted: state.halted,
      haltReason: state.haltReason,
      lastFillSig: state.lastFillSig,
      lastRpcError: state.lastRpcError,
      lastJupiterError: state.lastJupiterError,
      composition: state.composition,
      sendEnabled: env.sendEnabled,
    })
  );
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
