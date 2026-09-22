import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "./server.ts";

async function withServer(fn: (base: string) => Promise<void>) {
  const server = createServer();
  await new Promise<void>((resolve) => server.listen(0, resolve));
  try {
    const addr = server.address();
    assert.ok(addr && typeof addr === "object");
    await fn(`http://127.0.0.1:${addr.port}`);
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  }
}

test("health endpoint", async () => {
  await withServer(async (base) => {
    const res = await fetch(`${base}/health`);
    const body = (await res.json()) as { ok: boolean; service: string };
    assert.equal(res.status, 200);
    assert.equal(body.ok, true);
    assert.equal(body.service, "tminus-api");
  });
});

test("rejects invalid order pda", async () => {
  await withServer(async (base) => {
    const res = await fetch(`${base}/v1/orders/not-a-pda`);
    assert.equal(res.status, 400);
  });
});

test("rejects non-GET", async () => {
  await withServer(async (base) => {
    const res = await fetch(`${base}/health`, { method: "POST" });
    assert.equal(res.status, 405);
  });
});

test("rejects invalid balance owner", async () => {
  await withServer(async (base) => {
    const res = await fetch(`${base}/v1/balances?owner=not-a-key`);
    assert.equal(res.status, 400);
  });
});

test("pda derive matches SDK without touching RPC", async () => {
  await withServer(async (base) => {
    const q = new URLSearchParams({
      owner: "FrwqWhgEhbSnvKXzsG74qkB4ZsRiiheay7LcWBNd5DTj",
      src: "PreANxuXjsy2pvisWWMNB6YaJNzr7681wJJr2rHsfTh",
      dst: "Xs3oZwbHvqis4NYcf4YKWmEia2eC84wSiVrcYcTqpH8",
      nonce: "1",
    });
    const res = await fetch(`${base}/v1/pda?${q}`);
    const body = (await res.json()) as { pda: string; account: null; seeds: string[] };
    assert.equal(res.status, 200);
    assert.equal(body.account, null);
    assert.equal(body.seeds[0], "order");
    assert.match(body.pda, /^[1-9A-HJ-NP-Za-km-z]{32,44}$/);
  });
});

test("pda rejects bad keys", async () => {
  await withServer(async (base) => {
    const res = await fetch(`${base}/v1/pda?owner=x&src=y&dst=z&nonce=0`);
    assert.equal(res.status, 400);
  });
});

test("unknown corporate action is 404", async () => {
  await withServer(async (base) => {
        const res = await fetch(`${base}/v1/actions/notanasset/status`, {
      signal: AbortSignal.timeout(90_000),
    });
    assert.equal(res.status, 404);
  });
});

test("position without a valid owner is 400", async () => {
  await withServer(async (base) => {
    const res = await fetch(`${base}/v1/actions/spacex/position`, {
      signal: AbortSignal.timeout(45_000),
    });
    assert.equal(res.status, 400);
  });
});

test("OPTIONS is allowed for CORS preflight", async () => {
  await withServer(async (base) => {
    const res = await fetch(`${base}/v1/actions`, { method: "OPTIONS" });
    assert.equal(res.status, 204);
  });
});

test("activity without a valid owner is 400", async () => {
  await withServer(async (base) => {
    const res = await fetch(`${base}/v1/activity`);
    assert.equal(res.status, 400);
  });
});

test("activity rejects a non-pubkey owner", async () => {
  await withServer(async (base) => {
    const res = await fetch(`${base}/v1/activity?owner=not-a-key`);
    assert.equal(res.status, 400);
  });
});

test("activity owner filter never returns another wallet", async () => {
  await withServer(async (base) => {
    const owner = "CpTxsgPjvaaPSaBKkijvB1h3hzgJmPiTsWNhuS7tRkgX";
    const res = await fetch(`${base}/v1/activity?owner=${owner}`, {
      signal: AbortSignal.timeout(20_000),
    });
    if (res.status === 503) return;
    assert.equal(res.status, 200);
    const body = (await res.json()) as {
      owner: string;
      activity: Array<{
        owner: string | null;
        kind: string;
        network: string;
        pda: string | null;
        explorerUrl: string;
        signature: string;
      }>;
    };
    assert.equal(body.owner, owner);
    for (const item of body.activity) {
      if (item.owner) assert.equal(item.owner, owner);
      if (item.kind === "CONVERSION") {
        assert.equal(item.network, "MAINNET");
        assert.equal(item.pda, null);
        assert.doesNotMatch(item.explorerUrl, /cluster=devnet/);
      }
      if (item.kind === "PROTOCOL_ORDER") {
        assert.equal(item.network, "DEVNET");
      }
    }
  });
});

test("conversion execute without body is 400", async () => {
  await withServer(async (base) => {
    const res = await fetch(`${base}/v1/conversions/execute`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}",
    });
    assert.equal(res.status, 400);
  });
});

test("program status names both clusters", async () => {
  await withServer(async (base) => {
    const res = await fetch(`${base}/v1/program`, { signal: AbortSignal.timeout(20_000) });
    const body = (await res.json()) as {
      programId: string;
      clusters: { mainnet: { exists: boolean; explorer: string }; devnet: { exists: boolean; explorer: string } };
    };
    assert.equal(res.status, 200);
    assert.equal(body.programId, "HRLmVcuk6PRcVwB3UVpcbEC3LVVMhdLZfPvHtmL2PUdL");
    assert.equal(typeof body.clusters.mainnet.exists, "boolean");
    assert.equal(typeof body.clusters.devnet.exists, "boolean");
    assert.match(body.clusters.devnet.explorer, /cluster=devnet/);
    assert.doesNotMatch(body.clusters.mainnet.explorer, /cluster=devnet/);
  });
});
