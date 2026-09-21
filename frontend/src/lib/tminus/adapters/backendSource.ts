import type {
  ConversionOrder,
  ExecutionReceipt,
  LifecycleAsset,
  MarketSnapshot,
  NetworkEnvironment,
  RatioPoint,
  WalletState,
} from "../domain/types";
import type { CreateOrderInput, EngineNotice, TMinusSource } from "./sources";
import {
  PROGRAM_ID,
  TMINUS_API,
  apiGet,
  type BalancesResponse,
  type FeedResponse,
  type PrestocksCatalogResponse,
  type ProgramResponse,
  type QuoteResponse,
  type ReceiptRow,
} from "./api";

type PhantomLike = {
  isPhantom?: boolean;
  publicKey?: { toBase58(): string };
  connect: (opts?: { onlyIfTrusted?: boolean }) => Promise<{ publicKey: { toBase58(): string } }>;
  disconnect?: () => Promise<void>;
};

function injectedProvider(id: string): PhantomLike | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    solana?: PhantomLike;
    solflare?: PhantomLike;
    backpack?: { solana?: PhantomLike };
  };
  if (id === "phantom") return w.solana ?? null;
  if (id === "solflare") return w.solflare ?? null;
  if (id === "backpack") return w.backpack?.solana ?? null;
  return w.solana ?? null;
}

function emptyMarket(assetId: string): MarketSnapshot {
  return { assetId, executableRatio: null, history: [], event: null };
}

function mapAsset(row: PrestocksCatalogResponse["assets"][number]): LifecycleAsset {
  return {
    id: row.id,
    symbol: row.symbol,
    name: row.name,
    kind: "PRESTOCK",
    tokenStandard: "TOKEN-2022",
    destinationSymbol: row.destinationSymbol ?? "TBD",
    destinationName: row.destinationName ?? (row.destinationSymbol ?? "Terms pending"),
    destinationPrice: row.destinationSymbol === "SPCXx" ? row.markPrice : null,
    price: row.tokenPrice ?? 0,
    markPrice: row.markPrice ?? row.tokenPrice ?? 0,
    prescribedRatio: 1,
    transferFeeBps: row.transferFeeBps ?? 0,
    holders: row.holders ?? 0,
    supplyDisplay: 0,
    stage: row.stage,
    stageNote: row.stageNote,
    windowOpenedAt: null,
    windowClosesAt: row.deadline,
    tranches: [],
    rawMultiplier: 1,
    mint: row.mint,
    destinationMint: row.destinationMint ?? undefined,
    verificationState: row.verificationState,
    executionAvailability: row.executionAvailability,
    sourceUrl: row.sourceUrl,
    issuerPageUrl: row.issuerPageUrl ?? undefined,
    fetchedAt: row.fetchedAt,
  };
}

function mapAssetFromFeed(res: FeedResponse): LifecycleAsset {
  const feed = res.feed;
  const tokenPrice = feed.ratio != null ? Number(feed.ratio) : 0;
  const deadlinePassed = feed.deadline ? Date.parse(feed.deadline) <= Date.now() : false;
  return {
    id: "spacex",
    symbol: "SPACEX",
    name: "SpaceX PreStock",
    kind: "PRESTOCK",
    tokenStandard: "TOKEN-2022",
    destinationSymbol: "SPCXx",
    destinationName: "SpaceX equity token",
    destinationPrice: null,
    price: tokenPrice,
    markPrice: 0,
    prescribedRatio: 1,
    transferFeeBps: 0,
    holders: 0,
    supplyDisplay: 0,
    stage: deadlinePassed ? "EXPIRED" : feed.deadline ? "CONVERSION_WINDOW" : "TERMS_PENDING",
    stageNote: feed.lockup ?? "SPACEX lifecycle from /v1/feed (catalog endpoint unavailable).",
    windowOpenedAt: null,
    windowClosesAt: feed.deadline,
    tranches: [],
    rawMultiplier: 1,
    mint: feed.token,
    destinationMint: feed.destination,
    verificationState: feed.verification_state,
    executionAvailability: feed.deadline && !deadlinePassed ? "AVAILABLE" : "UNKNOWN",
    sourceUrl: feed.source_url,
    issuerPageUrl: "https://prestocks.com/spacex",
    fetchedAt: feed.fetched_at,
  };
}

