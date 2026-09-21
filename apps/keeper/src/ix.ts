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

function i64le(n: bigint): Buffer {
  const b = Buffer.alloc(8);
  b.writeBigInt64LE(n);
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

export function placeIx(args: {
  programId: PublicKey;
  owner: PublicKey;
  order: PublicKey;
  srcMint: PublicKey;
  dstMint: PublicKey;
  ownerSrcAta: PublicKey;
  escrowAta: PublicKey;
  associatedTokenProgram?: PublicKey;
  systemProgram?: PublicKey;
  tokenProgram?: PublicKey;
  nonce: bigint;
  amountRaw: bigint;
  minRatioE9: bigint;
  failsafeFloorE9: bigint;
  failsafeTs: bigint;
  hardExpiryTs: bigint;
  minFillRaw: bigint;
  srcMultiplierE9: bigint;
}): TransactionInstruction {
  const tokenProgram = args.tokenProgram ?? TOKEN_2022_PROGRAM_ID;
  const associatedTokenProgram =
    args.associatedTokenProgram ??
    new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL");
  const systemProgram = args.systemProgram ?? PublicKey.default;
  const data = Buffer.concat([
    disc("place"),
    u64le(args.nonce),
    u64le(args.amountRaw),
    u64le(args.minRatioE9),
    u64le(args.failsafeFloorE9),
    i64le(args.failsafeTs),
    i64le(args.hardExpiryTs),
    u64le(args.minFillRaw),
    u64le(args.srcMultiplierE9),
  ]);
  return new TransactionInstruction({
    programId: args.programId,
    data,
    keys: [
      meta(args.owner, true, true),
      meta(args.order, false, true),
      meta(args.srcMint, false, false),
      meta(args.dstMint, false, false),
      meta(args.ownerSrcAta, false, true),
      meta(args.escrowAta, false, true),
      meta(tokenProgram, false, false),
      meta(associatedTokenProgram, false, false),
      meta(systemProgram, false, false),
    ],
  });
}
