import { buildPrestocksCatalog, type CatalogAsset } from "./prestocks-catalog.ts";
import { latestFeed } from "./feed.ts";
import {
  emptyIssuerInstruction,
  resolveDestination,
  displayRawForMint,
  type ActionType,
  type IssuerInstruction,
  type KnownDestination,
} from "./issuer-instruction.ts";
import { parseFeedIssuerPowers, readMintState, type OnchainMintState } from "./onchain-mint.ts";
import type { CatalogStage } from "./lifecycle-classify.ts";

export type SettlementKind = "TRADE" | "NONE";

export type TruthLayer = {
  issuer: {
    statement: string | null;
    deadline: string | null;
    destinationTicker: string | null;
    statedRatio: number | null;
    allowsAnyToken: boolean;
    actionType: ActionType;
    sourceUrl: string | null;
    sourceHash: string | null;
    fetchedAt: string | null;
  };
  onchain: OnchainMintState;
  market: {
    tokenPrice: number | null;
    markPrice: number | null;
    holders: number | null;
  };
  jupiter: {
    available: boolean | null;
    inAmount: string | null;
    outAmount: string | null;
    router: string | null;
    fetchedAt: string | null;
    error: string | null;
  };
  tminus: {
    allowSign: boolean;
    refusals: string[];
    settlementKind: SettlementKind;
  };
};

export type CorporateAction = {
  network: "MAINNET";
  assetId: string;
  symbol: string;
  name: string;
  sourceMint: string;
  inOfficialCatalog: boolean;
  stage: CatalogStage;
  actionType: ActionType;
  settlementKind: SettlementKind;
  issuer: IssuerInstruction;
  destination: KnownDestination | null;
  destinationVerified: boolean;
  deadline: string | null;
  stageNote: string;
  transferFeeBps: number | null;
  sourceDisplayRaw: number | null;
  onchain: OnchainMintState;
  market: TruthLayer["market"];
  evidence: {
    issuerPageUrl: string | null;
    sourceUrl: string;
    sourceHash: string | null;
    fetchedAt: string;
    catalogApi: "https://prestocks.com/api/prestocks";
    metricsApi: "https://prestocks.com/api/metrics";
  };
  truth: TruthLayer;
  fetchedAt: string;
};

export type ActionsList = {
  network: "MAINNET";
  layer: "corporate_action";
  fetchedAt: string;
  actions: CorporateAction[];
};

function instructionFromAsset(asset: CatalogAsset): IssuerInstruction {
  const base = emptyIssuerInstruction();
  return {
    ...base,
    actionType: asset.actionType,
    statement: asset.issuerStatement,
    deadlineIso: asset.deadline,
    destinationTicker: asset.destinationSymbol,
    destinationAllowsAny: asset.destinationAllowsAny,
    statedRatio: asset.statedRatio,
    expireWorthless: /expire worthless/i.test(asset.issuerStatement ?? "") || asset.stage === "EXPIRED",
    gonePublic: asset.actionType === "GOING_PUBLIC",
    acquired: asset.actionType === "ACQUISITION",
  };
}

function destinationOf(asset: CatalogAsset): KnownDestination | null {
  return (
    resolveDestination(asset.destinationSymbol) ??
    (asset.destinationMint === "Xs3oZwbHvqis4NYcf4YKWmEia2eC84wSiVrcYcTqpH8"
      ? resolveDestination("SPCXX")
      : asset.destinationMint === "PreANxuXjsy2pvisWWMNB6YaJNzr7681wJJr2rHsfTh" && asset.id !== "spacex"
        ? resolveDestination("SPACEX")
        : null)
  );
}

function noteFor(asset: CatalogAsset, instruction: IssuerInstruction, dest: KnownDestination | null): string {
  if (asset.stage === "EXPIRED" && instruction.statedRatio && dest) {
    return `Issuer conversion deadline ${asset.deadline} has passed. Stated instruction was ${instruction.statedRatio} ${dest.symbol} per ${asset.symbol}. T-MINUS will not request a signature. On-chain burn/freeze is not assumed.`;
  }
  if (asset.stage === "EXPIRED" && asset.deadline) {
    return `Issuer conversion deadline ${asset.deadline} has passed. Execution is halted. On-chain burn/freeze is not assumed.`;
  }
  if (asset.stage === "CONVERSION_WINDOW" && dest) {
    const any = instruction.destinationAllowsAny
      ? " Issuer also allows any other token; the desk defaults to the named destination."
      : "";
    return `Issuer conversion window is open until ${asset.deadline}. Default destination is ${dest.symbol}. Settlement is a TRADE through Jupiter, not an automatic rollover.${any}`;
  }
  return asset.stageNote;
}

function listRefusals(asset: CatalogAsset, destinationVerified: boolean): string[] {
  if (asset.stage === "EXPIRED" || asset.stage === "CONVERTED") return ["EXPIRED"];
  if (asset.stage === "TERMS_PENDING") return ["TERMS_PENDING"];
  if (!destinationVerified) return ["DESTINATION_UNVERIFIED"];
  return [];
}

