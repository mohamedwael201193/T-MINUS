/** Skip dummy/local DIRECT_URL values such as postgres://...@127.0.0.1:1 */
export function usableDirectUrl(raw = process.env.DIRECT_URL): string | undefined {
  if (!raw) return undefined;
  try {
    const u = new URL(raw);
    if (!u.hostname || u.hostname === "127.0.0.1" || u.hostname === "localhost") return undefined;
    if (u.port === "1") return undefined;
    return raw;
  } catch {
    return undefined;
  }
}

const RENDER_ENV_VARS =
  "https://api.render.com/v1/services/srv-dao6t2rtqb8s73e52mbg/env-vars";

export async function loadRenderDbUrls(): Promise<
  { databaseUrl: string; directUrl: string } | undefined
> {
  const localDirect = usableDirectUrl();
  const localDb = usableDirectUrl(process.env.DATABASE_URL);
  if (localDirect && localDb) return { databaseUrl: localDb, directUrl: localDirect };
  const token = process.env.RENDER_API_KEY;
  if (!token) return undefined;
  const res = await fetch(RENDER_ENV_VARS, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  });
  if (!res.ok) return undefined;
  const items = (await res.json()) as Array<{ envVar?: { key?: string; value?: string } }>;
  const pick = (key: string) => items.find((row) => row.envVar?.key === key)?.envVar?.value;
  const databaseUrl = usableDirectUrl(pick("DATABASE_URL"));
  const directUrl = usableDirectUrl(pick("DIRECT_URL"));
  if (!databaseUrl || !directUrl) return undefined;
  return { databaseUrl, directUrl };
}
