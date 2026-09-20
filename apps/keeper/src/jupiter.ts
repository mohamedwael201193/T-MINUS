import {
  AddressLookupTableAccount,
  Connection,
  PublicKey,
  TransactionInstruction,
} from "@solana/web3.js";
import { env } from "./config.ts";

export type ApiInstruction = {
  programId: string;
  accounts: { pubkey: string; isSigner: boolean; isWritable: boolean }[];
  data: string;
};

export type BuildResponse = {
  inputMint: string;
  outputMint: string;
  inAmount: string;
  outAmount: string;
  otherAmountThreshold: string;
  slippageBps: number;
  routePlan: unknown;
  computeBudgetInstructions: ApiInstruction[];
  setupInstructions: ApiInstruction[];
  swapInstruction: ApiInstruction;
  cleanupInstruction: ApiInstruction | null;
  otherInstructions: ApiInstruction[];
  tipInstruction: ApiInstruction | null;
  addressesByLookupTableAddress: Record<string, string[]> | null;
};

export type QuoteResponse = {
  inputMint: string;
  outputMint: string;
  inAmount: string;
  outAmount: string;
  otherAmountThreshold: string;
  swapUsdValue?: string;
  routePlan?: unknown;
};

function headers(): Record<string, string> {
  const h: Record<string, string> = { accept: "application/json" };
  if (env.jupiterApiKey) h["x-api-key"] = env.jupiterApiKey;
  return h;
}

export async function quoteExactIn(
  inputMint: string,
  outputMint: string,
  amount: string,
  taker: string
): Promise<QuoteResponse> {
  const url =
    `${env.jupiterLiteBase}/swap/v1/quote?` +
    new URLSearchParams({
      inputMint,
      outputMint,
      amount,
      slippageBps: "50",
      taker,
    });
  const res = await fetch(url, { headers: headers() });
  const text = await res.text();
  if (res.status === 429) throw new Error("jupiter_429");
  if (res.status >= 500) throw new Error(`jupiter_5xx_${res.status}`);
  if (!res.ok) throw new Error(`jupiter_quote_http_${res.status}`);
  return JSON.parse(text) as QuoteResponse;
}

export async function buildSwap(params: {
  inputMint: string;
  outputMint: string;
  amount: string;
  taker: string;
}): Promise<BuildResponse> {
  const url =
    `${env.jupiterApiBase}/swap/v2/build?` +
    new URLSearchParams({
      inputMint: params.inputMint,
      outputMint: params.outputMint,
      amount: params.amount,
      taker: params.taker,
      slippageBps: "50",
    });
  const res = await fetch(url, { headers: headers() });
  const text = await res.text();
  if (res.status === 429) throw new Error("jupiter_429");
  if (res.status >= 500) throw new Error(`jupiter_5xx_${res.status}`);
  if (!res.ok) throw new Error(`jupiter_build_http_${res.status}`);
  return JSON.parse(text) as BuildResponse;
}

export function toInstruction(ix: ApiInstruction): TransactionInstruction {
  return new TransactionInstruction({
    programId: new PublicKey(ix.programId),
    keys: ix.accounts.map((acc) => ({
      pubkey: new PublicKey(acc.pubkey),
      isSigner: acc.isSigner,
      isWritable: acc.isWritable,
    })),
    data: Buffer.from(ix.data, "base64"),
  });
}

export function lookupTablesFromBuild(build: BuildResponse): AddressLookupTableAccount[] {
  if (!build.addressesByLookupTableAddress) return [];
  return Object.entries(build.addressesByLookupTableAddress).map(
    ([key, addresses]) =>
      new AddressLookupTableAccount({
        key: new PublicKey(key),
        state: {
          deactivationSlot: BigInt("18446744073709551615"),
          lastExtendedSlot: 0,
          lastExtendedSlotStartIndex: 0,
          authority: undefined,
          addresses: addresses.map((a) => new PublicKey(a)),
        },
      })
  );
}

export async function loadLookupTables(
  connection: Connection,
  build: BuildResponse
): Promise<AddressLookupTableAccount[]> {
  const keys = Object.keys(build.addressesByLookupTableAddress ?? {});
  if (keys.length === 0) return lookupTablesFromBuild(build);
  const out: AddressLookupTableAccount[] = [];
  for (const key of keys) {
    const acc = await connection.getAddressLookupTable(new PublicKey(key));
    if (acc.value) out.push(acc.value);
  }
  return out.length ? out : lookupTablesFromBuild(build);
}
