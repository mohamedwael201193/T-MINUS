import type {
  ConversionOrder,
  ExecutionReceipt,
  LifecycleAsset,
  MarketSnapshot,
  NetworkEnvironment,
  OrderStatus,
  ProtocolInspect,
  WalletState,
} from "../domain/types";
import { LIFECYCLE_ASSETS } from "../data/lifecycleData";
import {
  INITIAL_EXEC_RATIO,
  MARKET_WALK,
  buildInitialHistory,
} from "../data/marketState";
import { INITIAL_ORDERS, ORDER_ID_PREFIX, RECEIPT_ID_PREFIX } from "../data/orderState";
import { INITIAL_RECEIPTS } from "../data/receiptData";
import {
  DESIGN_WALLET_ADDRESS,
  DESIGN_WALLET_BALANCES,
  WALLET_PROVIDERS,
} from "../data/walletState";
import type {
  CreateOrderInput,
  EngineNotice,
  TMinusSource,
} from "./sources";
import { clamp, fmtRatio, round } from "../utils";

/**
 * LocalDesignSource — the design-phase implementation of TMinusSource.
 *
 * Holds the same domain state a real backend would serve, plus a
 * small simulation loop that makes it breathe:
 *   - the executable ratio walks a scripted market (quiet → tranche
 *     climb → settle) with mean-reverting noise
 *   - open orders evaluate against the live ratio and walk the real
 *     state machine: PLACED → ARMED → WATCHING → TARGET_REACHED /
 *     FAILSAFE → EXECUTING → SETTLED, producing receipts
 *
 * All randomness and Date.now() usage happens inside tick(), which
 * only runs client-side after start() — the constructed state is
 * deterministic, so SSR and hydration render identical first frames.
 */

const TICK_MS = 500;
const MARKET_EVERY_TICKS = 5; // market steps every 2.5s
const HISTORY_CAP = 120;

interface PendingTransition {
  orderId: string;
  at: number;
  to: OrderStatus;
  note?: string;
}

interface Settlement {
  orderId: string;
  at: number;
  path: "TARGET" | "FAILSAFE";
}

const OPEN_STATUSES: OrderStatus[] = ["PLACED", "ARMED", "WATCHING"];
const TERMINAL_STATUSES: OrderStatus[] = ["SETTLED", "CANCELLED"];
const CANCELLABLE: OrderStatus[] = ["PLACED", "ARMED", "WATCHING"];

const B58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

function seededBase58(len: number, seed: number): string {
  let s = seed >>> 0;
  let out = "";
  for (let i = 0; i < len; i++) {
    s = (s * 1_664_525 + 1_013_904_223) >>> 0;
    out += B58[Math.floor((s / 4_294_967_296) * B58.length)];
  }
  return out;
}

export class LocalDesignSource implements TMinusSource {
  private assets: LifecycleAsset[] = LIFECYCLE_ASSETS;
  private market = new Map<string, MarketSnapshot>();
  private orders: ConversionOrder[] = [...INITIAL_ORDERS];
  private receipts: ExecutionReceipt[] = [...INITIAL_RECEIPTS];
  private walletState: WalletState = {
    connected: false,
    connecting: false,
    providerId: null,
    address: null,
    balances: null,
  };
  private pending: PendingTransition[] = [];
  private settlements: Settlement[] = [];
  private notices: EngineNotice[] = [];
  private listeners = new Set<() => void>();
  private version = 0;
  private timer: ReturnType<typeof setInterval> | null = null;
  private ticks = 0;
  private startAt = 0;
  private marketEventFired = false;
  private orderSeq = 2482;
  private receiptSeq = 1043;
  private entropy = 987_654_321;
  private selectedAssetId = "spacex";

  constructor() {
    this.market.set("spacex", {
      assetId: "spacex",
      executableRatio: INITIAL_EXEC_RATIO,
      history: buildInitialHistory(),
      event: null,
    });
    this.market.set("openai", {
      assetId: "openai",
      executableRatio: null,
      history: [],
      event: null,
    });
  }

  /* ------------------------------ lifecycle ----------------------------- */

  listAssets(): LifecycleAsset[] {
    return this.assets;
  }

  getAsset(id: string): LifecycleAsset | undefined {
    return this.assets.find((a) => a.id === id);
  }

  getEnvironment(): NetworkEnvironment {
    return {
      dataCluster: "SIMULATION",
      programCluster: "SIMULATION",
      programId: "HRLmVcuk6PRcVwB3UVpcbEC3LVVMhdLZfPvHtmL2PUdL",
      apiBase: "",
      programMainnetExists: false,
      programDevnetExists: false,
    };
  }

