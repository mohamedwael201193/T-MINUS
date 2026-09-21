import { Connection, PublicKey } from "@solana/web3.js";

const TOKEN_PROGRAM = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
const TOKEN_2022_PROGRAM = new PublicKey("TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb");
const SPACEX_MINT = "PreANxuXjsy2pvisWWMNB6YaJNzr7681wJJr2rHsfTh";
const SPCXX_MINT = "Xs3oZwbHvqis4NYcf4YKWmEia2eC84wSiVrcYcTqpH8";
/** PreStocks display unit for SPACEX: 1 display = 200_000_000 raw (scaled UI). */
export const SPACEX_DISPLAY_RAW = 200_000_000;

type ParsedToken = {
  mint: string;
  raw: string;
  uiAmount: number | null;
  decimals: number;
};

function collect(accounts: Awaited<ReturnType<Connection["getParsedTokenAccountsByOwner"]>>): ParsedToken[] {
  const out: ParsedToken[] = [];
  for (const row of accounts.value) {
    const info = row.account.data;
    if (!("parsed" in info)) continue;
    const parsed = info.parsed as {
      info?: { mint?: string; tokenAmount?: { amount?: string; uiAmount?: number | null; decimals?: number } };
    };
    const mint = parsed.info?.mint;
    const amount = parsed.info?.tokenAmount;
    if (!mint || !amount?.amount) continue;
    out.push({
      mint,
      raw: amount.amount,
      uiAmount: amount.uiAmount ?? null,
      decimals: amount.decimals ?? 0,
    });
  }
  return out;
}

function pick(tokens: ParsedToken[], mint: string): ParsedToken | null {
  return tokens.find((t) => t.mint === mint) ?? null;
}

export async function readOwnerBalances(rpc: string, ownerStr: string) {
  const owner = new PublicKey(ownerStr);
  const connection = new Connection(rpc, "confirmed");
  const [sol, t22, t1] = await Promise.all([
    connection.getBalance(owner, "confirmed"),
    connection.getParsedTokenAccountsByOwner(owner, { programId: TOKEN_2022_PROGRAM }),
    connection.getParsedTokenAccountsByOwner(owner, { programId: TOKEN_PROGRAM }),
  ]);
  const tokens = [...collect(t22), ...collect(t1)];
  const spacex = pick(tokens, SPACEX_MINT);
  const spcxx = pick(tokens, SPCXX_MINT);
  const spacexRaw = spacex ? BigInt(spacex.raw) : 0n;
  const display = Number(spacexRaw) / SPACEX_DISPLAY_RAW;
  return {
    network: "MAINNET" as const,
    owner: owner.toBase58(),
    solLamports: sol,
    sol: sol / 1_000_000_000,
    SPACEX: {
      mint: SPACEX_MINT,
      raw: spacexRaw.toString(),
      uiAmount: spacex?.uiAmount ?? 0,
      displayUnits: display,
    },
    SPCXx: {
      mint: SPCXX_MINT,
      raw: spcxx?.raw ?? "0",
      uiAmount: spcxx?.uiAmount ?? 0,
    },
    USDC: 0,
  };
}
