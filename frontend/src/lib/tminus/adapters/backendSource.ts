import type {
  ConversionOrder,
  CorporateActionView,
  ExecutionReceipt,
  LifecycleAsset,
  MarketSnapshot,
  NetworkEnvironment,
  ProtocolInspect,
  RatioPoint,
  WalletState,
} from "../domain/types";
import type { ConversionRequestInput, ConversionResult, CreateOrderInput, EngineNotice, TMinusSource } from "./sources";
import { mapReceipt } from "./receiptMap";
import {
  PROGRAM_ID,
  TMINUS_API,
  apiGet,
  apiGetMaybe,
  apiPost,
  type ActionsListResponse,
  type BalancesResponse,
  type ExecuteConversionResponse,
  type ExecutableResponse,
  type FeedResponse,
  type PdaResponse,
  type PrestocksCatalogResponse,
  type ProgramResponse,
  type QuoteResponse,
  type ReceiptRow,
} from "./api";
import { txFromBase64, txToBase64 } from "../wallet/jupiterTx";
import { displayToRaw, isWalletRejected, maxSafeInputRaw } from "../wallet/safeAmount";

type PhantomLike = {
  isPhantom?: boolean;
  publicKey?: { toBase58(): string };
  connect: (opts?: { onlyIfTrusted?: boolean }) => Promise<{ publicKey: { toBase58(): string } }>;
  disconnect?: () => Promise<void>;
  signTransaction?: (tx: unknown) => Promise<unknown>;
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

function emptyCluster(cluster: "mainnet" | "devnet"): ProtocolInspect["mainnet"] {
  const programId = PROGRAM_ID;
  return {
    exists: false,
    executable: false,
    explorer:
      cluster === "devnet"
        ? `https://explorer.solana.com/address/${programId}?cluster=devnet`
        : `https://explorer.solana.com/address/${programId}`,
    dataLen: 0,
    owner: null,
    lamports: 0,
  };
}

function emptyInspect(): ProtocolInspect {
  return {
    keeperSendEnabled: false,
    mainnet: emptyCluster("mainnet"),
    devnet: emptyCluster("devnet"),
    derivedPda: {
      ready: false,
      reason: "Connect a wallet to derive the order PDA for this pair.",
    },
    lastProofPda: null,
  };
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
    prescribedRatio: row.statedRatio ?? 0,
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
    inOfficialCatalog: row.inOfficialCatalog,
    eventType: row.eventType,
    sourceHash: row.sourceHash,
  };
}