  getProtocolInspect(): ProtocolInspect {
    const programId = "HRLmVcuk6PRcVwB3UVpcbEC3LVVMhdLZfPvHtmL2PUdL";
    return {
      keeperSendEnabled: false,
      mainnet: {
        exists: false,
        executable: false,
        explorer: `https://explorer.solana.com/address/${programId}`,
        dataLen: 0,
        owner: null,
        lamports: 0,
      },
      devnet: {
        exists: false,
        executable: false,
        explorer: `https://explorer.solana.com/address/${programId}?cluster=devnet`,
        dataLen: 0,
        owner: null,
        lamports: 0,
      },
      derivedPda: {
        ready: false,
        reason: "SIMULATION — PDA inspect is live-API only.",
      },
      lastProofPda: null,
    };
  }

  getSelectedAssetId(): string {
    return this.selectedAssetId;
  }

  selectAsset(id: string): void {
    this.selectedAssetId = id;
    this.emit();
  }

  /* -------------------------------- market ------------------------------ */

  getMarket(assetId: string): MarketSnapshot {
    return (
      this.market.get(assetId) ?? {
        assetId,
        executableRatio: null,
        history: [],
        event: null,
      }
    );
  }

  /* -------------------------------- orders ------------------------------ */

  listOrders(): ConversionOrder[] {
    return [...this.orders].sort((a, b) =>
      a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0,
    );
  }

  getOrder(id: string): ConversionOrder | undefined {
    return this.orders.find((o) => o.id === id);
  }

  createOrder(input: CreateOrderInput): ConversionOrder {
    const nowIso = new Date().toISOString();
    const order: ConversionOrder = {
      id: `${ORDER_ID_PREFIX}${this.orderSeq++}`,
      assetId: input.assetId,
      amount: round(input.amount, 2),
      targetRatio: round(input.targetRatio),
      floorRatio: round(input.floorRatio),
      failsafeAt: input.failsafeAt,
      status: "PLACED",
      createdAt: nowIso,
      events: [
        {
          status: "PLACED",
          at: nowIso,
          note: `escrow funded · ${round(input.amount, 2).toFixed(2)} SPACEX`,
        },
      ],
    };
    this.orders = [order, ...this.orders];
    // escrow leaves the wallet
    if (this.walletState.balances) {
      this.walletState = {
        ...this.walletState,
        balances: {
          ...this.walletState.balances,
          SPACEX: round(
            Math.max(0, this.walletState.balances.SPACEX - order.amount),
            2,
          ),
        },
      };
    }
    // arm → watch
    const now = Date.now();
    this.pending.push({
      orderId: order.id,
      at: now + 1_600,
      to: "ARMED",
      note: "policy locked on order account",
    });
    this.pending.push({
      orderId: order.id,
      at: now + 3_400,
      to: "WATCHING",
      note: `keeper watching executable ratio vs ${fmtRatio(order.targetRatio)}`,
    });
    this.emit();
    return order;
  }

  cancelOrder(id: string): void {
    const order = this.orders.find((o) => o.id === id);
    if (!order || !CANCELLABLE.includes(order.status)) return;
    const at = new Date().toISOString();
    const updated: ConversionOrder = {
      ...order,
      status: "CANCELLED",
      events: [
        ...order.events,
        {
          status: "CANCELLED",
          at,
          note: "cancelled by owner · escrow returned (1% fee on return leg)",
        },
      ],
    };
    this.orders = this.orders.map((o) => (o.id === id ? updated : o));
    this.pending = this.pending.filter((p) => p.orderId !== id);
    this.settlements = this.settlements.filter((s) => s.orderId !== id);
    // escrow returns minus the disclosed transfer fee
    if (this.walletState.balances) {
      this.walletState = {
        ...this.walletState,
        balances: {
          ...this.walletState.balances,
          SPACEX: round(
            this.walletState.balances.SPACEX + order.amount * 0.99,
            2,
          ),
        },
      };
    }
    this.emit();
  }

  /* ------------------------------- receipts ----------------------------- */

  listReceipts(): ExecutionReceipt[] {
    return [...this.receipts].sort((a, b) =>
      a.settledAt < b.settledAt ? 1 : a.settledAt > b.settledAt ? -1 : 0,
    );
  }

  getReceipt(id: string): ExecutionReceipt | undefined {
    return this.receipts.find((r) => r.id === id);
  }

  /* -------------------------------- wallet ------------------------------ */

