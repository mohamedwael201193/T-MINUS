"use client";

import { useTMinus, useTMinusVersion } from "@/lib/tminus/adapters/context";
import { Label, Panel } from "@/components/tminus/system/primitives";
import { truncMid } from "@/lib/tminus/utils";

/**
 * Live program + PDA inspect. Never implies a MAINNET place.
 */
export function ProtocolPanel() {
  useTMinusVersion();
  const src = useTMinus();
  const env = src.getEnvironment();
  const inspect = typeof src.getProtocolInspect === "function" ? src.getProtocolInspect() : null;
  if (!inspect) return null;

  const derived = inspect.derivedPda;
  const proof = inspect.lastProofPda;

  return (
    <Panel tone="paper" as="section" aria-label="Protocol inspect" className="mt-8 overflow-hidden">
      <div className="border-b-2 border-ink/10 px-5 py-3 md:px-6">
        <Label>Protocol</Label>
        <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.12em] text-fog">
          Inspect only · no place is sent from this panel
        </p>
      </div>
      <div className="space-y-3 px-5 py-4 font-mono text-[10.5px] uppercase tracking-[0.08em] text-ink md:px-6">
        <Row label="Program" value={truncMid(env.programId, 8, 6)} />
        <Row
          label="Mainnet"
          value={inspect.mainnet.executable ? "Executable" : "Absent"}
          href={inspect.mainnet.explorer}
          tone={inspect.mainnet.executable ? "ok" : "halt"}
        />
        <Row
          label="Devnet"
          value={
            inspect.devnet.executable
              ? `Executable · ${inspect.devnet.dataLen}B loader acct`
              : "Absent"
          }
          href={inspect.devnet.explorer}
          tone={inspect.devnet.executable ? "ok" : "halt"}
        />
        <Row
          label="Keeper send"
          value={inspect.keeperSendEnabled ? "Enabled" : "Off"}
          tone={inspect.keeperSendEnabled ? "warn" : "ok"}
        />
        <Row
          label="Derived PDA"
          value={
            derived.ready && derived.pda
              ? `${truncMid(derived.pda, 8, 6)} · nonce ${derived.nonce} · ${derived.account ?? "unchecked"}`
              : derived.reason
          }
          href={derived.explorer}
        />
        {proof ? (
          <Row
            label="Last proof PDA"
            value={`${truncMid(proof.pda, 8, 6)} · ${proof.account} · ${proof.note}`}
            href={proof.explorer}
          />
        ) : null}
      </div>
    </Panel>
  );
}

function Row({
  label,
  value,
  href,
  tone,
}: {
  label: string;
  value: string;
  href?: string;
  tone?: "ok" | "halt" | "warn";
}) {
  const color =
    tone === "ok" ? "text-ink" : tone === "halt" ? "text-coral-ink" : tone === "warn" ? "text-ink" : "text-ink";
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
      <span className="text-fog">{label}</span>
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          className={`break-all underline decoration-ink/30 underline-offset-4 hover:decoration-ink ${color}`}
        >
          {value} →
        </a>
      ) : (
        <span className={`break-all ${color}`}>{value}</span>
      )}
    </div>
  );
}
