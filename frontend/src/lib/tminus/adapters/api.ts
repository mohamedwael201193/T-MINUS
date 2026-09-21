export const TMINUS_API =
  process.env.NEXT_PUBLIC_TMINUS_API ?? "https://tminus-api-k2d2.onrender.com";

export const PROGRAM_ID = "HRLmVcuk6PRcVwB3UVpcbEC3LVVMhdLZfPvHtmL2PUdL";

export async function apiGet<T>(path: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(`${TMINUS_API}${path}`, {
    cache: "no-store",
    headers: { accept: "application/json" },
    signal,
  });
  if (!res.ok) {
    throw new Error(`${path} HTTP ${res.status}`);
  }
  return (await res.json()) as T;
}

export type FeedResponse = {
  network: string;
  feed: {
    token: string;
    destination: string;
    ratio: string | null;
    deadline: string | null;
    event_type: string;
    lockup: string | null;
    source_url: string;
    source_hash: string;
    fetched_at: string;
    verification_state: "verified" | "unverified" | "stale";
    issuer_powers?: Record<string, unknown>;
  };
};

export type PrestocksCatalogResponse = {
  network: "MAINNET";
  eligibility: string;
  fetchedAt: string;
  assets: Array<{
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
    stage: "CONVERSION_WINDOW" | "TERMS_PENDING" | "EXPIRED" | "CONVERTED";
    stageNote: string;
    deadline: string | null;
    transferFeeBps: number | null;
    verificationState: "verified" | "stale" | "unknown" | "unverified";
    executionAvailability: "AVAILABLE" | "LIMITED" | "HALTED" | "UNKNOWN";
    sourceUrl: string;
    issuerPageUrl: string | null;
    fetchedAt: string;
  }>;
};

export type ProgramResponse = {
  programId: string;
  keeperSendEnabled: boolean;
  clusters: {
    mainnet: { exists: boolean; executable: boolean; explorer: string };
    devnet: { exists: boolean; executable: boolean; explorer: string };
  };
};

export type QuoteResponse = {
  network: string;
  source: string;
  quote: { inAmount?: string; outAmount?: string };
};

export type ReceiptRow = {
  order_pda: string;
  sig: string;
  slot: string | number;
  created_at: string;
  payload: {
    sig?: string;
    kind?: string;
    slot?: number;
    ratio?: string;
    route?: { composition?: string } | string;
    network?: string;
    explorer?: string;
    feedHash?: string | null;
    orderPda?: string;
    programId?: string;
    timestamp?: string;
    failsafeFlag?: boolean;
    sourceAmount?: string;
    destinationAmount?: string;
  };
};

export type BalancesResponse = {
  network: "MAINNET";
  owner: string;
  sol: number;
  SPACEX: { displayUnits: number; raw: string };
  SPCXx: { uiAmount: number | null };
  USDC: number;
};
