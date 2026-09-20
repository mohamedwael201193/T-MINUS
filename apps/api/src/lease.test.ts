import test from "node:test";
import assert from "node:assert/strict";
import postgres from "postgres";
import { config } from "dotenv";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
config({ path: resolve(root, ".env") });

test("concurrent lease: only one worker wins", { skip: process.env.TMINUS_DB_TEST !== "1" }, async () => {
  const url = process.env.DIRECT_URL!;
  const a = postgres(url, { prepare: false, max: 2 });
  const b = postgres(url, { prepare: false, max: 2 });
  const pda = `lease-test-${Date.now()}`;
  try {
    const until = new Date(Date.now() + 30_000);
    const [r1, r2] = await Promise.all([
      a`insert into keeper_leases (order_pda, filled_raw, leased_until, worker_id)
        values (${pda}, ${"0"}, ${until}, ${"w1"})
        on conflict (order_pda) do update set worker_id = excluded.worker_id
        where keeper_leases.leased_until < now()
        returning order_pda`,
      b`insert into keeper_leases (order_pda, filled_raw, leased_until, worker_id)
        values (${pda}, ${"0"}, ${until}, ${"w2"})
        on conflict (order_pda) do update set worker_id = excluded.worker_id
        where keeper_leases.leased_until < now()
        returning order_pda`,
    ]);
    const wins = (r1.length > 0 ? 1 : 0) + (r2.length > 0 ? 1 : 0);
    assert.equal(wins, 1);
  } finally {
    await a`delete from keeper_leases where order_pda = ${pda}`;
    await a.end();
    await b.end();
  }
});
