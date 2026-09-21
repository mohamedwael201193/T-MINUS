import { VersionedTransaction } from "@solana/web3.js";

export function txFromBase64(b64: string): VersionedTransaction {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return VersionedTransaction.deserialize(bytes);
}

export function txToBase64(tx: { serialize: () => Uint8Array | number[] }): string {
  const bytes = Uint8Array.from(tx.serialize());
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}
