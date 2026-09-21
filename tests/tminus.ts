import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import {
  TOKEN_2022_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  createInitializeMintInstruction,
  createInitializeTransferFeeConfigInstruction,
  createInitializePausableConfigInstruction,
  createInitializeTransferHookInstruction,
  createPauseInstruction,
  createMintToInstruction,
  getAssociatedTokenAddressSync,
  getMintLen,
  ExtensionType,
  getAccount,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import {
  Keypair,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
  PublicKey,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import assert from "node:assert/strict";

process.env.ANCHOR_PROVIDER_URL ??= "http://127.0.0.1:8899";
process.env.ANCHOR_WALLET ??= "C:\\Users\\LOQ\\.tminus\\keys\\deploy.json";

function u64buf(n: bigint): Buffer {
  const b = Buffer.alloc(8);
  b.writeBigUInt64LE(n);
  return b;
}

async function airdrop(connection: anchor.web3.Connection, pk: PublicKey) {
  const sig = await connection.requestAirdrop(pk, 5 * LAMPORTS_PER_SOL);
  await connection.confirmTransaction(sig, "confirmed");
}

async function createFeeMint(
  connection: anchor.web3.Connection,
  payer: Keypair,
  decimals: number,
  feeBps: number
): Promise<Keypair> {
  const mint = Keypair.generate();
  const extensions = [ExtensionType.TransferFeeConfig];
  const mintLen = getMintLen(extensions);
  const lamports = await connection.getMinimumBalanceForRentExemption(mintLen);
  const tx = new Transaction().add(
    SystemProgram.createAccount({
      fromPubkey: payer.publicKey,
      newAccountPubkey: mint.publicKey,
      space: mintLen,
      lamports,
      programId: TOKEN_2022_PROGRAM_ID,
    }),
    createInitializeTransferFeeConfigInstruction(
      mint.publicKey,
      payer.publicKey,
      payer.publicKey,
      feeBps,
      BigInt("18446744073709551615"),
      TOKEN_2022_PROGRAM_ID
    ),
    createInitializeMintInstruction(
      mint.publicKey,
      decimals,
      payer.publicKey,
      null,
      TOKEN_2022_PROGRAM_ID
    )
  );
  await sendAndConfirmTransaction(connection, tx, [payer, mint]);
  return mint;
}

async function createPlainMint(
  connection: anchor.web3.Connection,
  payer: Keypair,
  decimals: number
): Promise<Keypair> {
  const mint = Keypair.generate();
  const mintLen = getMintLen([]);
  const lamports = await connection.getMinimumBalanceForRentExemption(mintLen);
  const tx = new Transaction().add(
    SystemProgram.createAccount({
      fromPubkey: payer.publicKey,
      newAccountPubkey: mint.publicKey,
      space: mintLen,
      lamports,
      programId: TOKEN_2022_PROGRAM_ID,
    }),
    createInitializeMintInstruction(
      mint.publicKey,
      decimals,
      payer.publicKey,
      null,
      TOKEN_2022_PROGRAM_ID
    )
  );
  await sendAndConfirmTransaction(connection, tx, [payer, mint]);
  return mint;
}

function ata(mint: PublicKey, owner: PublicKey) {
  return getAssociatedTokenAddressSync(mint, owner, true, TOKEN_2022_PROGRAM_ID);
}

async function createPausedFeeMint(
  connection: anchor.web3.Connection,
  payer: Keypair,
  decimals: number,
  feeBps: number
): Promise<Keypair> {
  const mint = Keypair.generate();
  const mintLen = getMintLen([ExtensionType.TransferFeeConfig, ExtensionType.PausableConfig]);
  const lamports = await connection.getMinimumBalanceForRentExemption(mintLen);
  const tx = new Transaction().add(
    SystemProgram.createAccount({
      fromPubkey: payer.publicKey,
      newAccountPubkey: mint.publicKey,
      space: mintLen,
      lamports,
      programId: TOKEN_2022_PROGRAM_ID,
    }),
    createInitializeTransferFeeConfigInstruction(
      mint.publicKey,
      payer.publicKey,
      payer.publicKey,
      feeBps,
      BigInt("18446744073709551615"),
      TOKEN_2022_PROGRAM_ID
    ),
    createInitializePausableConfigInstruction(mint.publicKey, payer.publicKey, TOKEN_2022_PROGRAM_ID),
    createInitializeMintInstruction(
      mint.publicKey,
      decimals,
      payer.publicKey,
      null,
      TOKEN_2022_PROGRAM_ID
    )
  );
  await sendAndConfirmTransaction(connection, tx, [payer, mint]);
  return mint;
}

async function createHookFeeMint(
  connection: anchor.web3.Connection,
  payer: Keypair,
  decimals: number,
  feeBps: number
): Promise<Keypair> {
  const mint = Keypair.generate();
  const mintLen = getMintLen([ExtensionType.TransferFeeConfig, ExtensionType.TransferHook]);
  const lamports = await connection.getMinimumBalanceForRentExemption(mintLen);
  const tx = new Transaction().add(
    SystemProgram.createAccount({
      fromPubkey: payer.publicKey,
      newAccountPubkey: mint.publicKey,
      space: mintLen,
      lamports,
      programId: TOKEN_2022_PROGRAM_ID,
    }),
    createInitializeTransferFeeConfigInstruction(
      mint.publicKey,
      payer.publicKey,
      payer.publicKey,
      feeBps,
      BigInt("18446744073709551615"),
      TOKEN_2022_PROGRAM_ID
    ),
    createInitializeTransferHookInstruction(
      mint.publicKey,
      payer.publicKey,
      TOKEN_PROGRAM_ID,
      TOKEN_2022_PROGRAM_ID
    ),
    createInitializeMintInstruction(
      mint.publicKey,
      decimals,
      payer.publicKey,
      null,
      TOKEN_2022_PROGRAM_ID
    )
  );
  await sendAndConfirmTransaction(connection, tx, [payer, mint]);
  return mint;
}

describe("tminus", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = (anchor.workspace as Record<string, Program>).tminus;
  const connection = provider.connection;
  const payer = (provider.wallet as anchor.Wallet).payer;

  let srcMint: Keypair;
  let dstMint: Keypair;
  let owner: Keypair;
  let filler: Keypair;

  before(async () => {
    owner = Keypair.generate();
    filler = Keypair.generate();
    await airdrop(connection, owner.publicKey);
    await airdrop(connection, filler.publicKey);
    srcMint = await createFeeMint(connection, payer, 9, 100);
    dstMint = await createPlainMint(connection, payer, 8);
    for (const who of [owner, filler, payer]) {
      const ix = createAssociatedTokenAccountInstruction(
        payer.publicKey,
        ata(srcMint.publicKey, who.publicKey),
        who.publicKey,
        srcMint.publicKey,
        TOKEN_2022_PROGRAM_ID
      );
      const ix2 = createAssociatedTokenAccountInstruction(
        payer.publicKey,
        ata(dstMint.publicKey, who.publicKey),
        who.publicKey,
        dstMint.publicKey,
        TOKEN_2022_PROGRAM_ID
      );
      await sendAndConfirmTransaction(connection, new Transaction().add(ix, ix2), [payer]);
    }
    const mintSrc = createMintToInstruction(
      srcMint.publicKey,
      ata(srcMint.publicKey, owner.publicKey),
      payer.publicKey,
      10_000_000_000,
      [],
      TOKEN_2022_PROGRAM_ID
    );
    const mintDst = createMintToInstruction(
      dstMint.publicKey,
      ata(dstMint.publicKey, filler.publicKey),
      payer.publicKey,
      10_000_000_000,
      [],
      TOKEN_2022_PROGRAM_ID
    );
    await sendAndConfirmTransaction(connection, new Transaction().add(mintSrc, mintDst), [payer]);
  });

  function orderPda(nonce: bigint) {
    return PublicKey.findProgramAddressSync(
      [
        Buffer.from("order"),
        owner.publicKey.toBuffer(),
        srcMint.publicKey.toBuffer(),
        dstMint.publicKey.toBuffer(),
        u64buf(nonce),
      ],
      program.programId
    )[0];
  }

  function placeAccounts(pda: PublicKey, escrow: PublicKey) {
    return {
      owner: owner.publicKey,
      order: pda,
      srcMint: srcMint.publicKey,
      dstMint: dstMint.publicKey,
      ownerSrcAta: ata(srcMint.publicKey, owner.publicKey),
      escrowAta: escrow,
      tokenProgram: TOKEN_2022_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    };
  }

  function fillAccounts(pda: PublicKey, escrow: PublicKey) {
    return {
      filler: filler.publicKey,
      owner: owner.publicKey,
      order: pda,
      srcMint: srcMint.publicKey,
      dstMint: dstMint.publicKey,
      escrowAta: escrow,
      ownerDstAta: ata(dstMint.publicKey, owner.publicKey),
      fillerSrcAta: ata(srcMint.publicKey, filler.publicKey),
      fillerDstAta: ata(dstMint.publicKey, filler.publicKey),
      tokenProgram: TOKEN_2022_PROGRAM_ID,
      dstTokenProgram: TOKEN_2022_PROGRAM_ID,
    };
  }

  it("place records post-fee amount and cancel returns remaining", async () => {
    const nonce = 1n;
    const pda = orderPda(nonce);
    const escrow = ata(srcMint.publicKey, pda);
    const now = Math.floor(Date.now() / 1000);
    await program.methods
      .place(
        new anchor.BN(nonce.toString()),
        new anchor.BN(1_000_000),
        new anchor.BN(1_000_000_000),
        new anchor.BN(700_000_000),
        new anchor.BN(now + 3600),
        new anchor.BN(now + 7200),
        new anchor.BN(1),
        new anchor.BN(5_000_000_000)
      )
      .accounts(placeAccounts(pda, escrow))
      .signers([owner])
      .rpc();
    const escrowAcc = await getAccount(connection, escrow, undefined, TOKEN_2022_PROGRAM_ID);
    assert.equal(Number(escrowAcc.amount), 990_000);
    const acc = await program.account.order.fetch(pda);
    assert.equal(Number(acc.escrowedRaw), 990_000);
    await program.methods.cancel().accounts({
      owner: owner.publicKey,
      order: pda,
      srcMint: srcMint.publicKey,
      ownerSrcAta: ata(srcMint.publicKey, owner.publicKey),
      escrowAta: escrow,
      tokenProgram: TOKEN_2022_PROGRAM_ID,
    }).signers([owner]).rpc();
  });

  it("rejects under-delivery then fills at min ratio", async () => {
    const nonce = 2n;
    const pda = orderPda(nonce);
    const escrow = ata(srcMint.publicKey, pda);
    const now = Math.floor(Date.now() / 1000);
    await program.methods
      .place(
        new anchor.BN(nonce.toString()),
        new anchor.BN(1_000_000),
        new anchor.BN(500_000_000),
        new anchor.BN(100_000_000),
        new anchor.BN(now + 3600),
        new anchor.BN(now + 7200),
        new anchor.BN(1),
        new anchor.BN(5_000_000_000)
      )
      .accounts(placeAccounts(pda, escrow))
      .signers([owner])
      .rpc();
    const remaining = Number(
      (await getAccount(connection, escrow, undefined, TOKEN_2022_PROGRAM_ID)).amount
    );
    await assert.rejects(async () => {
      await program.methods
        .fill(new anchor.BN(remaining), new anchor.BN(1))
        .accounts(fillAccounts(pda, escrow))
        .signers([filler])
        .rpc();
    });
    const minDst = Math.ceil((remaining * 500_000_000) / 1_000_000_000);
    await program.methods
      .fill(new anchor.BN(remaining), new anchor.BN(minDst))
      .accounts(fillAccounts(pda, escrow))
      .signers([filler])
      .rpc();
    await assert.rejects(async () => {
      await program.methods
        .fill(new anchor.BN(1), new anchor.BN(minDst))
        .accounts(fillAccounts(pda, escrow))
        .signers([filler])
        .rpc();
    });
  });

  it("expire returns remaining after hard expiry and rejects early expire", async () => {
    const nonce = 3n;
    const pda = orderPda(nonce);
    const escrow = ata(srcMint.publicKey, pda);
    const now = Math.floor(Date.now() / 1000);
    await program.methods
      .place(
        new anchor.BN(nonce.toString()),
        new anchor.BN(1_000_000),
        new anchor.BN(900_000_000),
        new anchor.BN(700_000_000),
        new anchor.BN(now + 3600),
        new anchor.BN(now + 7200),
        new anchor.BN(1),
        new anchor.BN(5_000_000_000)
      )
      .accounts(placeAccounts(pda, escrow))
      .signers([owner])
      .rpc();
    await assert.rejects(async () => {
      await program.methods.expire().accounts({
        owner: owner.publicKey,
        crank: filler.publicKey,
        order: pda,
        srcMint: srcMint.publicKey,
        ownerSrcAta: ata(srcMint.publicKey, owner.publicKey),
        escrowAta: escrow,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
      }).signers([filler]).rpc();
    });
    const nonce4 = 4n;
    const pda4 = orderPda(nonce4);
    const escrow4 = ata(srcMint.publicKey, pda4);
    await program.methods
      .place(
        new anchor.BN(nonce4.toString()),
        new anchor.BN(1_000_000),
        new anchor.BN(900_000_000),
        new anchor.BN(700_000_000),
        new anchor.BN(1),
        new anchor.BN(1),
        new anchor.BN(1),
        new anchor.BN(5_000_000_000)
      )
      .accounts(placeAccounts(pda4, escrow4))
      .signers([owner])
      .rpc();
    await program.methods.expire().accounts({
      owner: owner.publicKey,
      crank: filler.publicKey,
      order: pda4,
      srcMint: srcMint.publicKey,
      ownerSrcAta: ata(srcMint.publicKey, owner.publicKey),
      escrowAta: escrow4,
      tokenProgram: TOKEN_2022_PROGRAM_ID,
    }).signers([filler]).rpc();
  });

  it("failsafe floor is used when timestamp reached", async () => {
    const nonce = 5n;
    const pda = orderPda(nonce);
    const escrow = ata(srcMint.publicKey, pda);
    const now = Math.floor(Date.now() / 1000);
    await program.methods
      .place(
        new anchor.BN(nonce.toString()),
        new anchor.BN(1_000_000),
        new anchor.BN(900_000_000),
        new anchor.BN(100_000_000),
        new anchor.BN(1),
        new anchor.BN(now + 7200),
        new anchor.BN(1),
        new anchor.BN(5_000_000_000)
      )
      .accounts(placeAccounts(pda, escrow))
      .signers([owner])
      .rpc();
    const remaining = Number(
      (await getAccount(connection, escrow, undefined, TOKEN_2022_PROGRAM_ID)).amount
    );
    const minDst = Math.ceil((remaining * 100_000_000) / 1_000_000_000);
    await assert.rejects(async () => {
      await program.methods
        .fill(new anchor.BN(remaining), new anchor.BN(Math.max(minDst - 1, 1) === minDst ? 0 : Math.max(minDst - 1, 0)))
        .accounts(fillAccounts(pda, escrow))
        .signers([filler])
        .rpc();
    });
    await program.methods
      .fill(new anchor.BN(remaining), new anchor.BN(minDst))
      .accounts(fillAccounts(pda, escrow))
      .signers([filler])
      .rpc();
  });

  it("rejects zero amount", async () => {
    const nonce = 6n;
    const pda = orderPda(nonce);
    const escrow = ata(srcMint.publicKey, pda);
    const now = Math.floor(Date.now() / 1000);
    await assert.rejects(async () => {
      await program.methods
        .place(
          new anchor.BN(nonce.toString()),
          new anchor.BN(0),
          new anchor.BN(1_000_000_000),
          new anchor.BN(1_000_000_000),
          new anchor.BN(now + 10),
          new anchor.BN(now + 20),
          new anchor.BN(1),
          new anchor.BN(5_000_000_000)
        )
        .accounts(placeAccounts(pda, escrow))
        .signers([owner])
        .rpc();
    });
  });

  it("rejects identical source and destination mints", async () => {
    const nonce = 7n;
    const n = u64buf(nonce);
    const pda = PublicKey.findProgramAddressSync(
      [
        Buffer.from("order"),
        owner.publicKey.toBuffer(),
        srcMint.publicKey.toBuffer(),
        srcMint.publicKey.toBuffer(),
        n,
      ],
      program.programId
    )[0];
    const escrow = ata(srcMint.publicKey, pda);
    const now = Math.floor(Date.now() / 1000);
    await assert.rejects(async () => {
      await program.methods
        .place(
          new anchor.BN(nonce.toString()),
          new anchor.BN(1_000_000),
          new anchor.BN(1_000_000_000),
          new anchor.BN(1_000_000_000),
          new anchor.BN(now + 10),
          new anchor.BN(now + 20),
          new anchor.BN(1),
          new anchor.BN(5_000_000_000)
        )
        .accounts({
          ...placeAccounts(pda, escrow),
          dstMint: srcMint.publicKey,
        })
        .signers([owner])
        .rpc();
    });
  });

  it("rejects cancel from a non-owner", async () => {
    const nonce = 8n;
    const pda = orderPda(nonce);
    const escrow = ata(srcMint.publicKey, pda);
    const now = Math.floor(Date.now() / 1000);
    await program.methods
      .place(
        new anchor.BN(nonce.toString()),
        new anchor.BN(1_000_000),
        new anchor.BN(1_000_000_000),
        new anchor.BN(700_000_000),
        new anchor.BN(now + 3600),
        new anchor.BN(now + 7200),
        new anchor.BN(1),
        new anchor.BN(5_000_000_000)
      )
      .accounts(placeAccounts(pda, escrow))
      .signers([owner])
      .rpc();
    await assert.rejects(async () => {
      await program.methods.cancel().accounts({
        owner: filler.publicKey,
        order: pda,
        srcMint: srcMint.publicKey,
        ownerSrcAta: ata(srcMint.publicKey, filler.publicKey),
        escrowAta: escrow,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
      }).signers([filler]).rpc();
    });
    await program.methods.cancel().accounts({
      owner: owner.publicKey,
      order: pda,
      srcMint: srcMint.publicKey,
      ownerSrcAta: ata(srcMint.publicKey, owner.publicKey),
      escrowAta: escrow,
      tokenProgram: TOKEN_2022_PROGRAM_ID,
    }).signers([owner]).rpc();
  });

  it("rejects place when failsafe floor exceeds min ratio", async () => {
    const nonce = 9n;
    const pda = orderPda(nonce);
    const escrow = ata(srcMint.publicKey, pda);
    const now = Math.floor(Date.now() / 1000);
    await assert.rejects(async () => {
      await program.methods
        .place(
          new anchor.BN(nonce.toString()),
          new anchor.BN(1_000_000),
          new anchor.BN(100_000_000),
          new anchor.BN(200_000_000),
          new anchor.BN(now + 10),
          new anchor.BN(now + 20),
          new anchor.BN(1),
          new anchor.BN(5_000_000_000)
        )
        .accounts(placeAccounts(pda, escrow))
        .signers([owner])
        .rpc();
    });
  });

  it("rejects fills below min_fill_raw then accepts a legal partial", async () => {
    const nonce = 10n;
    const pda = orderPda(nonce);
    const escrow = ata(srcMint.publicKey, pda);
    const now = Math.floor(Date.now() / 1000);
    await program.methods
      .place(
        new anchor.BN(nonce.toString()),
        new anchor.BN(1_000_000),
        new anchor.BN(100_000_000),
        new anchor.BN(100_000_000),
        new anchor.BN(now + 3600),
        new anchor.BN(now + 7200),
        new anchor.BN(500_000),
        new anchor.BN(5_000_000_000)
      )
      .accounts(placeAccounts(pda, escrow))
      .signers([owner])
      .rpc();
    const remaining = Number(
      (await getAccount(connection, escrow, undefined, TOKEN_2022_PROGRAM_ID)).amount
    );
    await assert.rejects(async () => {
      await program.methods
        .fill(new anchor.BN(1), new anchor.BN(1))
        .accounts(fillAccounts(pda, escrow))
        .signers([filler])
        .rpc();
    });
    const first = 500_000;
    const minDst = Math.ceil((first * 100_000_000) / 1_000_000_000);
    await program.methods
      .fill(new anchor.BN(first), new anchor.BN(minDst))
      .accounts(fillAccounts(pda, escrow))
      .signers([filler])
      .rpc();
    const left = Number(
      (await getAccount(connection, escrow, undefined, TOKEN_2022_PROGRAM_ID)).amount
    );
    const restDst = Math.ceil((left * 100_000_000) / 1_000_000_000);
    await program.methods
      .fill(new anchor.BN(left), new anchor.BN(restDst))
      .accounts(fillAccounts(pda, escrow))
      .signers([filler])
      .rpc();
    assert.equal(remaining, 990_000);
  });

  it("rejects place on a paused mint", async () => {
    const pausedMint = await createPausedFeeMint(connection, payer, 9, 100);
    const ownerAtaIx = createAssociatedTokenAccountInstruction(
      payer.publicKey,
      ata(pausedMint.publicKey, owner.publicKey),
      owner.publicKey,
      pausedMint.publicKey,
      TOKEN_2022_PROGRAM_ID
    );
    await sendAndConfirmTransaction(connection, new Transaction().add(ownerAtaIx), [payer]);
    await sendAndConfirmTransaction(
      connection,
      new Transaction().add(
        createPauseInstruction(pausedMint.publicKey, payer.publicKey, [], TOKEN_2022_PROGRAM_ID)
      ),
      [payer]
    );
    const nonce = 11n;
    const n = u64buf(nonce);
    const pda = PublicKey.findProgramAddressSync(
      [
        Buffer.from("order"),
        owner.publicKey.toBuffer(),
        pausedMint.publicKey.toBuffer(),
        dstMint.publicKey.toBuffer(),
        n,
      ],
      program.programId
    )[0];
    const escrow = ata(pausedMint.publicKey, pda);
    const now = Math.floor(Date.now() / 1000);
    await assert.rejects(async () => {
      await program.methods
        .place(
          new anchor.BN(nonce.toString()),
          new anchor.BN(1_000_000),
          new anchor.BN(1_000_000_000),
          new anchor.BN(1_000_000_000),
          new anchor.BN(now + 10),
          new anchor.BN(now + 20),
          new anchor.BN(1),
          new anchor.BN(5_000_000_000)
        )
        .accounts({
          ...placeAccounts(pda, escrow),
          srcMint: pausedMint.publicKey,
          ownerSrcAta: ata(pausedMint.publicKey, owner.publicKey),
        })
        .signers([owner])
        .rpc();
    });
  });

  it("rejects place when a transfer hook program is attached", async () => {
    const hookMint = await createHookFeeMint(connection, payer, 9, 100);
    const ownerAtaIx = createAssociatedTokenAccountInstruction(
      payer.publicKey,
      ata(hookMint.publicKey, owner.publicKey),
      owner.publicKey,
      hookMint.publicKey,
      TOKEN_2022_PROGRAM_ID
    );
    await sendAndConfirmTransaction(connection, new Transaction().add(ownerAtaIx), [payer]);
    const nonce = 12n;
    const n = u64buf(nonce);
    const pda = PublicKey.findProgramAddressSync(
      [
        Buffer.from("order"),
        owner.publicKey.toBuffer(),
        hookMint.publicKey.toBuffer(),
        dstMint.publicKey.toBuffer(),
        n,
      ],
      program.programId
    )[0];
    const escrow = ata(hookMint.publicKey, pda);
    const now = Math.floor(Date.now() / 1000);
    await assert.rejects(async () => {
      await program.methods
        .place(
          new anchor.BN(nonce.toString()),
          new anchor.BN(1_000_000),
          new anchor.BN(1_000_000_000),
          new anchor.BN(1_000_000_000),
          new anchor.BN(now + 10),
          new anchor.BN(now + 20),
          new anchor.BN(1),
          new anchor.BN(5_000_000_000)
        )
        .accounts({
          ...placeAccounts(pda, escrow),
          srcMint: hookMint.publicKey,
          ownerSrcAta: ata(hookMint.publicKey, owner.publicKey),
        })
        .signers([owner])
        .rpc();
    });
  });

  it("rejects a second fill after escrow is drained and the order is closed", async () => {
    const nonce = 13n;
    const pda = orderPda(nonce);
    const escrow = ata(srcMint.publicKey, pda);
    const now = Math.floor(Date.now() / 1000);
    await program.methods
      .place(
        new anchor.BN(nonce.toString()),
        new anchor.BN(1_000_000),
        new anchor.BN(100_000_000),
        new anchor.BN(100_000_000),
        new anchor.BN(now + 3600),
        new anchor.BN(now + 7200),
        new anchor.BN(1),
        new anchor.BN(5_000_000_000)
      )
      .accounts(placeAccounts(pda, escrow))
      .signers([owner])
      .rpc();
    const remaining = Number(
      (await getAccount(connection, escrow, undefined, TOKEN_2022_PROGRAM_ID)).amount
    );
    const minDst = Math.ceil((remaining * 100_000_000) / 1_000_000_000);
    await program.methods
      .fill(new anchor.BN(remaining), new anchor.BN(minDst))
      .accounts(fillAccounts(pda, escrow))
      .signers([filler])
      .rpc();
    await assert.rejects(async () => {
      await program.methods
        .fill(new anchor.BN(1), new anchor.BN(1))
        .accounts(fillAccounts(pda, escrow))
        .signers([filler])
        .rpc();
    });
  });
});
