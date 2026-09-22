export type ExecutionSnapshot = {
  actionFingerprint: string;
  quoteFetchedAt: string | null;
  taker: string | null;
  amountRaw: string | null;
  destinationMint: string | null;
  paused: boolean | null;
  hookProgramId: string | null;
  transferFeeBps: number | null;
};

export type SnapshotMismatch = "ACTION_CHANGED_REVERIFY_REQUIRED" | "EXECUTION_SNAPSHOT_STALE";

export function compareExecutionSnapshot(
  bound: ExecutionSnapshot | null | undefined,
  live: ExecutionSnapshot,
): { ok: boolean; refusal: SnapshotMismatch | null } {
  if (!bound || !bound.actionFingerprint) {
    return { ok: false, refusal: "EXECUTION_SNAPSHOT_STALE" };
  }
  if (bound.actionFingerprint !== live.actionFingerprint) {
    return { ok: false, refusal: "ACTION_CHANGED_REVERIFY_REQUIRED" };
  }
  if (
    (bound.taker ?? null) !== (live.taker ?? null) ||
    (bound.amountRaw ?? null) !== (live.amountRaw ?? null) ||
    (bound.destinationMint ?? null) !== (live.destinationMint ?? null) ||
    (bound.paused ?? null) !== (live.paused ?? null) ||
    (bound.hookProgramId ?? null) !== (live.hookProgramId ?? null) ||
    (bound.transferFeeBps ?? null) !== (live.transferFeeBps ?? null)
  ) {
    return { ok: false, refusal: "EXECUTION_SNAPSHOT_STALE" };
  }
  return { ok: true, refusal: null };
}

export function readExecutionSnapshot(raw: unknown): ExecutionSnapshot | null {
  if (!raw || typeof raw !== "object") return null;
  const rec = raw as Record<string, unknown>;
  if (typeof rec.actionFingerprint !== "string" || !rec.actionFingerprint) return null;
  return {
    actionFingerprint: rec.actionFingerprint,
    quoteFetchedAt: typeof rec.quoteFetchedAt === "string" ? rec.quoteFetchedAt : null,
    taker: typeof rec.taker === "string" ? rec.taker : null,
    amountRaw: typeof rec.amountRaw === "string" ? rec.amountRaw : null,
    destinationMint: typeof rec.destinationMint === "string" ? rec.destinationMint : null,
    paused: typeof rec.paused === "boolean" ? rec.paused : rec.paused === null ? null : null,
    hookProgramId: typeof rec.hookProgramId === "string" ? rec.hookProgramId : null,
    transferFeeBps: typeof rec.transferFeeBps === "number" ? rec.transferFeeBps : rec.transferFeeBps === null ? null : null,
  };
}
