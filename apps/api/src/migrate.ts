import { createSql } from "./db.ts";
import { env } from "./config.ts";

const schema = `
create table if not exists feed_snapshots (
  id bigserial primary key,
  token_symbol text not null,
  payload jsonb not null,
  source_url text not null,
  source_sha256 text not null,
  fetched_at timestamptz not null,
  verification_state text not null
);
create index if not exists feed_snapshots_fetched_at_idx on feed_snapshots (fetched_at desc);

create table if not exists receipts (
  id bigserial primary key,
  order_pda text not null,
  sig text not null unique,
  slot bigint not null,
  payload jsonb not null,
  created_at timestamptz not null default now()
);
create index if not exists receipts_order_pda_idx on receipts (order_pda);

create table if not exists keeper_leases (
  order_pda text primary key,
  filled_raw text not null,
  leased_until timestamptz not null,
  worker_id text not null
);

create table if not exists keeper_health (
  id int primary key default 1 check (id = 1),
  payload jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists operational_history (
  id bigserial primary key,
  kind text not null,
  payload jsonb not null,
  created_at timestamptz not null default now()
);
`;

export async function migrate(): Promise<void> {
  const sql = createSql(env.directUrl);
  try {
    await sql.unsafe(schema);
  } finally {
    await sql.end();
  }
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith("migrate.ts")) {
  migrate()
    .then(() => {
      console.log("migrate_ok");
    })
    .catch((err: unknown) => {
      console.error("migrate_fail");
      console.error(err instanceof Error ? err.message : "unknown");
      process.exit(1);
    });
}
