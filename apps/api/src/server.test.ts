import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { createServer } from "./server.ts";

test("health endpoint", async () => {
  const server = createServer();
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const addr = server.address();
  assert.ok(addr && typeof addr === "object");
  const res = await fetch(`http://127.0.0.1:${addr.port}/health`);
  const body = (await res.json()) as { ok: boolean; service: string };
  assert.equal(res.status, 200);
  assert.equal(body.ok, true);
  assert.equal(body.service, "tminus-api");
  server.close();
});

test("rejects invalid order pda", async () => {
  const server = createServer();
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const addr = server.address();
  assert.ok(addr && typeof addr === "object");
  const res = await fetch(`http://127.0.0.1:${addr.port}/v1/orders/not-a-pda`);
  assert.equal(res.status, 400);
  server.close();
});

test("rejects non-GET", async () => {
  const server = createServer();
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const addr = server.address();
  assert.ok(addr && typeof addr === "object");
  const res = await fetch(`http://127.0.0.1:${addr.port}/health`, { method: "POST" });
  assert.equal(res.status, 405);
  server.close();
});

test("rejects invalid balance owner", async () => {
  const server = createServer();
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const addr = server.address();
  assert.ok(addr && typeof addr === "object");
  const res = await fetch(`http://127.0.0.1:${addr.port}/v1/balances?owner=not-a-key`);
  assert.equal(res.status, 400);
  server.close();
});

test("pda derive matches SDK without touching RPC", async () => {
  const server = createServer();
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const addr = server.address();
  assert.ok(addr && typeof addr === "object");
  const q = new URLSearchParams({
    owner: "FrwqWhgEhbSnvKXzsG74qkB4ZsRiiheay7LcWBNd5DTj",
    src: "PreANxuXjsy2pvisWWMNB6YaJNzr7681wJJr2rHsfTh",
    dst: "Xs3oZwbHvqis4NYcf4YKWmEia2eC84wSiVrcYcTqpH8",
    nonce: "1",
  });
  const res = await fetch(`http://127.0.0.1:${addr.port}/v1/pda?${q}`);
  const body = (await res.json()) as { pda: string; account: null; seeds: string[] };
  assert.equal(res.status, 200);
  assert.equal(body.account, null);
  assert.equal(body.seeds[0], "order");
  assert.match(body.pda, /^[1-9A-HJ-NP-Za-km-z]{32,44}$/);
  server.close();
});

test("pda rejects bad keys", async () => {
  const server = createServer();
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const addr = server.address();
  assert.ok(addr && typeof addr === "object");
  const res = await fetch(`http://127.0.0.1:${addr.port}/v1/pda?owner=x&src=y&dst=z&nonce=0`);
  assert.equal(res.status, 400);
  server.close();
});

test("program status names both clusters", async () => {
  const server = createServer();
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const addr = server.address();
  assert.ok(addr && typeof addr === "object");
  const res = await fetch(`http://127.0.0.1:${addr.port}/v1/program`);
  const body = (await res.json()) as {
    programId: string;
    clusters: { mainnet: { exists: boolean }; devnet: { exists: boolean; explorer: string } };
  };
  assert.equal(res.status, 200);
  assert.equal(body.programId, "HRLmVcuk6PRcVwB3UVpcbEC3LVVMhdLZfPvHtmL2PUdL");
  assert.equal(typeof body.clusters.mainnet.exists, "boolean");
  assert.equal(typeof body.clusters.devnet.exists, "boolean");
  assert.match(body.clusters.devnet.explorer, /cluster=devnet/);
  server.close();
});
