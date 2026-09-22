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

export async function apiPost<T>(path: string, body: unknown, signal?: AbortSignal): Promise<{ status: number; body: T }> {
  const res = await fetch(`${TMINUS_API}${path}`, {
    method: "POST",
    cache: "no-store",
    headers: { accept: "application/json", "content-type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
  const json = (await res.json().catch(() => ({}))) as T;
  return { status: res.status, body: json };
}

export async function apiGetMaybe<T>(
  path: string,
  signal?: AbortSignal,
): Promise<{ status: number; body: T | null }> {
  const res = await fetch(`${TMINUS_API}${path}`, {
    cache: "no-store",
    headers: { accept: "application/json" },
    signal,
  });
  if (!res.ok) {
    return { status: res.status, body: null };
  }
  return { status: res.status, body: (await res.json()) as T };
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
    destinationAllowsAny?: boolean;
    statedRatio?: number | null;
    actionType?: "GOING_PUBLIC" | "ACQUISITION" | "EXPIRY" | "NONE";
    issuerStatement?: string | null;
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
    inOfficialCatalog?: boolean;
    eventType?: string | null;
    sourceHash?: string | null;
  }>;
};

export type ProgramResponse = {
  programId: string;
  keeperSendEnabled: boolean;
  clusters: {
    mainnet: {
      exists: boolean;
      executable: boolean;
      explorer: string;
      dataLen?: number;
      owner?: string | null;
      lamports?: number;
    };
    devnet: {
      exists: boolean;
      executable: boolean;
      explorer: string;
      dataLen?: number;
      owner?: string | null;
      lamports?: number;
    };
  };
};

export type PdaResponse = {
  pda: string;
  bump: number;
  nonce: string;
  explorer?: string;
  cluster?: string;
  account: null | {
    exists: boolean;
    status: "open" | "closed" | "wrong_owner" | null;
    owner: string | null;
  };
};

export type ActionsListResponse = {
  network: "MAINNET";
  layer?: string;
  product?: string;
  actions: Array<{
    assetId: string;
    symbol: string;
    stage: "CONVERSION_WINDOW" | "TERMS_PENDING" | "EXPIRED" | "CONVERTED";
    actionType: "GOING_PUBLIC" | "ACQUISITION" | "EXPIRY" | "NONE";
    settlementKind: "TRADE" | "NONE";
    deadline: string | null;
    destinationVerified: boolean;
    destination: { symbol: string; mint: string } | null;
    issuer: {
      statement: string | null;
      statedRatio: number | null;
      destinationAllowsAny: boolean;
    };
    transferFeeBps: number | null;
    onchain: {
      paused: boolean | null;
      hookProgramId: string | null;
      tokenProgram: string | null;
      rpcOk: boolean;
      freezeAuthority?: string | null;
      mintAuthority?: string | null;
    };
    market?: { tokenPrice?: number | null; markPrice?: number | null; holders?: number | null };
    fetchedAt?: string;
    truth: { tminus: { allowSign: boolean; refusals: string[] } };
    evidence: { issuerPageUrl: string | null; sourceHash: string | null; sourceUrl?: string; fetchedAt?: string };
    fingerprint?: string;
    eventChange?: {
      kind: string;
      fingerprint: string;
      previousFingerprint: string | null;
      detectedAt: string;
      actionable: boolean;
      previousEvent?: {
        actionType?: string;
        deadlineIso?: string | null;
        destinationTicker?: string | null;
      } | null;
      currentEvent?: {
        actionType?: string;
        deadlineIso?: string | null;
        destinationTicker?: string | null;
      } | null;
    } | null;
  }>;
};

export type ExecutableResponse = {
  allowed: boolean;
  refusals: string[];
  path: "order_execute" | "none";
  transaction: string | null;
  requestId: string | null;
  quote: {
    inAmount: string | null;
    outAmount: string | null;
    executableRatio: number | null;
    router: string | null;
    error: string | null;
  };
  action: {
    symbol: string;
    destinationSymbol: string | null;
    destinationMint: string | null;
    transferFeeBps: number | null;
  };
  executionSnapshot?: {
    actionFingerprint: string;
    quoteFetchedAt: string | null;
    taker: string | null;
    amountRaw: string | null;
    destinationMint: string | null;
    paused: boolean | null;
    hookProgramId: string | null;
    transferFeeBps: number | null;
  };
};

export type ExecuteConversionResponse = {
  settled?: boolean;
  signature?: string;
  explorer?: string;
  executableRatio?: number | null;
  error?: string;
  detail?: string;
  note?: string;
  refusals?: string[];
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
    route?: { composition?: string; path?: string } | string;
    network?: string;
    explorer?: string;
    feedHash?: string | null;
    orderPda?: string;
    programId?: string | null;
    timestamp?: string;
    failsafeFlag?: boolean;
    sourceAmount?: string;
    destinationAmount?: string;
    destinationSymbol?: string;
    settlementKind?: string;
    assetId?: string;
    transferFeeBps?: number | null;
    taker?: string;
    wallet?: string;
    verifiedOnchain?: boolean;
    sourceDisplay?: number;
    destinationDisplay?: number;
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
