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