function toAction(asset: CatalogAsset, onchain: OnchainMintState): CorporateAction {
  const instruction = instructionFromAsset(asset);
  const dest = destinationOf(asset);
  const destinationVerified = Boolean(dest && (!asset.destinationMint || asset.destinationMint === dest.mint));
  const settlementKind: SettlementKind = dest && asset.stage === "CONVERSION_WINDOW" ? "TRADE" : "NONE";
  const refusals = listRefusals(asset, destinationVerified);
  const truth: TruthLayer = {
    issuer: {
      statement: instruction.statement,
      deadline: asset.deadline,
      destinationTicker: dest?.symbol ?? instruction.destinationTicker,
      statedRatio: instruction.statedRatio,
      allowsAnyToken: instruction.destinationAllowsAny,
      actionType: instruction.actionType,
      sourceUrl: asset.issuerPageUrl ?? asset.sourceUrl,
      sourceHash: asset.sourceHash,
      fetchedAt: asset.fetchedAt,
    },
    onchain,
    market: {
      tokenPrice: asset.tokenPrice,
      markPrice: asset.markPrice,
      holders: asset.holders,
    },
    jupiter: {
      available: null,
      inAmount: null,
      outAmount: null,
      router: null,
      fetchedAt: null,
      error: null,
    },
    tminus: {
      allowSign: false,
      refusals,
      settlementKind,
    },
  };

  return {
    network: "MAINNET",
    assetId: asset.id,
    symbol: asset.symbol,
    name: asset.name,
    sourceMint: asset.mint,
    inOfficialCatalog: asset.inOfficialCatalog,
    stage: asset.stage,
    actionType: instruction.actionType,
    settlementKind,
    issuer: instruction,
    destination: dest,
    destinationVerified,
    deadline: asset.deadline,
    stageNote: noteFor(asset, instruction, dest),
    transferFeeBps: onchain.transferFeeBps ?? asset.transferFeeBps,
    sourceDisplayRaw: displayRawForMint(asset.mint),
    onchain,
    market: truth.market,
    evidence: {
      issuerPageUrl: asset.issuerPageUrl,
      sourceUrl: asset.sourceUrl,
      sourceHash: asset.sourceHash,
      fetchedAt: asset.fetchedAt,
      catalogApi: "https://prestocks.com/api/prestocks",
      metricsApi: "https://prestocks.com/api/metrics",
    },
    truth,
    fetchedAt: asset.fetchedAt,
  };
}

function pendingMint(asset: CatalogAsset): OnchainMintState {
  return {
    mint: asset.mint,
    tokenProgram: null,
    decimals: null,
    paused: null,
    hookProgramId: null,
    transferFeeBps: asset.transferFeeBps,
    freezeAuthority: null,
    mintAuthority: null,
    permanentDelegate: null,
    scaledMultiplier: null,
    fetchedAt: null,
    rpcOk: false,
    error: "not_fetched_terms_pending",
  };
}

export async function listCorporateActions(opts?: { force?: boolean }): Promise<ActionsList> {
  const feed = await latestFeed();
  const catalog = await buildPrestocksCatalog({ spacexFeed: feed, force: opts?.force });
  const spacexOnchain = parseFeedIssuerPowers(
    "PreANxuXjsy2pvisWWMNB6YaJNzr7681wJJr2rHsfTh",
    feed?.issuer_powers,
  );
  const actions: CorporateAction[] = [];
  for (const asset of catalog.assets) {
    let onchain: OnchainMintState;
    if (asset.id === "spacex" && spacexOnchain) onchain = spacexOnchain;
    else if (asset.stage === "CONVERSION_WINDOW" || asset.stage === "EXPIRED") {
      onchain = await readMintState(asset.mint);
    } else {
      onchain = pendingMint(asset);
    }
    actions.push(toAction(asset, onchain));
  }
  return {
    network: "MAINNET",
    layer: "corporate_action",
    fetchedAt: catalog.fetchedAt,
    actions,
  };
}

export async function getCorporateAction(assetId: string): Promise<CorporateAction | null> {
  const list = await listCorporateActions();
  return list.actions.find((a) => a.assetId === assetId) ?? null;
}

export function actionEvidence(action: CorporateAction) {
  return {
    network: "MAINNET" as const,
    assetId: action.assetId,
    evidence: action.evidence,
    issuer: action.truth.issuer,
    onchain: action.onchain,
    market: action.market,
  };
}

export function actionStatus(action: CorporateAction) {
  return {
    network: "MAINNET" as const,
    assetId: action.assetId,
    symbol: action.symbol,
    stage: action.stage,
    actionType: action.actionType,
    settlementKind: action.settlementKind,
    deadline: action.deadline,
    destination: action.destination
      ? { symbol: action.destination.symbol, mint: action.destination.mint, verified: action.destinationVerified }
      : null,
    allowSign: action.truth.tminus.allowSign,
    refusals: action.truth.tminus.refusals,
    inOfficialCatalog: action.inOfficialCatalog,
  };
}
