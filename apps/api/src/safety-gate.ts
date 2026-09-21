export const SAFETY_REFUSALS = [
  "EXPIRED",
  "TERMS_PENDING",
  "BELOW_FLOOR",
  "STALE",
  "MINT_UNSUPPORTED",
  "FEE_CHANGED",
  "PAUSED",
  "HOOK_PRESENT",
  "DESTINATION_UNVERIFIED",
  "NO_ROUTE",
  "JUPITER_REJECTED",
  "RPC_UNAVAILABLE",
  "USER_WALLET_REQUIRED",
  "WALLET_MISMATCH",
  "EVIDENCE_MISSING",
  "AMOUNT_INVALID",
] as const;

export type SafetyRefusal = (typeof SAFETY_REFUSALS)[number];

export type LifecycleStage = "CONVERSION_WINDOW" | "TERMS_PENDING" | "EXPIRED" | "CONVERTED";

export type SafetyInput = {
  stage: LifecycleStage;
  forSigning: boolean;
  nowMs: number;
  deadlineMs: number | null;
  evidencePresent: boolean;
  quoteFetchedAtMs: number | null;
  quoteStaleMs: number;
  mintPaused: boolean | null;
  hookProgramId: string | null;
  tokenProgram: string | null;
  rpcOk: boolean;
  feeBpsObserved: number | null;
  feeBpsBaseline: number | null;
  destinationVerified: boolean;
  routeOk: boolean;
  jupiterError: string | null;
  executableRatio: number | null;
  floorRatio: number | null;
  amountRaw: string | null;
  taker: string | null;
  txTaker: string | null;
  transferFeeModeled: boolean;
};

export type SafetyReport = {
  allowed: boolean;
  refusals: SafetyRefusal[];
};

const TOKEN_PROGRAMS = new Set([
  "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb",
  "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
]);

export function evaluateSafety(input: SafetyInput): SafetyReport {
  const refusals: SafetyRefusal[] = [];

  if (input.stage === "EXPIRED" || input.stage === "CONVERTED") refusals.push("EXPIRED");
  if (input.stage === "TERMS_PENDING") refusals.push("TERMS_PENDING");
  if (input.deadlineMs != null && input.nowMs >= input.deadlineMs && !refusals.includes("EXPIRED")) {
    refusals.push("EXPIRED");
  }
  if (!input.evidencePresent) refusals.push("EVIDENCE_MISSING");
  if (!input.destinationVerified) refusals.push("DESTINATION_UNVERIFIED");

  const lifecycleBlocked =
    refusals.includes("EXPIRED") ||
    refusals.includes("TERMS_PENDING") ||
    refusals.includes("DESTINATION_UNVERIFIED") ||
    refusals.includes("EVIDENCE_MISSING");

  if (input.forSigning && !lifecycleBlocked) {
    if (!input.rpcOk) refusals.push("RPC_UNAVAILABLE");
    if (input.mintPaused === true) refusals.push("PAUSED");
    if (input.hookProgramId) refusals.push("HOOK_PRESENT");
    if (input.tokenProgram && !TOKEN_PROGRAMS.has(input.tokenProgram)) {
      refusals.push("MINT_UNSUPPORTED");
    }
    if (
      input.feeBpsBaseline != null &&
      input.feeBpsObserved != null &&
      input.feeBpsBaseline !== input.feeBpsObserved
    ) {
      refusals.push("FEE_CHANGED");
    }
    if (!input.transferFeeModeled && input.feeBpsObserved != null && input.feeBpsObserved > 0) {
      refusals.push("MINT_UNSUPPORTED");
    }
    if (input.quoteFetchedAtMs == null) {
      if (!input.jupiterError) refusals.push("NO_ROUTE");
    } else if (input.nowMs - input.quoteFetchedAtMs > input.quoteStaleMs) {
      refusals.push("STALE");
    }
    if (input.jupiterError) refusals.push("JUPITER_REJECTED");
    if (!input.routeOk) refusals.push("NO_ROUTE");
    if (!input.taker) refusals.push("USER_WALLET_REQUIRED");
    if (input.taker && input.txTaker && input.taker !== input.txTaker) {
      refusals.push("WALLET_MISMATCH");
    }
    if (!input.amountRaw || !/^[1-9][0-9]*$/.test(input.amountRaw)) {
      refusals.push("AMOUNT_INVALID");
    }
    if (
      input.floorRatio != null &&
      Number.isFinite(input.floorRatio) &&
      (input.executableRatio == null || input.executableRatio < input.floorRatio)
    ) {
      refusals.push("BELOW_FLOOR");
    }
  }

  const unique = [...new Set(refusals)];
  return { allowed: unique.length === 0, refusals: unique };
}
