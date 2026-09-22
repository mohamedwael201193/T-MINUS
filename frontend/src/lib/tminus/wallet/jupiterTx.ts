import { VersionedTransaction } from "@solana/web3.js";

export function txFromBase64(b64: string): VersionedTransaction {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return VersionedTransaction.deserialize(bytes);
}

export function txToBase64(tx: { serialize: (opts?: { requireAllSignatures?: boolean }) => Uint8Array | number[] }): string {
  let bytes: Uint8Array;
  try {
    bytes = Uint8Array.from(tx.serialize());
  } catch {
    bytes = Uint8Array.from(tx.serialize({ requireAllSignatures: false }));
  }
  const chunks: string[] = [];
  const size = 0x8000;
  for (let i = 0; i < bytes.length; i += size) {
    chunks.push(String.fromCharCode(...bytes.subarray(i, i + size)));
  }
  return btoa(chunks.join(""));
}
