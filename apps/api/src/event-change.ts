import type { IssuerInstruction } from "./issuer-instruction.ts";
import { sql } from "./db.ts";
import {
  eventFromInstruction,
  fingerprintActionable,
  fingerprintStatement,
  type ActionableEvent,
} from "./event-fingerprint.ts";

export const CHANGE_KINDS = [
  "NO_CHANGE",
  "TEXT_CHANGED_NON_ACTIONABLE",
  "ACTION_CHANGED",
  "DEADLINE_CHANGED",
  "DESTINATION_CHANGED",
  "RATIO_CHANGED",
  "STATE_CHANGED",
  "SOURCE_UNAVAILABLE",
  "PARSE_CHANGED",
] as const;

export type ChangeKind = (typeof CHANGE_KINDS)[number];

export type IssuerChangeReport = {
  kinds: ChangeKind[];
  primary: ChangeKind;
  actionable: boolean;
  fingerprint: string;
  statementHash: string;
  previousFingerprint: string | null;
};

const ACTIONABLE_KINDS = new Set<ChangeKind>([
  "ACTION_CHANGED",
  "DEADLINE_CHANGED",
  "DESTINATION_CHANGED",
  "RATIO_CHANGED",
  "STATE_CHANGED",
  "SOURCE_UNAVAILABLE",
  "PARSE_CHANGED",
]);

export function isActionableChange(kind: ChangeKind): boolean {
  return ACTIONABLE_KINDS.has(kind);
}

export function classifyIssuerChange(opts: {
  previous: ActionableEvent | null;
  current: ActionableEvent | null;
  previousStatementHash?: string | null;
  currentStatement?: string | null;
  sourceOk: boolean;
}): IssuerChangeReport {
  const current = opts.current;
  const fingerprint = current ? fingerprintActionable(current) : sha256Unavailable(opts.previous);
  const statementHash = fingerprintStatement(opts.currentStatement ?? null);
  const previousFingerprint = opts.previous ? fingerprintActionable(opts.previous) : null;

  if (!opts.sourceOk || !current) {
    return {
      kinds: ["SOURCE_UNAVAILABLE"],
      primary: "SOURCE_UNAVAILABLE",
      actionable: true,
      fingerprint,
      statementHash,
      previousFingerprint,
    };
  }

  if (!opts.previous) {
    return {
      kinds: ["NO_CHANGE"],
      primary: "NO_CHANGE",
      actionable: false,
      fingerprint,
      statementHash,
      previousFingerprint: null,
    };
  }

  const kinds: ChangeKind[] = [];
  const prev = opts.previous;

  if (prev.actionType !== current.actionType) {
    kinds.push("ACTION_CHANGED");
    if (prev.actionType === "NONE" || current.actionType === "NONE") kinds.push("PARSE_CHANGED");
  }
  if (
    prev.gonePublic !== current.gonePublic ||
    prev.acquired !== current.acquired ||
    prev.expireWorthless !== current.expireWorthless
  ) {
    kinds.push("STATE_CHANGED");
  }
  if ((prev.deadlineIso ?? "") !== (current.deadlineIso ?? "")) kinds.push("DEADLINE_CHANGED");
  if (
    (prev.destinationTicker ?? "").toUpperCase() !== (current.destinationTicker ?? "").toUpperCase() ||
    prev.destinationAllowsAny !== current.destinationAllowsAny
  ) {
    kinds.push("DESTINATION_CHANGED");
  }
  if (prev.statedRatio !== current.statedRatio) kinds.push("RATIO_CHANGED");

  if (kinds.length === 0) {
    if (opts.previousStatementHash && opts.previousStatementHash !== statementHash) {
      return {
        kinds: ["TEXT_CHANGED_NON_ACTIONABLE"],
        primary: "TEXT_CHANGED_NON_ACTIONABLE",
        actionable: false,
        fingerprint,
        statementHash,
        previousFingerprint,
      };
    }
    return {
      kinds: ["NO_CHANGE"],
      primary: "NO_CHANGE",
      actionable: false,
      fingerprint,
      statementHash,
      previousFingerprint,
    };
  }

  const unique = [...new Set(kinds)];
  return {
    kinds: unique,
    primary: unique[0] ?? "ACTION_CHANGED",
    actionable: unique.some(isActionableChange),
    fingerprint,
    statementHash,
    previousFingerprint,
  };
}

function sha256Unavailable(previous: ActionableEvent | null): string {
  return previous ? fingerprintActionable(previous) : fingerprintStatement("source_unavailable");
}

