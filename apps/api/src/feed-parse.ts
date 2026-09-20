const MONTHS: Record<string, number> = {
  january: 0,
  february: 1,
  march: 2,
  april: 3,
  may: 4,
  june: 5,
  july: 6,
  august: 7,
  september: 8,
  october: 9,
  november: 10,
  december: 11,
};

const DEADLINE_RE =
  /before\s+(\d{1,2}):(\d{2})\s*([ap]m)\s*UTC\s+on\s+(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/i;

export function stripHtml(html: string): string {
  return html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
}

export function parsePageDeadlineIso(htmlOrText: string): string | null {
  const text = stripHtml(htmlOrText);
  const m = text.match(DEADLINE_RE);
  if (!m) return null;
  const hourRaw = Number(m[1]);
  const minute = Number(m[2]);
  const ampm = m[3].toLowerCase();
  const day = Number(m[4]);
  const month = MONTHS[m[5].toLowerCase()];
  const year = Number(m[6]);
  if (month === undefined || Number.isNaN(hourRaw) || Number.isNaN(day) || Number.isNaN(year)) {
    return null;
  }
  let hour = hourRaw % 12;
  if (ampm === "pm") hour += 12;
  const ms = Date.UTC(year, month, day, hour, minute, 0);
  if (Number.isNaN(ms)) return null;
  return new Date(ms).toISOString();
}

export function parseEventType(htmlOrText: string): string {
  const text = stripHtml(htmlOrText);
  if (/gone public/i.test(text) && /expire worthless/i.test(text)) {
    return "prestock_conversion_deadline";
  }
  if (/expire worthless/i.test(text)) return "prestock_expiry_warning";
  return "prestock_lifecycle";
}

export function parseLockup(htmlOrText: string): string | null {
  const text = stripHtml(htmlOrText);
  const m = text.match(/lock[- ]?up[^.]{0,80}/i);
  return m ? m[0].trim() : null;
}

export type MetricsToken = {
  symbol?: string;
  splMint?: string;
  tokenPrice?: number;
  holderCount?: number;
  marketCapUSD?: number;
  circulatingSupply?: number;
  totalSupply?: number;
};

export function pickMetricsToken(
  metrics: unknown,
  mint: string
): MetricsToken | null {
  if (!metrics || typeof metrics !== "object") return null;
  const list = (metrics as { metrics?: unknown }).metrics;
  if (!Array.isArray(list)) return null;
  return (
    (list as MetricsToken[]).find((t) => t && (t.splMint === mint || t.symbol === "SPACEX")) ??
    null
  );
}
