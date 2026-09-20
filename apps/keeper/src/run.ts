import { Connection } from "@solana/web3.js";
import { env, keeperKeypair } from "./config.ts";
import { log } from "./log.ts";
import { tick } from "./loop.ts";

export function startKeeper(): void {
  const connection = new Connection(env.solanaRpc, "confirmed");
  log("keeper_start", {
    pubkey: keeperKeypair.publicKey.toBase58(),
    network: env.solanaNetwork,
    send_enabled: env.sendEnabled,
    poll_ms: env.pollMs,
    embedded: process.env.KEEPER_EMBEDDED === "true",
  });

  async function run(): Promise<void> {
    await tick(connection);
  }

  void run();
  setInterval(() => {
    void run();
  }, env.pollMs);
}
