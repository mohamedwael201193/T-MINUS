import { sql } from "./db.ts";
import { env } from "./config.ts";

export async function tryLease(orderPda: string, filledRaw: string): Promise<boolean> {
  const until = new Date(Date.now() + 60_000);
  const rows = await sql<{ order_pda: string }[]>`
    insert into keeper_leases (order_pda, filled_raw, leased_until, worker_id)
    values (${orderPda}, ${filledRaw}, ${until}, ${env.workerId})
    on conflict (order_pda) do update
      set filled_raw = excluded.filled_raw,
          leased_until = excluded.leased_until,
          worker_id = excluded.worker_id
      where keeper_leases.leased_until < now()
         or (keeper_leases.worker_id = ${env.workerId} and keeper_leases.filled_raw = ${filledRaw})
    returning order_pda
  `;
  return rows.length === 1;
}

export async function releaseLease(orderPda: string): Promise<void> {
  await sql`delete from keeper_leases where order_pda = ${orderPda} and worker_id = ${env.workerId}`;
}
