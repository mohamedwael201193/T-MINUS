import { PublicKey } from "@solana/web3.js";
import { orderPda, PROGRAM_ID } from "@tminus/sdk";

const B58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

export type DerivedOrderPda = {
  programId: string;
  pda: string;
  bump: number;
  nonce: string;
  owner: string;
  srcMint: string;
  dstMint: string;
  seeds: ["order", string, string, string, "nonce_le"];
};

export type DeriveError = { error: "invalid_pubkey" | "invalid_nonce" };

function parseKey(value: string): PublicKey | null {
  if (!B58.test(value)) return null;
  try {
    return new PublicKey(value);
  } catch {
    return null;
  }
}

export function deriveOrderPda(params: {
  owner: string;
  src: string;
  dst: string;
  nonce: string;
  programId?: string;
}): DerivedOrderPda | DeriveError {
  const owner = parseKey(params.owner);
  const src = parseKey(params.src);
  const dst = parseKey(params.dst);
  if (!owner || !src || !dst) return { error: "invalid_pubkey" };
  if (!/^[0-9]{1,20}$/.test(params.nonce)) return { error: "invalid_nonce" };
  let nonce: bigint;
  try {
    nonce = BigInt(params.nonce);
  } catch {
    return { error: "invalid_nonce" };
  }
  if (nonce < 0n || nonce > 0xffffffffffffffffn) return { error: "invalid_nonce" };
  const programId = params.programId && parseKey(params.programId) ? params.programId : PROGRAM_ID;
  const [pda, bump] = orderPda(owner, src, dst, nonce, new PublicKey(programId));
  return {
    programId,
    pda: pda.toBase58(),
    bump,
    nonce: nonce.toString(),
    owner: owner.toBase58(),
    srcMint: src.toBase58(),
    dstMint: dst.toBase58(),
    seeds: ["order", owner.toBase58(), src.toBase58(), dst.toBase58(), "nonce_le"],
  };
}