function mapReceipt(row: ReceiptRow, index: number): ExecutionReceipt {
  const payload = row.payload ?? {};
  const network = (payload.network === "MAINNET" || payload.network === "DEVNET"
    ? payload.network
    : "DEVNET") as ExecutionReceipt["network"];
  const srcRaw = Number(payload.sourceAmount ?? "0");
  const dstRaw = Number(payload.destinationAmount ?? "0");
  const ratioE9 = Number(payload.ratio ?? "0");
  const composition =
    typeof payload.route === "string" ? payload.route : payload.route?.composition ?? "unknown";
  const isDevnet = network === "DEVNET";
  return {
    id: `R-${String(index + 1).padStart(4, "0")}`,
    orderId: row.order_pda,
    assetId: isDevnet ? "protocol-devnet" : "spacex",
    path: payload.failsafeFlag ? "FAILSAFE" : "TARGET",
    targetRatio: ratioE9 ? ratioE9 / 1e9 : 0,
    floorRatio: ratioE9 ? ratioE9 / 1e9 : 0,
    executedRatio: ratioE9 ? ratioE9 / 1e9 : 0,
    size: srcRaw / 1e6,
    filled: dstRaw / 1e6,
    signature: row.sig,
    slot: Number(row.slot ?? payload.slot ?? 0),
    route: `${network} · ${composition}`,
    feeBps: 0,
    settledAt: payload.timestamp ?? row.created_at,
    feedHash: payload.feedHash ?? "—",
    network,
    explorerUrl:
      payload.explorer ??
      (network === "DEVNET"
        ? `https://explorer.solana.com/tx/${row.sig}?cluster=devnet`
        : `https://explorer.solana.com/tx/${row.sig}`),
    programId: payload.programId ?? PROGRAM_ID,
    sourceSymbol: isDevnet ? "DEVNET-SRC" : "SPACEX",
    destinationSymbol: isDevnet ? "DEVNET-DST" : "SPCXx",
  };
}

export function createBackendSource(): TMinusSource & { start: () => void; stop: () => void } {
  return new BackendSource();
}

class BackendSource implements TMinusSource {
  private listeners = new Set<() => void>();
  private version = 0;
  private timer: ReturnType<typeof setInterval> | null = null;
  private abort: AbortController | null = null;
  private assets: LifecycleAsset[] = [];
  private markets = new Map<string, MarketSnapshot>();
  private receipts: ExecutionReceipt[] = [];
  private notices: EngineNotice[] = [];
  private historyT = 0;
  private env: NetworkEnvironment = {
    dataCluster: "MAINNET",
    programCluster: "NONE",
    programId: PROGRAM_ID,
    apiBase: TMINUS_API,
    programMainnetExists: false,
    programDevnetExists: false,
  };
  private walletState: WalletState = {
    connected: false,
    connecting: false,
    providerId: null,
    address: null,
    balances: null,
  };

  listAssets(): LifecycleAsset[] {
    return this.assets;
  }

  getAsset(id: string): LifecycleAsset | undefined {
    return this.assets.find((a) => a.id === id);
  }

  getMarket(assetId: string): MarketSnapshot {
    return this.markets.get(assetId) ?? emptyMarket(assetId);
  }

  listOrders(): ConversionOrder[] {
    return [];
  }

  getOrder(): ConversionOrder | undefined {
    return undefined;
  }

  async createOrder(_input: CreateOrderInput): Promise<ConversionOrder> {
    if (!this.walletState.connected) {
      throw new Error("Connect a wallet before placing an order.");
    }
    if (!this.env.programMainnetExists) {
      throw new Error(
        "T-MINUS program is not deployed on MAINNET. The protocol is proven on DEVNET with real receipts. This console will not fake a place, signature, or escrow.",
      );
    }
    throw new Error("MAINNET place is not enabled.");
  }

  async cancelOrder(): Promise<void> {
    throw new Error(
      "Cancel requires the T-MINUS program on this cluster. Mainnet program is not deployed.",
    );
  }

  listReceipts(): ExecutionReceipt[] {
    return this.receipts;
  }

  getReceipt(id: string): ExecutionReceipt | undefined {
    return this.receipts.find((r) => r.id === id);
  }

  getWallet(): WalletState {
    return this.walletState;
  }

  getEnvironment(): NetworkEnvironment {
    return this.env;
  }

  async connectWallet(providerId: string): Promise<void> {
    const provider = injectedProvider(providerId);
    if (!provider) {
      throw new Error(`${providerId} is not injected in this browser.`);
    }
    this.walletState = { ...this.walletState, connecting: true, providerId };
    this.emit();
    try {
      const res = await provider.connect();
      const address = res.publicKey.toBase58();
      let balances = { SPACEX: 0, SPCXx: 0, USDC: 0, SOL: 0 };
      try {
        const live = await apiGet<BalancesResponse>(`/v1/balances?owner=${address}`);
        balances = {
          SPACEX: live.SPACEX.displayUnits,
          SPCXx: live.SPCXx.uiAmount ?? 0,
          USDC: live.USDC,
          SOL: live.sol,
        };
      } catch {
        /* address is still real; balances stay 0 rather than invented */
      }
      this.walletState = {
        connected: true,
        connecting: false,
        providerId,
        address,
        balances,
      };
      this.emit();
    } catch (err) {
      this.walletState = {
        connected: false,
        connecting: false,
        providerId: null,
        address: null,
        balances: null,
      };
      this.emit();
      throw err;
    }
  }

