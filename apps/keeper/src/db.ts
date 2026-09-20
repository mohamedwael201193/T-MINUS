import postgres from "postgres";
import { env } from "./config.ts";

export const sql = postgres(env.databaseUrl, {
  prepare: false,
  max: 4,
  idle_timeout: 20,
  connect_timeout: 30,
  onnotice: () => {},
});
