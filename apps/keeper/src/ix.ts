import { createHash } from "node:crypto";
import {
  PublicKey,
  TransactionInstruction,
  type AccountMeta,
} from "@solana/web3.js";
import { TOKEN_2022_PROGRAM_ID } from "@solana/spl-token";
import type { DecodedOrder } from "@tminus/sdk";

function disc(name: string): Buffer {
  return createHash("sha256").update(`global:${name}`).digest().subarray(0, 8);
}

function u64le(n: bigint): Buffer {
  const b = Buffer.alloc(8);
  b.writeBigUInt64LE(n);
  return b;
}

function meta(pubkey: PublicKey, isSigner: boolean, isWritable: boolean): AccountMeta {
  return { pubkey, isSigner, isWritable };
}

export function fillIx(args: {
  programId: PublicKey;
  filler: PublicKey;
  owner: PublicKey;
  order: PublicKey;
  srcMint: PublicKey;
  dstMint: PublicKey;
  escrowAta: PublicKey;
  ownerDstAta: PublicKey;
  fillerSrcAta: PublicKey;
  fillerDstAta: PublicKey;
  fillSrcRaw: bigint;
  dstRaw: bigint;
  srcTokenProgram?: PublicKey;
  dstTokenProgram?: PublicKey;
}): TransactionInstruction {
  const srcProg = args.srcTokenProgram ?? TOKEN_2022_PROGRAM_ID;
  const dstProg = args.dstTokenProgram ?? TOKEN_2022_PROGRAM_ID;
  const data = Buffer.concat([disc("fill"), u64le(args.fillSrcRaw), u64le(args.dstRaw)]);
  return new TransactionInstruction({
    programId: args.programId,
    data,
    keys: [
      meta(args.filler, true, true),
      meta(args.owner, false, true),
      meta(args.order, false, true),
      meta(args.srcMint, false, true),
      meta(args.dstMint, false, true),
      meta(args.escrowAta, false, true),
      meta(args.ownerDstAta, false, true),
      meta(args.fillerSrcAta, false, true),
      meta(args.fillerDstAta, false, true),
      meta(srcProg, false, false),
      meta(dstProg, false, false),
    ],
  });
}

export function remainingRaw(order: DecodedOrder): bigint {
  return order.escrowedRaw - order.filledRaw;
}
