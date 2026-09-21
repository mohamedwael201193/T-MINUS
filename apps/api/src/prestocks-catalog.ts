import { parseEventType, parsePageDeadlineIso, type MetricsToken } from "./feed-parse.ts";
import {
  parseIssuerInstruction,
  resolveDestination,
  type ActionType,
} from "./issuer-instruction.ts";
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
const KNOWN_ISSUER_PAGES = ["spacex", "xai", "openai", "anthropic"] as const;
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
  destinationAllowsAny: boolean;
  statedRatio: number | null;
  actionType: ActionType;
  issuerStatement: string | null;
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
  sourceHash: string | null;
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

export function issuerSlugsFromTokens(tokens: PrestocksToken[]): string[] {
  const slugs = new Set<string>(KNOWN_ISSUER_PAGES);
  for (const token of tokens) {
    if (token.symbol) slugs.add(assetIdFromSymbol(token.symbol));
  }
  return [...slugs].filter(Boolean).slice(0, 16);
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

  const [catalogRes, metricsRes] = await Promise.all([
    fetchText(PRESTOCKS_API),
    fetchText(PRESTOCKS_METRICS),
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

  const slugs = issuerSlugsFromTokens(tokens);
  const pages = await Promise.all(slugs.map((slug) => fetchText(`https://prestocks.com/${slug}`)));
  const pageBySlug: Record<string, string> = {};
  const pageOk = new Set<string>();
  slugs.forEach((slug, i) => {
    pageBySlug[slug] = pages[i]?.text ?? "";
    if (pages[i]?.ok) pageOk.add(slug);
  });

  const assets: CatalogAsset[] = [];
  const fetchedAt = now.toISOString();

  for (const token of tokens) {
    const mint = mintOf(token);
    const symbol = token.symbol;
    if (!mint || !symbol || !isPrestocksMint(mint)) continue;
    const id = assetIdFromSymbol(symbol);
    const slug = id;
    const issuerPage = pageBySlug[slug] ?? "";
    const issuerPageUrl = pageOk.has(slug)
      ? `https://prestocks.com/${slug}`
      : `https://prestocks.com/products`;
    const pageDeadline = issuerPage ? parsePageDeadlineIso(issuerPage) : null;
    const pageEvent = issuerPage ? parseEventType(issuerPage) : null;
    const instruction = issuerPage ? parseIssuerInstruction(issuerPage) : null;
    const metrics = pickMetrics(metricsJson, mint, symbol);
    const isSpacex = mint === SPACEX_MINT || symbol === "SPACEX";
    const feed = isSpacex ? opts.spacexFeed : null;
    const deadline = feed?.deadline ?? instruction?.deadlineIso ?? pageDeadline;
    const eventType = feed?.event_type ?? pageEvent;
    const stage = classifyStage({ deadline, eventType, now });
    const resolved = resolveDestination(instruction?.destinationTicker);
    const destinationMint = resolved?.mint ?? (isSpacex ? (feed?.destination ?? SPCXX_MINT) : null);
    const destinationSymbol = resolved?.symbol ?? (isSpacex ? "SPCXx" : null);
    const hasQuote = isSpacex && feed?.ratio != null;
    const executionAvailability = classifyExecution(stage, Boolean(hasQuote));
    let verificationState: VerificationState = "unknown";
    if (isSpacex && feed) verificationState = feed.verification_state;
    else if (deadline && issuerPage) verificationState = "verified";
    else if (metrics) verificationState = "unverified";

    let stageNote = "No issuer conversion deadline extracted from the current page.";
    if (stage === "CONVERSION_WINDOW" && deadline) {
      stageNote = instruction?.statement ?? `Issuer conversion window is open until ${deadline}.`;
    } else if (stage === "EXPIRED" && deadline) {
      stageNote = instruction?.statement ?? `Issuer conversion deadline ${deadline} has passed. Execution is halted.`;
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
      destinationName:
        destinationSymbol === "SPCXx"
          ? "SpaceX xStocks token (issuer-named destination, not a PreStock)"
          : destinationSymbol,
      destinationAllowsAny: Boolean(instruction?.destinationAllowsAny),
      statedRatio: instruction?.statedRatio ?? null,
      actionType: instruction?.actionType ?? "NONE",
      issuerStatement: instruction?.statement ?? null,
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
      sourceHash: isSpacex ? (feed?.source_hash ?? null) : null,
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
