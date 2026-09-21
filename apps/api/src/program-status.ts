import { Connection, PublicKey } from "@solana/web3.js";
import { PROGRAM_ID } from "@tminus/sdk";

export type ClusterName = "mainnet-beta" | "devnet";

export function explorerAddress(cluster: ClusterName, address: string): string {
  const q = cluster === "devnet" ? "?cluster=devnet" : "";
  return `https://explorer.solana.com/address/${address}${q}`;
}

export function rpcForCluster(cluster: ClusterName, mainnetRpc: string, devnetRpc?: string): string {
  if (cluster === "devnet") return devnetRpc || "https://api.devnet.solana.com";
  return mainnetRpc;
}

export async function readProgramStatus(
  rpc: string,
  programId: string,
  cluster: ClusterName
): Promise<{
  cluster: ClusterName;
  programId: string;
  exists: boolean;
  executable: boolean;
  owner: string | null;
  dataLen: number;
  lamports: number;
  explorer: string;
}> {
  const connection = new Connection(rpc, "confirmed");
  const info = await connection.getAccountInfo(new PublicKey(programId));
  return {
    cluster,
    programId,
    exists: Boolean(info),
    executable: Boolean(info?.executable),
    owner: info?.owner.toBase58() ?? null,
    dataLen: info?.data.length ?? 0,
    lamports: info?.lamports ?? 0,
    explorer: explorerAddress(cluster, programId),
  };
}

export function declaredProgramId(envProgramId?: string): string {
  return envProgramId || PROGRAM_ID;
}
