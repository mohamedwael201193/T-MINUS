import type {
  ConversionOrder,
  ExecutionReceipt,
  LifecycleAsset,
  MarketSnapshot,
  NetworkEnvironment,
  ProtocolInspect,
  WalletState,
} from "../domain/types";

/**
 * The integration boundary.
 *
 *   UI components
 *        ↓ consume
 *   useTMinus() / useTMinusState()  (adapters/context)
 *        ↓ read through
 *   TMinusSource  ← THIS FILE
 *        ↓ implemented by
 *   LocalDesignSource (opt-in design simulation)
 *   BackendSource     (default — live API + wallet + receipts)
 *
 * Nothing below the UI may be reached around: swapping the
 * implementation swaps the entire data layer without touching a
 * single component.
 */

export interface CreateOrderInput {
  assetId: string;
  /** display units */
  amount: number;
  targetRatio: number;
  floorRatio: number;
  /** ISO date — user-chosen failsafe */
  failsafeAt: string;
}

export type NoticeTone = "lime" | "amber" | "coral" | "ink";

/** engine → UI notices (rendered as toasts) */
export interface EngineNotice {
  id: string;
  kind: "market" | "order" | "wallet";
  tone: NoticeTone;
  title: string;
  body?: string;
  orderId?: string;
  receiptId?: string;
}

export interface TMinusSource {
  /* lifecycle */
  listAssets(): LifecycleAsset[];
  getAsset(id: string): LifecycleAsset | undefined;

  /* market */
  getMarket(assetId: string): MarketSnapshot;

  /* orders */
  listOrders(): ConversionOrder[];
  getOrder(id: string): ConversionOrder | undefined;
  createOrder(input: CreateOrderInput): ConversionOrder | Promise<ConversionOrder>;
  cancelOrder(id: string): void | Promise<void>;

  /* receipts */
  listReceipts(): ExecutionReceipt[];
  getReceipt(id: string): ExecutionReceipt | undefined;

  /* wallet */
  getWallet(): WalletState;
  connectWallet(providerId: string): Promise<void>;
  disconnectWallet(): void | Promise<void>;

  /* notices consumed by the UI bridge */
  getNotices(): EngineNotice[];

  /** honest MAINNET / DEVNET / SIMULATION labels — never implied */
  getEnvironment(): NetworkEnvironment;

  /** live program + PDA inspect — never a place */
  getProtocolInspect(): ProtocolInspect;

  /** currently inspected PreStock — ticket and lifecycle share this */
  getSelectedAssetId(): string;
  selectAsset(id: string): void;

  /* reactivity (stable function identities required) */
  readonly subscribe: (listener: () => void) => () => void;
  readonly getVersion: () => number;
}