export type PersistedIssuerEvent = {
  assetId: string;
  fingerprint: string;
  statementHash: string;
  kind: ChangeKind;
  kinds: ChangeKind[];
  actionable: boolean;
  previousFingerprint: string | null;
  previousEvent: ActionableEvent | null;
  currentEvent: ActionableEvent | null;
  sourceUrl: string;
  sourceFetchedAt: string;
  detectedAt: string;
};

export async function loadLatestIssuerEvent(assetId: string): Promise<PersistedIssuerEvent | null> {
  try {
    const rows = await sql`
      select asset_id, fingerprint, statement_hash, kind, previous_fingerprint,
             previous_event, current_event, source_url, source_fetched_at, detected_at
      from issuer_event_snapshots
      where asset_id = ${assetId}
      order by id desc
      limit 1
    `;
    const row = rows[0];
    if (!row) return null;
    return mapRow(row);
  } catch {
    return null;
  }
}

export async function loadIssuerEventHistory(assetId: string, limit = 12): Promise<PersistedIssuerEvent[]> {
  try {
    const rows = await sql`
      select asset_id, fingerprint, statement_hash, kind, previous_fingerprint,
             previous_event, current_event, source_url, source_fetched_at, detected_at
      from issuer_event_snapshots
      where asset_id = ${assetId}
      order by id desc
      limit ${limit}
    `;
    return rows.map(mapRow).filter((r) => r.kind !== "NO_CHANGE" || r.previousFingerprint != null);
  } catch {
    return [];
  }
}

export async function observeIssuerEvent(opts: {
  assetId: string;
  instruction: IssuerInstruction;
  sourceUrl: string;
  fetchedAt: string;
  sourceOk: boolean;
}): Promise<PersistedIssuerEvent> {
  const current = opts.sourceOk ? eventFromInstruction(opts.instruction, opts.sourceUrl) : null;
  const previousRow = await loadLatestIssuerEvent(opts.assetId);
  const previous = previousRow?.currentEvent ?? null;
  const report = classifyIssuerChange({
    previous,
    current,
    previousStatementHash: previousRow?.statementHash ?? null,
    currentStatement: opts.instruction.statement,
    sourceOk: opts.sourceOk,
  });
  const detectedAt = new Date().toISOString();
  const persisted: PersistedIssuerEvent = {
    assetId: opts.assetId,
    fingerprint: report.fingerprint,
    statementHash: report.statementHash,
    kind: report.primary,
    kinds: report.kinds,
    actionable: report.actionable,
    previousFingerprint: report.previousFingerprint,
    previousEvent: previous,
    currentEvent: current,
    sourceUrl: opts.sourceUrl,
    sourceFetchedAt: opts.fetchedAt,
    detectedAt,
  };

  const shouldWrite =
    !previousRow ||
    report.primary !== "NO_CHANGE" ||
    previousRow.fingerprint !== report.fingerprint;

  if (shouldWrite) {
    try {
      await sql`
        insert into issuer_event_snapshots (
          asset_id, fingerprint, statement_hash, kind, previous_fingerprint,
          previous_event, current_event, source_url, source_fetched_at, detected_at
        ) values (
          ${opts.assetId},
          ${report.fingerprint},
          ${report.statementHash},
          ${report.primary},
          ${report.previousFingerprint},
          ${sql.json((previous ?? null) as never)},
          ${sql.json((current ?? { sourceUrl: opts.sourceUrl, actionType: "NONE" }) as never)},
          ${opts.sourceUrl},
          ${opts.fetchedAt},
          ${detectedAt}
        )
      `;
    } catch {
      /* listing must still work if the table is not migrated yet */
    }
    return persisted;
  }

  return previousRow;
}

function mapRow(row: Record<string, unknown>): PersistedIssuerEvent {
  const kind = (typeof row.kind === "string" ? row.kind : "NO_CHANGE") as ChangeKind;
  return {
    assetId: String(row.asset_id ?? ""),
    fingerprint: String(row.fingerprint ?? ""),
    statementHash: String(row.statement_hash ?? ""),
    kind,
    kinds: [kind],
    actionable: isActionableChange(kind),
    previousFingerprint: typeof row.previous_fingerprint === "string" ? row.previous_fingerprint : null,
    previousEvent: (row.previous_event as ActionableEvent | null) ?? null,
    currentEvent: (row.current_event as ActionableEvent | null) ?? null,
    sourceUrl: String(row.source_url ?? ""),
    sourceFetchedAt: iso(row.source_fetched_at),
    detectedAt: iso(row.detected_at),
  };
}

function iso(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") return value;
  return new Date().toISOString();
}
