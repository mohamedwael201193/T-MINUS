import { sql } from "./db.ts";

export type Receipt = {
  orderPda: string;
  sig: string;
  slot: number;
  sourceAmount: string;
  destinationAmount: string;
  ratio: string;
  failsafeFlag: boolean;
  route: unknown;
  feedHash: string;
  timestamp: string;
  network: "MAINNET" | "DEVNET" | "SIMULATION";
};

export async function persistReceipt(receipt: Receipt): Promise<void> {
  await sql`
    insert into receipts (order_pda, sig, slot, payload)
    values (${receipt.orderPda}, ${receipt.sig}, ${receipt.slot}, ${sql.json(receipt as never)})
    on conflict (sig) do nothing
  `;
}
