import { createHash } from "node:crypto";
import type { ActionType, IssuerInstruction } from "./issuer-instruction.ts";

/** Actionable issuer fields only — page chrome is ignored. */
export type ActionableEvent = {
  sourceUrl: string;
  actionType: ActionType;
  deadlineIso: string | null;
  destinationTicker: string | null;
  statedRatio: number | null;
  destinationAllowsAny: boolean;
  expireWorthless: boolean;
  gonePublic: boolean;
  acquired: boolean;
};

export function sha256Hex(input: string): string {
  return createHash("sha256").update(input, "utf8").digest("hex");
}

export function normalizeStatement(statement: string | null | undefined): string {
  return (statement ?? "").replace(/\s+/g, " ").trim().toLowerCase();
}

export function eventFromInstruction(
  instruction: IssuerInstruction,
  sourceUrl: string,
): ActionableEvent {
  return {
    sourceUrl: sourceUrl.trim(),
    actionType: instruction.actionType,
    deadlineIso: instruction.deadlineIso,
    destinationTicker: instruction.destinationTicker,
    statedRatio: instruction.statedRatio,
    destinationAllowsAny: instruction.destinationAllowsAny,
    expireWorthless: instruction.expireWorthless,
    gonePublic: instruction.gonePublic,
    acquired: instruction.acquired,
  };
}

export function fingerprintActionable(event: ActionableEvent): string {
  const payload = [
    event.sourceUrl.trim().toLowerCase(),
    event.actionType,
    event.deadlineIso ?? "",
    (event.destinationTicker ?? "").toUpperCase(),
    event.statedRatio == null ? "" : String(event.statedRatio),
    event.destinationAllowsAny ? "1" : "0",
    event.expireWorthless ? "1" : "0",
    event.gonePublic ? "1" : "0",
    event.acquired ? "1" : "0",
  ].join("|");
  return sha256Hex(payload);
}

export function fingerprintStatement(statement: string | null | undefined): string {
  return sha256Hex(normalizeStatement(statement));
}
