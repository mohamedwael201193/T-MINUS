/**
 * T-MINUS domain model.
 *
 * These types describe the product vocabulary — lifecycle, order,
 * execution, receipt. The UI renders ONLY these types; where the
 * values come from (local design data today, the real backend +
 * Solana program later) is decided by the adapters in ../adapters.
 */

/* ------------------------------- lifecycle ------------------------------ */

export type LifecycleStage =
  | "TERMS_PENDING" // pre-IPO, no conversion terms published yet
  | "CONVERSION_WINDOW" // issuer conversion window is open
  | "CONVERTED" // fully converted / retired
  | "EXPIRED"; // deadline passed — tokens expire worthless

export interface TrancheEvent {
  /** ISO date */
  date: string;
  /** short label, e.g. "SEP 24" */
  label: string;
  /** one-line detail, e.g. "Day-105 tranche · 328.4M shares" */
  detail: string;
}

export interface LifecycleAsset {
  id: string;
  symbol: string;
  name: string;
  /** always a PreStocks pre-IPO token in v1 */
  kind: "PRESTOCK";
  tokenStandard: "TOKEN-2022";
  /** issuer-prescribed conversion destination */
  destinationSymbol: string;
  destinationName: string;
  destinationPrice: number | null;
  /** current PreStocks token price, display units */
  price: number;
  /** issuer mark / reference valuation */
  markPrice: number;
  /** promised conversion ratio after full unlock (1:1 = 1.0) */
  prescribedRatio: number;
  /** Token-2022 transfer fee, basis points (100 = 1%) */
  transferFeeBps: number;
  holders: number;
  supplyDisplay: number;
  stage: LifecycleStage;
  stageNote: string;
  /** when the conversion window opened (null if not yet) */
  windowOpenedAt: string | null;
  /** hard conversion deadline — after this, tokens expire worthless */
  windowClosesAt: string | null;
  /** upcoming lockup tranche calendar */
  tranches: TrancheEvent[];
  /** raw-unit multiplier pinned by the lifecycle feed (display × multiplier = raw) */
  rawMultiplier: number;
  mint?: string;
  destinationMint?: string;
  verificationState?: "verified" | "stale" | "unknown" | "unverified";
  executionAvailability?: "AVAILABLE" | "LIMITED" | "HALTED" | "UNKNOWN";
  sourceUrl?: string;
  issuerPageUrl?: string;
  fetchedAt?: string;
  inOfficialCatalog?: boolean;
  eventType?: string | null;
  sourceHash?: string | null;
}

/* -------------------------------- market -------------------------------- */

export interface RatioPoint {
  /** ms offset from session start */
  t: number;
  /** executable ratio (post-fee) */
  v: number;
}

export interface MarketEvent {
  label: string;
  detail: string;
}

export interface MarketSnapshot {
  assetId: string;
  /** executable ratio right now (null when no live market / no window) */
  executableRatio: number | null;
  history: RatioPoint[];
  event: MarketEvent | null;
}

/* --------------------------------- order -------------------------------- */

export type OrderStatus =
  | "PLACED"
  | "ARMED"
  | "WATCHING"
  | "TARGET_REACHED"
  | "EXECUTING"
  | "SETTLED"
  | "CANCELLED";

export type FillPath = "TARGET" | "FAILSAFE";

export interface OrderEvent {
  status: OrderStatus;
  /** ISO timestamp */
  at: string;
  note?: string;
}

export interface ConversionOrder {
  /** human order id, e.g. "TM-2481" */
  id: string;
  assetId: string;
  /** display units of the source token */
  amount: number;
  /** convert when executable ratio ≥ this */
  targetRatio: number;
  /** after failsafeAt, accept any fill ≥ this */
  floorRatio: number;
  /** user-chosen failsafe date (≤ hard deadline) */
  failsafeAt: string;
  status: OrderStatus;
  createdAt: string;
  events: OrderEvent[];
  /* filled below when terminal */
  fillPath?: FillPath;
  executedRatio?: number;
  /** destination tokens delivered */
  filledAmount?: number;
  receiptId?: string;
}

/* -------------------------------- receipt ------------------------------- */

export interface ExecutionReceipt {
  id: string;
  orderId: string;
  assetId: string;
  path: FillPath;
  targetRatio: number;
  floorRatio: number;
  executedRatio: number;
  /** source size, display units */
  size: number;
  /** destination delivered */
  filled: number;
  signature: string;
  slot: number;
  route: string;
  feeBps: number;
  settledAt: string;
  feedHash: string;
  network?: DataCluster | ProgramCluster;
  explorerUrl?: string;
  programId?: string;
  sourceSymbol?: string;
  destinationSymbol?: string;
  eventKind?: "fill" | "cancel" | "expire" | "place" | "conversion";
}

export type ActionType = "GOING_PUBLIC" | "ACQUISITION" | "EXPIRY" | "NONE";

export type CorporateActionView = {
  assetId: string;
  symbol: string;
  stage: LifecycleStage;
  actionType: ActionType;
  settlementKind: "TRADE" | "NONE";
  deadline: string | null;
  issuerStatement: string | null;
  destinationSymbol: string | null;
  destinationMint: string | null;
  destinationVerified: boolean;
  statedRatio: number | null;
  allowsAnyToken: boolean;
  transferFeeBps: number | null;
  paused: boolean | null;
  hookProgramId: string | null;
  tokenProgram: string | null;
  sourceHash: string | null;
  issuerPageUrl: string | null;
  refusals: string[];
  allowSign: boolean;
  onchainRpcOk: boolean;
};

/* --------------------------------- wallet ------------------------------- */

export type DataCluster = "MAINNET" | "DEVNET" | "SIMULATION";
export type ProgramCluster = "MAINNET" | "DEVNET" | "NONE" | "SIMULATION";

export interface NetworkEnvironment {
  dataCluster: DataCluster;
  programCluster: ProgramCluster;
  programId: string;
  apiBase: string;
  programMainnetExists: boolean;
  programDevnetExists: boolean;
}

export type PdaAccountState = "absent" | "open" | "closed" | "wrong_owner" | "unchecked";

export interface ClusterProgramStatus {
  exists: boolean;
  executable: boolean;
  explorer: string;
  dataLen: number;
  owner: string | null;
  lamports: number;
}

export interface ProtocolInspect {
  keeperSendEnabled: boolean;
  mainnet: ClusterProgramStatus;
  devnet: ClusterProgramStatus;
  derivedPda: {
    ready: boolean;
    reason: string;
    pda?: string;
    bump?: number;
    nonce?: string;
    cluster?: "devnet";
    account?: PdaAccountState;
    explorer?: string;
  };
  lastProofPda: {
    pda: string;
    cluster: "devnet";
    account: PdaAccountState;
    explorer: string;
    note: string;
  } | null;
}

export interface WalletBalance {
  SPACEX: number;
  SPCXx: number;
  USDC: number;
  SOL?: number;
}

export interface WalletProviderOption {
  id: string;
  name: string;
}

export interface WalletState {
  connected: boolean;
  connecting: boolean;
  providerId: string | null;
  address: string | null;
  balances: WalletBalance | null;
}
