import { parseEventType, parsePageDeadlineIso, type MetricsToken } from "./feed-parse.ts";
import {
  assetIdFromSymbol,
  classifyExecution,
  classifyStage,
  isPrestocksMint,
  type CatalogStage,
  type ExecutionAvailability,
  type VerificationState,
} from "./lifecycle-classify.ts";
import type { FeedRecord } from "./feed.ts";

const PRESTOCKS_API = "https://prestocks.com/api/prestocks";
const PRESTOCKS_METRICS = "https://prestocks.com/api/metrics";
const ISSUER_PAGES = ["spacex", "xai", "openai", "anthropic"] as const;
const CACHE_MS = 120_000;

const SPCXX_MINT = "Xs3oZwbHvqis4NYcf4YKWmEia2eC84wSiVrcYcTqpH8";
const SPACEX_MINT = "PreANxuXjsy2pvisWWMNB6YaJNzr7681wJJr2rHsfTh";

export type CatalogAsset = {
  id: string;
  symbol: string;
  name: string;
  mint: string;
  destinationMint: string | null;
  destinationSymbol: string | null;
  destinationName: string | null;
  tokenPrice: number | null;
  markPrice: number | null;
  holders: number | null;
  stage: CatalogStage;
  stageNote: string;
  deadline: string | null;
  eventType: string | null;
  transferFeeBps: number | null;
  verificationState: VerificationState;
  executionAvailability: ExecutionAvailability;
  sourceUrl: string;
  issuerPageUrl: string | null;
  fetchedAt: string;
  inOfficialCatalog: boolean;
};

export type PrestocksCatalog = {
  network: "MAINNET";
  eligibility: "prestocks_mints_only";
  fetchedAt: string;
  assets: CatalogAsset[];
};

type CatalogCache = { at: number; body: PrestocksCatalog };
let cache: CatalogCache | null = null;

type PrestocksToken = {
  symbol?: string;
  name?: string;
  splMint?: string;
  contract_address?: string;
  tokenPrice?: number;
  markPrice?: number;
  holderCount?: number;
};

export function asTokenList(json: unknown): PrestocksToken[] {
  if (Array.isArray(json)) return json as PrestocksToken[];
  if (json && typeof json === "object" && Array.isArray((json as { tokens?: unknown }).tokens)) {
    return (json as { tokens: PrestocksToken[] }).tokens;
  }
  return [];
}

export function mintOf(token: PrestocksToken): string | undefined {
  return token.splMint ?? token.contract_address;
}

function pickMetrics(metrics: unknown, mint: string, symbol: string): MetricsToken | null {
  if (!metrics || typeof metrics !== "object") return null;
  const list = (metrics as { metrics?: MetricsToken[] }).metrics;
  if (!Array.isArray(list)) return null;
  return list.find((t) => t && (t.splMint === mint || t.symbol === symbol)) ?? null;
}

function transferFeeFromFeed(feed: FeedRecord | null): number | null {
  if (!feed) return null;
  const extensions = (feed.issuer_powers as { extensions?: unknown[] } | undefined)?.extensions;
  if (!Array.isArray(extensions)) return null;
  for (const ext of extensions) {
    if (!ext || typeof ext !== "object") continue;
    const rec = ext as { extension?: string; state?: { newerTransferFee?: { transferFeeBasisPoints?: number } } };
    const bps = rec.state?.newerTransferFee?.transferFeeBasisPoints;
    if (typeof bps === "number") return bps;
  }
  return null;
}

async function fetchText(url: string): Promise<{ ok: boolean; text: string; status: number }> {
  try {
    const res = await fetch(url, {
      headers: { accept: "text/html,application/json" },
      signal: AbortSignal.timeout(8_000),
    });
    return { ok: res.ok, text: await res.text(), status: res.status };
  } catch {
    return { ok: false, text: "", status: 0 };
  }
}