function mapAction(row: ActionsListResponse["actions"][number]): CorporateActionView {
  return {
    assetId: row.assetId,
    symbol: row.symbol,
    stage: row.stage,
    actionType: row.actionType,
    settlementKind: row.settlementKind,
    deadline: row.deadline,
    issuerStatement: row.issuer.statement,
    destinationSymbol: row.destination?.symbol ?? null,
    destinationMint: row.destination?.mint ?? null,
    destinationVerified: row.destinationVerified,
    statedRatio: row.issuer.statedRatio,
    allowsAnyToken: row.issuer.destinationAllowsAny,
    transferFeeBps: row.transferFeeBps,
    paused: row.onchain.paused,
    hookProgramId: row.onchain.hookProgramId,
    tokenProgram: row.onchain.tokenProgram,
    sourceHash: row.evidence.sourceHash,
    issuerPageUrl: row.evidence.issuerPageUrl,
    refusals: row.truth.tminus.refusals,
    allowSign: row.truth.tminus.allowSign,
    onchainRpcOk: row.onchain.rpcOk,
    fetchedAt: row.evidence.fetchedAt ?? row.fetchedAt ?? null,
    sourceUrl: row.evidence.sourceUrl ?? row.evidence.issuerPageUrl,
    tokenPrice: row.market?.tokenPrice ?? null,
    markPrice: row.market?.markPrice ?? null,
    holders: row.market?.holders ?? null,
    freezeAuthority: row.onchain.freezeAuthority ?? null,
    mintAuthority: row.onchain.mintAuthority ?? null,
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

export function createBackendSource(): TMinusSource & { start: () => void; stop: () => void } {
  return new BackendSource();
}

class BackendSource implements TMinusSource {
  private listeners = new Set<() => void>();
  private version = 0;
  private timer: ReturnType<typeof setInterval> | null = null;
  private abort: AbortController | null = null;
  private assets: LifecycleAsset[] = [];
  private actions: CorporateActionView[] = [];
  private markets = new Map<string, MarketSnapshot>();
  private receipts: ExecutionReceipt[] = [];
  private notices: EngineNotice[] = [];
  private historyT = 0;
  private selectedAssetId = "spacex";
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
  private inspect: ProtocolInspect = emptyInspect();
  private inspectGen = 0;

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

  getAction(assetId: string): CorporateActionView | undefined {
    return this.actions.find((a) => a.assetId === assetId);
  }

  async requestConversion(input: ConversionRequestInput): Promise<ConversionResult> {
    if (!this.walletState.connected || !this.walletState.address) {
      return { status: "refused", refusals: ["USER_WALLET_REQUIRED"], message: "Connect a wallet to sign." };
    }
    if (input.assetId !== "spacex") {
      return {
        status: "refused",
        refusals: ["TERMS_PENDING"],
        message: "Live conversion signing is wired for SPACEX while it is the open issuer window.",
      };
    }
    const walletRaw = BigInt(this.walletState.balances?.spacexRaw ?? "0");
    const requested = input.amountRaw && /^[1-9][0-9]*$/.test(input.amountRaw)
      ? BigInt(input.amountRaw)
      : displayToRaw(String(input.amountDisplay));
    const safe = maxSafeInputRaw(walletRaw);
    const amountRaw = requested > safe ? safe : requested;
    if (amountRaw <= BigInt(0)) {
      return { status: "refused", refusals: ["INSUFFICIENT_BALANCE"], message: "This wallet has no executable SPACEX." };
    }
    if ((this.walletState.balances?.SOL ?? 0) < 0.003) {
      return { status: "refused", refusals: ["INSUFFICIENT_SOL"], message: "Not enough SOL to pay the network fee." };
    }
    const q = new URLSearchParams({
      amount: amountRaw.toString(),
      taker: this.walletState.address,
      floorRatio: String(input.floorRatio),
    });
    const exec = await apiGet<ExecutableResponse>(`/v1/actions/spacex/executable?${q}`);
    if (!exec.allowed || !exec.transaction || !exec.requestId) {
      return {
        status: "refused",
        refusals: exec.refusals ?? ["NO_ROUTE"],
        message: `Safety gate refused: ${(exec.refusals ?? ["NO_ROUTE"]).join(", ")}`,
      };
    }
    const provider = injectedProvider(this.walletState.providerId ?? "phantom");
    if (!provider?.signTransaction) {
      return { status: "error", message: "Wallet cannot sign a VersionedTransaction." };
    }
    let signed: unknown;
    try {
      const tx = txFromBase64(exec.transaction);
      signed = await provider.signTransaction(tx);
    } catch (err) {
      if (isWalletRejected(err)) {
        return { status: "refused", refusals: ["WALLET_REJECTED"], message: "Phantom rejected the signature." };
      }
      return { status: "error", message: err instanceof Error ? err.message : "signTransaction failed" };
    }
    const signedB64 = txToBase64(signed as Parameters<typeof txToBase64>[0]);
    const landed = await apiPost<ExecuteConversionResponse>("/v1/conversions/execute", {
      signedTransaction: signedB64,
      requestId: exec.requestId,
      assetId: "spacex",
      taker: this.walletState.address,
      amountRaw: amountRaw.toString(),
      floorRatio: input.floorRatio,
    });
    if (landed.status === 200 && landed.body.settled && landed.body.signature && landed.body.explorer) {
      await this.refresh();
      if (this.walletState.providerId && this.walletState.address) {
        await this.applyConnectedWallet(this.walletState.providerId, this.walletState.address);
      }
      return {
        status: "settled",
        signature: landed.body.signature,
        explorer: landed.body.explorer,
        ratio: landed.body.executableRatio ?? exec.quote.executableRatio,
      };
    }
    if (landed.status === 202 && landed.body.signature && landed.body.explorer) {
      return {
        status: "submitted",
        signature: landed.body.signature,
        explorer: landed.body.explorer,
        message: landed.body.note ?? "PENDING — submitted but not yet confirmed. No receipt stored.",
      };
    }
    if (landed.status === 409) {
      return {
        status: "refused",
        refusals: landed.body.refusals ?? ["NO_ROUTE"],
        message: "Safety gate refused at execute time.",
      };
    }
    return {
      status: "error",
      message: landed.body.detail ?? landed.body.error ?? `execute HTTP ${landed.status}`,
    };
  }

  getWallet(): WalletState {
    return this.walletState;
  }

  getEnvironment(): NetworkEnvironment {
    return this.env;
  }

  getProtocolInspect(): ProtocolInspect {
    return this.inspect;
  }

  getSelectedAssetId(): string {
    return this.selectedAssetId;
  }

  selectAsset(id: string): void {
    this.selectedAssetId = id;
    this.emit();
    void this.inspectChainState();
  }

  private async applyConnectedWallet(providerId: string, address: string): Promise<void> {
    let balances: WalletState["balances"] = { SPACEX: 0, SPCXx: 0, USDC: 0, SOL: 0, spacexRaw: "0" };
    try {
      const live = await apiGet<BalancesResponse>(`/v1/balances?owner=${address}`);
      balances = {
        SPACEX: live.SPACEX.displayUnits,
        SPCXx: live.SPCXx.uiAmount ?? 0,
        USDC: live.USDC,
        SOL: live.sol,
        spacexRaw: live.SPACEX.raw,
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
    void this.inspectChainState();
  }

  private async restoreTrustedWallet(): Promise<void> {
    for (const id of ["phantom", "solflare", "backpack"] as const) {
      const provider = injectedProvider(id);
      if (!provider) continue;
      try {
        const res = await Promise.race([
          provider.connect({ onlyIfTrusted: true }),
          new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error("trusted-connect-timeout")), 2_500);
          }),
        ]);
        await this.applyConnectedWallet(id, res.publicKey.toBase58());
        return;
      } catch {
        /* not trusted, or user has not approved this origin */
      }
    }
  }

  async connectWallet(providerId: string): Promise<void> {
    const provider = injectedProvider(providerId);
    if (!provider) {
      throw new Error(`${providerId} is not injected in this browser.`);
    }
    this.walletState = { ...this.walletState, connecting: true, providerId };
    this.emit();
    try {
      const res = await Promise.race([
        provider.connect(),
        new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error("Wallet did not respond. Approve or reject the Phantom prompt.")), 20_000);
        }),
      ]);
      const address = res.publicKey.toBase58();
      await this.applyConnectedWallet(providerId, address);
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
    this.inspect = {
      ...this.inspect,
      derivedPda: {
        ready: false,
        reason: "Connect a wallet to derive the order PDA for this pair.",
      },
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
    void this.restoreTrustedWallet();
    void apiGet("/v1/feed/refresh")
      .catch(() => undefined)
      .finally(() => void this.refresh());
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

  private async inspectChainState() {
    const gen = ++this.inspectGen;
    const proofPda = this.receipts.find((r) => r.orderId)?.orderId;
    let lastProofPda = this.inspect.lastProofPda;
    if (proofPda && !(lastProofPda?.pda === proofPda && lastProofPda.account === "absent")) {
      const looked = await apiGetMaybe<{
        order?: { status?: string };
      }>(`/v1/orders/${proofPda}?cluster=devnet`);
      if (gen !== this.inspectGen) return;
      lastProofPda = {
        pda: proofPda,
        cluster: "devnet",
        account:
          looked.status === 404
            ? "absent"
            : looked.body?.order?.status === "open"
              ? "open"
              : looked.body?.order?.status === "closed"
                ? "closed"
                : "unchecked",
        explorer: `https://explorer.solana.com/address/${proofPda}?cluster=devnet`,
        note:
          looked.status === 404
            ? "closed after fill/expire — account gone"
            : looked.body?.order?.status === "open"
              ? "open on DEVNET"
              : "lookup returned",
      };
    }

    const owner = this.walletState.address;
    const asset = this.getAsset(this.selectedAssetId) ?? this.assets[0];
    let derivedPda = this.inspect.derivedPda;
    if (!owner) {
      derivedPda = {
        ready: false,
        reason: "Connect a wallet to derive the order PDA for this pair.",
      };
    } else if (!asset?.mint || !asset.destinationMint) {
      derivedPda = {
        ready: false,
        reason: "Destination mint is not verified for this PreStock — PDA not derived.",
      };
    } else {
      const q = new URLSearchParams({
        owner,
        src: asset.mint,
        dst: asset.destinationMint,
        nonce: "0",
        cluster: "devnet",
      });
      const pda = await apiGetMaybe<PdaResponse>(`/v1/pda?${q}`);
      if (gen !== this.inspectGen) return;
      if (pda.status === 404 || !pda.body?.pda) {
        derivedPda = {
          ready: false,
          reason:
            pda.status === 404
              ? "PDA endpoint not live yet — Render will pick up /v1/pda after deploy."
              : `PDA derive HTTP ${pda.status}`,
        };
      } else {
        const acct = pda.body.account;
        derivedPda = {
          ready: true,
          reason: "Deterministic PDA for owner × src × dst × nonce 0 — inspect only.",
          pda: pda.body.pda,
          bump: pda.body.bump,
          nonce: pda.body.nonce,
          cluster: "devnet",
          account: !acct
            ? "unchecked"
            : !acct.exists
              ? "absent"
              : acct.status === "open" || acct.status === "closed" || acct.status === "wrong_owner"
                ? acct.status
                : "unchecked",
          explorer: pda.body.explorer ?? `https://explorer.solana.com/address/${pda.body.pda}?cluster=devnet`,
        };
      }
    }

    if (gen !== this.inspectGen) return;
    this.inspect = {
      ...this.inspect,
      derivedPda,
      lastProofPda,
    };
    this.emit();
  }

  private async refresh() {
    this.abort?.abort();
    const abort = new AbortController();
    this.abort = abort;
    try {
      const [catalog, feed, program, receipts, quote, actions] = await Promise.all([
        apiGet<PrestocksCatalogResponse>("/v1/prestocks", abort.signal).catch(() => null),
        apiGet<FeedResponse>("/v1/feed", abort.signal).catch(() => null),
        apiGet<ProgramResponse>("/v1/program", abort.signal).catch(() => null),
        apiGet<{ receipts: ReceiptRow[] }>("/v1/receipts", abort.signal).catch(() => ({ receipts: [] })),
        apiGet<QuoteResponse>("/v1/quote", abort.signal).catch(() => null),
        apiGet<ActionsListResponse>("/v1/actions", abort.signal).catch(() => null),
      ]);
      if (abort.signal.aborted) return;

      this.assets = catalog
        ? catalog.assets.map(mapAsset)
        : feed
          ? [mapAssetFromFeed(feed)]
          : [];
      this.actions = actions?.actions?.map(mapAction) ?? [];
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
      this.inspect = {
        ...this.inspect,
        keeperSendEnabled: Boolean(program?.keeperSendEnabled),
        mainnet: {
          exists: Boolean(program?.clusters.mainnet.exists),
          executable: Boolean(program?.clusters.mainnet.executable),
          explorer:
            program?.clusters.mainnet.explorer ??
            `https://explorer.solana.com/address/${program?.programId ?? PROGRAM_ID}`,
          dataLen: program?.clusters.mainnet.dataLen ?? 0,
          owner: program?.clusters.mainnet.owner ?? null,
          lamports: program?.clusters.mainnet.lamports ?? 0,
        },
        devnet: {
          exists: Boolean(program?.clusters.devnet.exists),
          executable: Boolean(program?.clusters.devnet.executable),
          explorer:
            program?.clusters.devnet.explorer ??
            `https://explorer.solana.com/address/${program?.programId ?? PROGRAM_ID}?cluster=devnet`,
          dataLen: program?.clusters.devnet.dataLen ?? 0,
          owner: program?.clusters.devnet.owner ?? null,
          lamports: program?.clusters.devnet.lamports ?? 0,
        },
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
      void this.inspectChainState();
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
