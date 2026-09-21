export type CatalogStage = "CONVERSION_WINDOW" | "TERMS_PENDING" | "EXPIRED" | "CONVERTED";
export type ExecutionAvailability = "AVAILABLE" | "LIMITED" | "HALTED" | "UNKNOWN";
export type VerificationState = "verified" | "stale" | "unknown" | "unverified";

export function assetIdFromSymbol(symbol: string): string {
  return symbol.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

export function isPrestocksMint(mint: string): boolean {
  return mint.startsWith("Pre");
}

export function classifyStage(opts: {
  deadline: string | null;
  eventType: string | null;
  now?: Date;
}): CatalogStage {
  const now = opts.now ?? new Date();
  if (opts.deadline) {
    const t = Date.parse(opts.deadline);
    if (!Number.isNaN(t) && t <= now.getTime()) return "EXPIRED";
  }
  const event = opts.eventType ?? "";
  if (
    event === "prestock_conversion_deadline" ||
    event === "prestock_expiry_warning"
  ) {
    return "CONVERSION_WINDOW";
  }
  if (opts.deadline) return "CONVERSION_WINDOW";
  return "TERMS_PENDING";
}

export function classifyExecution(stage: CatalogStage, hasQuote: boolean): ExecutionAvailability {
  if (stage === "EXPIRED" || stage === "CONVERTED") return "HALTED";
  if (stage === "CONVERSION_WINDOW" && hasQuote) return "AVAILABLE";
  if (stage === "CONVERSION_WINDOW") return "LIMITED";
  if (stage === "TERMS_PENDING") return "LIMITED";
  return "UNKNOWN";
}