  getWallet(): WalletState {
    return this.walletState;
  }

  async connectWallet(providerId: string): Promise<void> {
    const known = WALLET_PROVIDERS.some((p) => p.id === providerId);
    if (!known) return;
    this.walletState = { ...this.walletState, connecting: true, providerId };
    this.emit();
    await new Promise((r) => setTimeout(r, 900));
    this.walletState = {
      connected: true,
      connecting: false,
      providerId,
      address: DESIGN_WALLET_ADDRESS,
      balances: { ...DESIGN_WALLET_BALANCES, SPCXx: this.currentSpcxxBalance() },
    };
    this.emit();
  }

  disconnectWallet(): void {
    this.walletState = {
      connected: false,
      connecting: false,
      providerId: null,
      address: null,
      balances: null,
    };
    this.emit();
  }

  /* ------------------------------- notices ------------------------------ */

  getNotices(): EngineNotice[] {
    return this.notices;
  }

  /* ----------------------------- reactivity ----------------------------- */

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

  /* ------------------------------- engine ------------------------------- */

  start() {
    if (this.timer) return;
    this.startAt = Date.now();
    this.timer = setInterval(() => this.tick(), TICK_MS);
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  private rnd(): number {
    this.entropy = (this.entropy * 1_664_525 + 1_013_904_223) >>> 0;
    return this.entropy / 4_294_967_296;
  }

  private tick() {
    const now = Date.now();
    this.ticks += 1;
    this.processPending(now);
    if (this.ticks % MARKET_EVERY_TICKS === 0) this.stepMarket(now);
    this.stepOrders(now);
  }

  private stepMarket(now: number) {
    const t = now - this.startAt;
    const m = this.market.get("spacex");
    if (!m || m.executableRatio == null) return;
    let v = m.executableRatio;

    if (t < MARKET_WALK.quiet.untilMs) {
      const q = MARKET_WALK.quiet;
      v += (q.anchor - v) * q.pull + (this.rnd() - 0.5) * q.noise;
    } else if (t < MARKET_WALK.climb.untilMs) {
      if (!this.marketEventFired) {
        this.marketEventFired = true;
        m.event = { ...MARKET_WALK.climb.event };
        this.notices.push({
          id: "market-tranche-unlock",
          kind: "market",
          tone: "lime",
          title: "MARKET · LOCKUP TRANCHE UNLOCKED",
          body: "Sep 24 tranche hit the book — executable ratio climbing.",
        });
        this.emit();
      }
      const c = MARKET_WALK.climb;
      v += (c.anchor - v) * c.pull + (this.rnd() - 0.5) * c.noise;
    } else {
      if (m.event && t > MARKET_WALK.eventClearsAfterMs) m.event = null;
      const s = MARKET_WALK.settle;
      v += (s.anchor - v) * s.pull + (this.rnd() - 0.5) * s.noise;
    }

    v = clamp(v, MARKET_WALK.bounds.min, MARKET_WALK.bounds.max);
    m.executableRatio = round(v);
    m.history.push({ t, v: m.executableRatio });
    if (m.history.length > HISTORY_CAP) m.history.shift();
    this.emit();
  }

  private stepOrders(now: number) {
    const m = this.market.get("spacex");
    const ratio = m?.executableRatio ?? null;
    for (const order of this.orders) {
      if (!OPEN_STATUSES.includes(order.status)) continue;
      const hasPending = this.pending.some((p) => p.orderId === order.id);
      if (hasPending) continue;
      if (ratio != null && ratio >= order.targetRatio && order.status === "WATCHING") {
        this.pending.push({
          orderId: order.id,
          at: now,
          to: "TARGET_REACHED",
          note: `executable ratio ${fmtRatio(ratio)} ≥ target ${fmtRatio(order.targetRatio)}`,
        });
        this.pending.push({
          orderId: order.id,
          at: now + 1_400,
          to: "EXECUTING",
          note: "keeper building atomic fill · Jupiter + program",
        });
        this.settlements.push({ orderId: order.id, at: now + 3_800, path: "TARGET" });
        this.notices.push({
          id: `order-${order.id}-reached`,
          kind: "order",
          tone: "lime",
          title: `${order.id} · TARGET REACHED`,
          body: "Executable ratio crossed your target — converting.",
          orderId: order.id,
        });
        this.emit();
      } else if (order.status === "WATCHING" && now >= Date.parse(order.failsafeAt)) {
        this.pending.push({
          orderId: order.id,
          at: now,
          to: "EXECUTING",
          note: `failsafe reached — attempting at floor ${fmtRatio(order.floorRatio)}`,
        });
        this.settlements.push({ orderId: order.id, at: now + 2_400, path: "FAILSAFE" });
        this.notices.push({
          id: `order-${order.id}-failsafe`,
          kind: "order",
          tone: "amber",
          title: `${order.id} · FAILSAFE REACHED`,
          body: "Your deadline arrived first — attempting at your floor.",
          orderId: order.id,
        });
        this.emit();
      }
    }
  }

  private processPending(now: number) {
    if (this.pending.length === 0 && this.settlements.length === 0) return;
    const due = this.pending.filter((p) => now >= p.at);
    if (due.length > 0) {
      this.pending = this.pending.filter((p) => now < p.at);
      for (const p of due) this.applyTransition(p);
    }
    const settleDue = this.settlements.filter((s) => now >= s.at);
    if (settleDue.length > 0) {
      this.settlements = this.settlements.filter((s) => now < s.at);
      for (const s of settleDue) this.settle(s.orderId, s.path);
    }
  }

  private applyTransition(p: PendingTransition) {
    const order = this.orders.find((o) => o.id === p.orderId);
    if (!order || TERMINAL_STATUSES.includes(order.status)) return;
    const at = new Date().toISOString();
    this.orders = this.orders.map((o) =>
      o.id === order.id
        ? {
            ...o,
            status: p.to,
            events: [...o.events, { status: p.to, at, note: p.note }],
          }
        : o,
    );
    this.emit();
  }

  private settle(orderId: string, path: "TARGET" | "FAILSAFE") {
    const order = this.orders.find((o) => o.id === orderId);
    if (!order || TERMINAL_STATUSES.includes(order.status)) return;
    const base = path === "TARGET" ? order.targetRatio : order.floorRatio;
    const slip = path === "TARGET" ? 0.0024 : 0.0012;
    const executedRatio = round(
      clamp(base + this.rnd() * slip, base, MARKET_WALK.bounds.max),
    );
    const filled = round(order.amount * executedRatio);
    const receiptId = `${RECEIPT_ID_PREFIX}${this.receiptSeq++}`;
    const at = new Date().toISOString();
    const receipt: ExecutionReceipt = {
      id: receiptId,
      orderId: order.id,
      assetId: order.assetId,
      path,
      targetRatio: order.targetRatio,
      floorRatio: order.floorRatio,
      executedRatio,
      size: order.amount,
      filled,
      signature: seededBase58(87, this.entropy + this.receiptSeq * 7919),
      slot: 344_500_000 + Math.floor(this.rnd() * 900_000),
      route: this.rnd() > 0.35 ? "JUPITER · METEORA" : "JUPITER · RAYDIUM",
      feeBps: 100,
      settledAt: at,
      feedHash: seededBase58(8, this.entropy + 31).toLowerCase() +
        "·" +
        seededBase58(8, this.entropy + 17).toLowerCase(),
    };
    this.receipts = [receipt, ...this.receipts];
    this.orders = this.orders.map((o) =>
      o.id === order.id
        ? {
            ...o,
            status: "SETTLED",
            fillPath: path,
            executedRatio,
            filledAmount: filled,
            receiptId,
            events: [
              ...o.events,
              {
                status: "SETTLED" as OrderStatus,
                at,
                note: `${filled.toFixed(4)} SPCXx delivered at ${fmtRatio(executedRatio)}`,
              },
            ],
          }
        : o,
    );
    if (this.walletState.balances) {
      this.walletState = {
        ...this.walletState,
        balances: {
          ...this.walletState.balances,
          SPCXx: round(this.walletState.balances.SPCXx + filled, 4),
        },
      };
    }
    this.notices.push({
      id: `order-${order.id}-settled`,
      kind: "order",
      tone: "lime",
      title: `${order.id} · SETTLED`,
      body: `${filled.toFixed(4)} SPCXx delivered at ${fmtRatio(executedRatio)} — receipt ready.`,
      orderId: order.id,
      receiptId,
    });
    this.emit();
  }

  private currentSpcxxBalance(): number {
    // wallet reconnects with whatever the session has settled so far
    let bal = DESIGN_WALLET_BALANCES.SPCXx;
    for (const r of this.receipts) {
      if (r.orderId === "TM-2477" || r.orderId === "TM-2406") {
        bal = round(bal + r.filled, 4);
      }
    }
    return bal;
  }
}

export function createLocalDesignSource(): TMinusSource {
  return new LocalDesignSource();
}