  async disconnectWallet(): Promise<void> {
    const provider = injectedProvider(this.walletState.providerId ?? "phantom");
    try {
      await provider?.disconnect?.();
    } catch {
      /* ignore provider disconnect errors */
    }
    this.walletState = {
      connected: false,
      connecting: false,
      providerId: null,
      address: null,
      balances: null,
    };
    this.emit();
  }

  getNotices(): EngineNotice[] {
    const out = this.notices;
    this.notices = [];
    return out;
  }

  start() {
    if (this.timer) return;
    void this.refresh();
    this.timer = setInterval(() => void this.refresh(), 15_000);
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.abort?.abort();
  }

  private emit() {
    this.version++;
    for (const l of this.listeners) l();
  }

  readonly subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  readonly getVersion = () => this.version;

  private async refresh() {
    this.abort?.abort();
    const abort = new AbortController();
    this.abort = abort;
    try {
      const [catalog, feed, program, receipts, quote] = await Promise.all([
        apiGet<PrestocksCatalogResponse>("/v1/prestocks", abort.signal).catch(() => null),
        apiGet<FeedResponse>("/v1/feed", abort.signal).catch(() => null),
        apiGet<ProgramResponse>("/v1/program", abort.signal).catch(() => null),
        apiGet<{ receipts: ReceiptRow[] }>("/v1/receipts", abort.signal).catch(() => ({ receipts: [] })),
        apiGet<QuoteResponse>("/v1/quote", abort.signal).catch(() => null),
      ]);
      if (abort.signal.aborted) return;

      this.assets = catalog
        ? catalog.assets.map(mapAsset)
        : feed
          ? [mapAssetFromFeed(feed)]
          : [];
      this.receipts = (receipts.receipts ?? []).map(mapReceipt);
      this.env = {
        dataCluster: "MAINNET",
        programCluster: program?.clusters.mainnet.executable
          ? "MAINNET"
          : program?.clusters.devnet.executable
            ? "DEVNET"
            : "NONE",
        programId: program?.programId ?? PROGRAM_ID,
        apiBase: TMINUS_API,
        programMainnetExists: Boolean(program?.clusters.mainnet.executable),
        programDevnetExists: Boolean(program?.clusters.devnet.executable),
      };

      const spacex = this.assets.find((a) => a.id === "spacex");
      let executableRatio: number | null = null;
      if (quote?.quote?.inAmount && quote.quote.outAmount) {
        const inn = Number(quote.quote.inAmount);
        const out = Number(quote.quote.outAmount);
        if (inn > 0) {
          const SPACEX_DISPLAY_RAW = 200_000_000;
          const SPCXX_DECIMALS = 1e8;
          executableRatio = out / SPCXX_DECIMALS / (inn / SPACEX_DISPLAY_RAW);
        }
      }
      if (executableRatio == null && spacex && spacex.markPrice > 0 && spacex.price > 0) {
        executableRatio = spacex.price / spacex.markPrice;
      }
      if (executableRatio == null && feed?.feed.ratio) {
        const tokenPrice = Number(feed.feed.ratio);
        if (spacex && spacex.markPrice > 0) executableRatio = tokenPrice / spacex.markPrice;
      }

      if (spacex) {
        const prev = this.markets.get("spacex");
        const history: RatioPoint[] = prev?.history ? [...prev.history] : [];
        if (executableRatio != null) {
          this.historyT += 1;
          history.push({ t: this.historyT, v: executableRatio });
          if (history.length > 120) history.shift();
        }
        const stale = spacex.verificationState === "stale";
        this.markets.set("spacex", {
          assetId: "spacex",
          executableRatio,
          history,
          event: stale
            ? {
                label: "FEED STALE",
                detail: "Lifecycle snapshot is older than the freshness window. Refresh the API feed.",
              }
            : null,
        });
      }

      for (const asset of this.assets) {
        if (asset.id === "spacex") continue;
        this.markets.set(asset.id, emptyMarket(asset.id));
      }

      this.emit();
    } catch (err) {
      if (abort.signal.aborted) return;
      this.notices.push({
        id: `n-${Date.now()}`,
        kind: "market",
        tone: "coral",
        title: "LIVE FEED ERROR",
        body: err instanceof Error ? err.message : "unknown",
      });
      this.emit();
    }
  }
}
