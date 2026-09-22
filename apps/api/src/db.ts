import postgres from "postgres";
import { env } from "./config.ts";

export function createSql(url: string) {
  return postgres(url, {
    prepare: false,
    max: 5,
    idle_timeout: 20,
    connect_timeout: process.env.CI === "true" ? 2 : 30,
    onnotice: () => {},
  });
}

export const sql = createSql(env.databaseUrl);
