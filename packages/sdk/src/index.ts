import { PublicKey } from "@solana/web3.js";

export const PROGRAM_ID = "HRLmVcuk6PRcVwB3UVpcbEC3LVVMhdLZfPvHtmL2PUdL";
export const TOKEN_2022_PROGRAM_ID = "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb";
export const SPACEX_MINT = "PreANxuXjsy2pvisWWMNB6YaJNzr7681wJJr2rHsfTh";
export const SPCXX_MINT = "Xs3oZwbHvqis4NYcf4YKWmEia2eC84wSiVrcYcTqpH8";
export const DISPLAY_RAW_SPACEX = 200_000_000n;
export const RATIO_SCALE = 1_000_000_000n;
export const ORDER_SEED = Buffer.from("order");
export const STATUS_OPEN = 0;
export const STATUS_CLOSED = 1;
/** Discriminator (8) + Order fields through min_fill_raw. Status is the next byte. */
export const ORDER_STATUS_OFFSET = 210;
/** RPC memcmp `bytes` for status=open (base58 of a single 0x00). */
export const OPEN_STATUS_MEMCMP_BYTES = "1";

export function ceilRatio(src: bigint, ratioE9: bigint): bigint {
  if (src <= 0n || ratioE9 <= 0n) throw new Error("invalid ratio inputs");
  return (src * ratioE9 + RATIO_SCALE - 1n) / RATIO_SCALE;
}

export function activeFloor(
  nowTs: number,
  failsafeTs: number,
  minRatio: bigint,
  failsafeFloor: bigint
): bigint {
  return nowTs >= failsafeTs ? failsafeFloor : minRatio;
}

export function quoteRatioE9(outAmount: bigint, inAmount: bigint): bigint {
  if (inAmount <= 0n) throw new Error("invalid inAmount");
  return (outAmount * RATIO_SCALE) / inAmount;
}

export function isFillable(quoteE9: bigint, floorE9: bigint): boolean {
  return quoteE9 >= floorE9;
}

export type { Tminus } from "./idl.ts";

export type DecodedOrder = {
  owner: PublicKey;
  srcMint: PublicKey;
  dstMint: PublicKey;
  escrowAta: PublicKey;
  nonce: bigint;
  srcDecimals: number;
  dstDecimals: number;
  srcMultiplierE9: bigint;
  escrowedRaw: bigint;
  filledRaw: bigint;
  minRatioE9: bigint;
  failsafeFloorE9: bigint;
  failsafeTs: bigint;
  hardExpiryTs: bigint;
  minFillRaw: bigint;
  status: number;
  bump: number;
};

function u64(data: Buffer, offset: number): bigint {
  return data.readBigUInt64LE(offset);
}

function i64(data: Buffer, offset: number): bigint {
  return data.readBigInt64LE(offset);
}

export function decodeOrder(data: Buffer): DecodedOrder {
  if (data.length < 204) throw new Error("order account too short");
  let o = 8;
  const owner = new PublicKey(data.subarray(o, o + 32));
  o += 32;
  const srcMint = new PublicKey(data.subarray(o, o + 32));
  o += 32;
  const dstMint = new PublicKey(data.subarray(o, o + 32));
  o += 32;
  const escrowAta = new PublicKey(data.subarray(o, o + 32));
  o += 32;
  const nonce = u64(data, o);
  o += 8;
  const srcDecimals = data[o]!;
  o += 1;
  const dstDecimals = data[o]!;
  o += 1;
  const srcMultiplierE9 = u64(data, o);
  o += 8;
  const escrowedRaw = u64(data, o);
  o += 8;
  const filledRaw = u64(data, o);
  o += 8;
  const minRatioE9 = u64(data, o);
  o += 8;
  const failsafeFloorE9 = u64(data, o);
  o += 8;
  const failsafeTs = i64(data, o);
  o += 8;
  const hardExpiryTs = i64(data, o);
  o += 8;
  const minFillRaw = u64(data, o);
  o += 8;
  const status = data[o]!;
  o += 1;
  const bump = data[o]!;
  return {
    owner,
    srcMint,
    dstMint,
    escrowAta,
    nonce,
    srcDecimals,
    dstDecimals,
    srcMultiplierE9,
    escrowedRaw,
    filledRaw,
    minRatioE9,
    failsafeFloorE9,
    failsafeTs,
    hardExpiryTs,
    minFillRaw,
    status,
    bump,
  };
}

export function orderPda(
  owner: PublicKey,
  srcMint: PublicKey,
  dstMint: PublicKey,
  nonce: bigint | number,
  programId = new PublicKey(PROGRAM_ID)
): [PublicKey, number] {
  const n = Buffer.alloc(8);
  n.writeBigUInt64LE(BigInt(nonce));
  return PublicKey.findProgramAddressSync(
    [ORDER_SEED, owner.toBuffer(), srcMint.toBuffer(), dstMint.toBuffer(), n],
    programId
  );
}
