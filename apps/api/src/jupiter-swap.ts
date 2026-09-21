import { env } from "./config.ts";

export type JupiterOrderResult = {
  ok: boolean;
  status: number;
  path: "order" | "quote" | "none";
  transaction: string | null;
  requestId: string | null;
  inAmount: string | null;
  outAmount: string | null;
  otherAmountThreshold: string | null;
  router: string | null;
  error: string | null;
  fetchedAt: string;
};

function headers(): Record<string, string> {
  const h: Record<string, string> = { accept: "application/json" };
  if (env.jupiterApiKey) h["x-api-key"] = env.jupiterApiKey;
  return h;
}

async function getJson(url: string): Promise<{ status: number; json: Record<string, unknown>; text: string }> {
  const res = await fetch(url, { headers: headers(), signal: AbortSignal.timeout(12_000) });
  const text = await res.text();
  let json: Record<string, unknown> = {};
  try {
    json = JSON.parse(text) as Record<string, unknown>;
  } catch {
    json = {};
  }
  return { status: res.status, json, text };
}

function errOf(json: Record<string, unknown>, text: string, status: number): string {
  const msg = json.errorMessage ?? json.error ?? json.message;
  if (typeof msg === "string" && msg) return msg;
  return `jupiter_http_${status}:${text.slice(0, 160)}`;
}

export async function jupiterQuoteLite(params: {
  inputMint: string;
  outputMint: string;
  amount: string;
}): Promise<JupiterOrderResult> {
  const fetchedAt = new Date().toISOString();
  const url =
    `${env.jupiterLiteBase}/swap/v1/quote?` +
    new URLSearchParams({
      inputMint: params.inputMint,
      outputMint: params.outputMint,
      amount: params.amount,
      slippageBps: "50",
    });
  try {
    const { status, json, text } = await getJson(url);
    if (status !== 200 || !json.outAmount) {
      return {
        ok: false,
        status,
        path: "none",
        transaction: null,
        requestId: null,
        inAmount: typeof json.inAmount === "string" ? json.inAmount : params.amount,
        outAmount: null,
        otherAmountThreshold: null,
        router: null,
        error: errOf(json, text, status),
        fetchedAt,
      };
    }
    const route = Array.isArray(json.routePlan) ? json.routePlan[0] : null;
    const label =
      route && typeof route === "object"
        ? ((route as { swapInfo?: { label?: string } }).swapInfo?.label ?? null)
        : null;
    return {
      ok: true,
      status,
      path: "quote",
      transaction: null,
      requestId: null,
      inAmount: String(json.inAmount ?? params.amount),
      outAmount: String(json.outAmount),
      otherAmountThreshold: typeof json.otherAmountThreshold === "string" ? json.otherAmountThreshold : null,
      router: label,
      error: null,
      fetchedAt,
    };
  } catch (err) {
    return {
      ok: false,
      status: 0,
      path: "none",
      transaction: null,
      requestId: null,
      inAmount: params.amount,
      outAmount: null,
      otherAmountThreshold: null,
      router: null,
      error: err instanceof Error ? err.message : "jupiter_network",
      fetchedAt,
    };
  }
}

export async function jupiterOrder(params: {
  inputMint: string;
  outputMint: string;
  amount: string;
  taker?: string;
}): Promise<JupiterOrderResult> {
  const fetchedAt = new Date().toISOString();
  const qs = new URLSearchParams({
    inputMint: params.inputMint,
    outputMint: params.outputMint,
    amount: params.amount,
    slippageBps: "50",
  });
  if (params.taker) qs.set("taker", params.taker);
  const url = `${env.jupiterApiBase}/swap/v2/order?${qs}`;
  try {
    const { status, json, text } = await getJson(url);
    const transaction = typeof json.transaction === "string" && json.transaction.length > 0 ? json.transaction : null;
    const outAmount = json.outAmount != null ? String(json.outAmount) : null;
    if (status !== 200 || !outAmount) {
      const fallback = await jupiterQuoteLite(params);
      if (fallback.ok) {
        return {
          ...fallback,
          error: fallback.error,
          path: "quote",
        };
      }
      return {
        ok: false,
        status,
        path: "none",
        transaction: null,
        requestId: typeof json.requestId === "string" ? json.requestId : null,
        inAmount: params.amount,
        outAmount: null,
        otherAmountThreshold: null,
        router: typeof json.router === "string" ? json.router : null,
        error: errOf(json, text, status),
        fetchedAt,
      };
    }
    return {
      ok: true,
      status,
      path: "order",
      transaction,
      requestId: typeof json.requestId === "string" ? json.requestId : null,
      inAmount: json.inAmount != null ? String(json.inAmount) : params.amount,
      outAmount,
      otherAmountThreshold:
        typeof json.otherAmountThreshold === "string" ? json.otherAmountThreshold : null,
      router: typeof json.router === "string" ? json.router : null,
      error: null,
      fetchedAt,
    };
  } catch (err) {
    const fallback = await jupiterQuoteLite(params);
    if (fallback.ok) return fallback;
    return {
      ok: false,
      status: 0,
      path: "none",
      transaction: null,
      requestId: null,
      inAmount: params.amount,
      outAmount: null,
      otherAmountThreshold: null,
      router: null,
      error: err instanceof Error ? err.message : "jupiter_network",
      fetchedAt,
    };
  }
}

export async function jupiterExecute(params: {
  signedTransaction: string;
  requestId: string;
}): Promise<{
  ok: boolean;
  status: number;
  executionStatus: "Success" | "Failed" | "unknown";
  signature: string | null;
  slot: number | null;
  inAmount: string | null;
  outAmount: string | null;
  error: string | null;
}> {
  try {
    const res = await fetch(`${env.jupiterApiBase}/swap/v2/execute`, {
      method: "POST",
      headers: { ...headers(), "content-type": "application/json" },
      body: JSON.stringify({
        signedTransaction: params.signedTransaction,
        requestId: params.requestId,
      }),
      signal: AbortSignal.timeout(30_000),
    });
    const text = await res.text();
    let json: Record<string, unknown> = {};
    try {
      json = JSON.parse(text) as Record<string, unknown>;
    } catch {
      json = {};
    }
    const executionStatus = json.status === "Success" || json.status === "Failed" ? json.status : "unknown";
    const signature = typeof json.signature === "string" ? json.signature : null;
    const slotRaw = json.slot;
    const slot = typeof slotRaw === "number" ? slotRaw : typeof slotRaw === "string" ? Number(slotRaw) : null;
    return {
      ok: res.ok && executionStatus === "Success" && Boolean(signature),
      status: res.status,
      executionStatus,
      signature,
      slot: Number.isFinite(slot) ? slot : null,
      inAmount: json.totalInputAmount != null ? String(json.totalInputAmount) : json.inputAmountResult != null ? String(json.inputAmountResult) : null,
      outAmount: json.totalOutputAmount != null ? String(json.totalOutputAmount) : json.outputAmountResult != null ? String(json.outputAmountResult) : null,
      error: executionStatus === "Failed" ? (typeof json.error === "string" ? json.error : "execute_failed") : res.ok ? null : text.slice(0, 200),
    };
  } catch (err) {
    return {
      ok: false,
      status: 0,
      executionStatus: "unknown",
      signature: null,
      slot: null,
      inAmount: null,
      outAmount: null,
      error: err instanceof Error ? err.message : "execute_network",
    };
  }
}
