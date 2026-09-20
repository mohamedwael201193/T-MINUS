import { Connection, PublicKey } from "@solana/web3.js";
import {
  decodeOrder,
  ORDER_STATUS_OFFSET,
  STATUS_OPEN,
  type DecodedOrder,
} from "@tminus/sdk";
import { env } from "./config.ts";

export type OpenOrder = {
  pda: PublicKey;
  order: DecodedOrder;
};

export async function loadOpenOrders(connection: Connection): Promise<OpenOrder[]> {
  const accounts = await connection.getProgramAccounts(new PublicKey(env.programId), {
    filters: [{ memcmp: { offset: ORDER_STATUS_OFFSET, bytes: Buffer.from([0]).toString("base64"), encoding: "base64" } }],
  });
  const open: OpenOrder[] = [];
  for (const acc of accounts) {
    try {
      const order = decodeOrder(Buffer.from(acc.account.data));
      if (order.status !== STATUS_OPEN) continue;
      open.push({ pda: acc.pubkey, order });
    } catch {
      continue;
    }
  }
  return open;
}
