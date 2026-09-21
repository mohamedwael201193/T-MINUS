import { parsePageDeadlineIso, stripHtml } from "./feed-parse.ts";

export type ActionType = "GOING_PUBLIC" | "ACQUISITION" | "EXPIRY" | "NONE";

export type DestinationKind = "prestock" | "xstocks_public";

export type KnownDestination = {
  mint: string;
  symbol: string;
  displayRaw: number;
  decimals: number;
  catalogMember: boolean;
  kind: DestinationKind;
};

/** Issuer-named destinations we can resolve to a mint. Not an oracle. */
export const KNOWN_TICKER_MINTS: Record<string, KnownDestination> = {
  SPCXX: {
    mint: "Xs3oZwbHvqis4NYcf4YKWmEia2eC84wSiVrcYcTqpH8",
    symbol: "SPCXx",
    displayRaw: 100_000_000,
    decimals: 8,
    catalogMember: false,
    kind: "xstocks_public",
  },
  SPACEX: {
    mint: "PreANxuXjsy2pvisWWMNB6YaJNzr7681wJJr2rHsfTh",
    symbol: "SPACEX",
    displayRaw: 200_000_000,
    decimals: 9,
    catalogMember: true,
    kind: "prestock",
  },
};

export type IssuerInstruction = {
  actionType: ActionType;
  statement: string | null;
  deadlineIso: string | null;
  deadlineText: string | null;
  destinationTicker: string | null;
  destinationAllowsAny: boolean;
  statedRatio: number | null;
  expireWorthless: boolean;
  gonePublic: boolean;
  acquired: boolean;
};

const DEADLINE_TEXT_RE =
  /before\s+(\d{1,2}):(\d{2})\s*([ap]m)\s*UTC\s+on\s+(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/i;
const RATIO_SWAP_RE = /swapped into\s+(\d+(?:\.\d+)?)\s+\$?([A-Za-z][A-Za-z0-9]*)/i;
const TICKER_SWAP_RE = /swapped into\s+\$?([A-Za-z][A-Za-z0-9]*)/i;

export function emptyIssuerInstruction(): IssuerInstruction {
  return {
    actionType: "NONE",
    statement: null,
    deadlineIso: null,
    deadlineText: null,
    destinationTicker: null,
    destinationAllowsAny: false,
    statedRatio: null,
    expireWorthless: false,
    gonePublic: false,
    acquired: false,
  };
}

export function normalizeTicker(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const t = raw.replace(/^\$/, "").trim().toUpperCase();
  return t.length ? t : null;
}

export function resolveDestination(ticker: string | null | undefined): KnownDestination | null {
  const key = normalizeTicker(ticker);
  if (!key) return null;
  return KNOWN_TICKER_MINTS[key] ?? null;
}

export function displayRawForMint(mint: string): number | null {
  for (const row of Object.values(KNOWN_TICKER_MINTS)) {
    if (row.mint === mint) return row.displayRaw;
  }
  return null;
}

function classifyAction(opts: {
  gonePublic: boolean;
  acquired: boolean;
  expireWorthless: boolean;
  hasSwap: boolean;
}): ActionType {
  if (opts.gonePublic && (opts.expireWorthless || opts.hasSwap)) return "GOING_PUBLIC";
  if (opts.acquired && (opts.expireWorthless || opts.hasSwap)) return "ACQUISITION";
  if (opts.expireWorthless) return "EXPIRY";
  return "NONE";
}

function extractStatement(text: string): string | null {
  const cleaned = stripHtml(text).replace(/(\d+)\.\s+(\d+)/g, "$1.$2");
  const sentences = cleaned.split(/(?<=[.!?])\s+/);
  const clip = (s: string, re: RegExp) => {
    const m = s.match(re);
    return m ? s.slice(s.search(re)).replace(/\s+/g, " ").trim() : s.replace(/\s+/g, " ").trim();
  };
  const goneRaw = sentences.find((s) => /has gone public/i.test(s));
  const acquiredRaw = sentences.find((s) => /was acquired by/i.test(s));
  const swapRaw = sentences.find((s) => /swapped into/i.test(s) && /expire worthless/i.test(s))
    ?? sentences.find((s) => /swapped into/i.test(s));
  const gone = goneRaw ? clip(goneRaw, /[A-Za-z0-9]+ has gone public/i) : null;
  const acquired = acquiredRaw ? clip(acquiredRaw, /[A-Za-z0-9]+ was acquired by/i) : null;
  const swap = swapRaw
    ? clip(swapRaw, /(?:Each [A-Z]+ token must be swapped into|[A-Za-z0-9 ]+tokens must be swapped into)/i)
    : null;
  const unique = [...new Set([gone, acquired, swap].filter((p): p is string => Boolean(p)))];
  if (unique.length) return unique.join(" ");
  const expire = sentences.find((s) => /expire worthless/i.test(s));
  return expire ? expire.replace(/\s+/g, " ").trim() : null;
}

export function parseIssuerInstruction(htmlOrText: string): IssuerInstruction {
  const text = stripHtml(htmlOrText).replace(/(\d+)\.\s+(\d+)/g, "$1.$2");
  const deadlineIso = parsePageDeadlineIso(text);
  const deadlineMatch = text.match(DEADLINE_TEXT_RE);
  const expireWorthless = /expire worthless/i.test(text);
  const gonePublic = /gone public/i.test(text);
  const acquired = /acquired by/i.test(text);
  const ratioMatch = text.match(RATIO_SWAP_RE);
  const tickerMatch = ratioMatch ? null : text.match(TICKER_SWAP_RE);
  const destinationTicker = normalizeTicker(ratioMatch?.[2] ?? tickerMatch?.[1] ?? null);
  const statedRatio = ratioMatch ? Number(ratioMatch[1]) : null;
  const hasSwap = Boolean(destinationTicker);
  return {
    actionType: classifyAction({ gonePublic, acquired, expireWorthless, hasSwap }),
    statement: extractStatement(text),
    deadlineIso,
    deadlineText: deadlineMatch ? deadlineMatch[0] : null,
    destinationTicker,
    destinationAllowsAny: /or any other token/i.test(text),
    statedRatio: Number.isFinite(statedRatio) ? statedRatio : null,
    expireWorthless,
    gonePublic,
    acquired,
  };
}