export async function buildPrestocksCatalog(opts: {
  spacexFeed: FeedRecord | null;
  now?: Date;
  force?: boolean;
}): Promise<PrestocksCatalog> {
  const now = opts.now ?? new Date();
  if (!opts.force && cache && now.getTime() - cache.at < CACHE_MS) {
    return cache.body;
  }

  const [catalogRes, metricsRes, ...pages] = await Promise.all([
    fetchText(PRESTOCKS_API),
    fetchText(PRESTOCKS_METRICS),
    ...ISSUER_PAGES.map((slug) => fetchText(`https://prestocks.com/${slug}`)),
  ]);

  const catalogJson = (() => {
    try {
      return catalogRes.ok ? JSON.parse(catalogRes.text) : [];
    } catch {
      return [];
    }
  })();
  const metricsJson = (() => {
    try {
      return metricsRes.ok ? (JSON.parse(metricsRes.text) as unknown) : { metrics: [] };
    } catch {
      return { metrics: [] };
    }
  })();

  const pageBySlug: Record<string, string> = {};
  ISSUER_PAGES.forEach((slug, i) => {
    pageBySlug[slug] = pages[i]?.text ?? "";
  });

  const tokens: PrestocksToken[] = asTokenList(catalogJson);
  const officialMints = new Set(tokens.map((t) => mintOf(t)).filter((m): m is string => Boolean(m)));
  const metricsList = Array.isArray((metricsJson as { metrics?: PrestocksToken[] }).metrics)
    ? ((metricsJson as { metrics: PrestocksToken[] }).metrics)
    : [];
  for (const m of metricsList) {
    if (!m?.splMint || !m.symbol) continue;
    if (!isPrestocksMint(m.splMint)) continue;
    if (tokens.some((t) => mintOf(t) === m.splMint)) continue;
    tokens.push({
      symbol: m.symbol,
      name: m.symbol,
      splMint: m.splMint,
      tokenPrice: m.tokenPrice,
      holderCount: (m as { holderCount?: number }).holderCount,
    });
  }

  const assets: CatalogAsset[] = [];
  const fetchedAt = now.toISOString();

  for (const token of tokens) {
    const mint = mintOf(token);
    const symbol = token.symbol;
    if (!mint || !symbol || !isPrestocksMint(mint)) continue;
    const id = assetIdFromSymbol(symbol);
    const slug = id;
    const issuerPage = pageBySlug[slug] ?? "";
    const issuerPageUrl = ISSUER_PAGES.includes(slug as (typeof ISSUER_PAGES)[number])
      ? `https://prestocks.com/${slug}`
      : `https://prestocks.com/products`;
    const pageDeadline = issuerPage ? parsePageDeadlineIso(issuerPage) : null;
    const pageEvent = issuerPage ? parseEventType(issuerPage) : null;
    const metrics = pickMetrics(metricsJson, mint, symbol);
    const isSpacex = mint === SPACEX_MINT || symbol === "SPACEX";
    const feed = isSpacex ? opts.spacexFeed : null;
    const deadline = feed?.deadline ?? pageDeadline;
    const eventType = feed?.event_type ?? pageEvent;
    const stage = classifyStage({ deadline, eventType, now });
    const destinationMint = isSpacex ? (feed?.destination ?? SPCXX_MINT) : symbol === "XAI" ? SPACEX_MINT : null;
    const destinationSymbol = isSpacex ? "SPCXx" : symbol === "XAI" ? "SPACEX" : null;
    const hasQuote = isSpacex && feed?.ratio != null;
    const executionAvailability = classifyExecution(stage, Boolean(hasQuote));
    let verificationState: VerificationState = "unknown";
    if (isSpacex && feed) verificationState = feed.verification_state;
    else if (deadline && issuerPage) verificationState = "verified";
    else if (metrics) verificationState = "unverified";

    let stageNote = "No issuer conversion deadline extracted from the current page.";
    if (stage === "CONVERSION_WINDOW" && deadline) {
      stageNote = `Issuer conversion window is open until ${deadline}.`;
    } else if (stage === "EXPIRED" && deadline) {
      stageNote = `Issuer conversion deadline ${deadline} has passed. Execution is halted.`;
    } else if (stage === "TERMS_PENDING") {
      stageNote = "Pre-IPO — conversion window opens when the issuer publishes terms.";
    }

    assets.push({
      id,
      symbol,
      name: token.name ?? `${symbol} PreStock`,
      mint,
      destinationMint,
      destinationSymbol,
      destinationName: destinationSymbol === "SPCXx" ? "SpaceX equity token" : destinationSymbol,
      tokenPrice: token.tokenPrice ?? metrics?.tokenPrice ?? (feed?.ratio != null ? Number(feed.ratio) : null),
      markPrice: token.markPrice ?? null,
      holders: token.holderCount ?? metrics?.holderCount ?? null,
      stage,
      stageNote,
      deadline,
      eventType,
      transferFeeBps: isSpacex ? transferFeeFromFeed(feed) : null,
      verificationState,
      executionAvailability,
      sourceUrl: isSpacex ? (feed?.source_url ?? PRESTOCKS_METRICS) : PRESTOCKS_API,
      issuerPageUrl,
      fetchedAt: feed?.fetched_at ?? fetchedAt,
      inOfficialCatalog: officialMints.has(mint),
    });
  }

  assets.sort((a, b) => {
    const rank = (s: CatalogStage) =>
      s === "CONVERSION_WINDOW" ? 0 : s === "EXPIRED" ? 1 : s === "TERMS_PENDING" ? 2 : 3;
    const d = rank(a.stage) - rank(b.stage);
    if (d !== 0) return d;
    return a.symbol.localeCompare(b.symbol);
  });

  const body: PrestocksCatalog = {
    network: "MAINNET",
    eligibility: "prestocks_mints_only",
    fetchedAt,
    assets,
  };
  cache = { at: now.getTime(), body };
  return body;
}
