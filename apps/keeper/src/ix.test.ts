import test from "node:test";
import assert from "node:assert/strict";
import { Keypair, PublicKey } from "@solana/web3.js";
import { fillIx } from "./ix.ts";

test("fill instruction marks both mints writable for Token-2022 harvest/fees", () => {
  const pk = () => Keypair.generate().publicKey;
  const ix = fillIx({
    programId: new PublicKey("HRLmVcuk6PRcVwB3UVpcbEC3LVVMhdLZfPvHtmL2PUdL"),
    filler: pk(),
    owner: pk(),
    order: pk(),
    srcMint: new PublicKey("PreANxuXjsy2pvisWWMNB6YaJNzr7681wJJr2rHsfTh"),
    dstMint: new PublicKey("Xs3oZwbHvqis4NYcf4YKWmEia2eC84wSiVrcYcTqpH8"),
    escrowAta: pk(),
    ownerDstAta: pk(),
    fillerSrcAta: pk(),
    fillerDstAta: pk(),
    fillSrcRaw: 1n,
    dstRaw: 1n,
  });
  assert.equal(ix.keys[3].isWritable, true);
  assert.equal(ix.keys[4].isWritable, true);
  assert.equal(ix.keys[0].isSigner, true);
});
