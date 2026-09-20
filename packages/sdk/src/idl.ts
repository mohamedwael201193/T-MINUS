/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/tminus.json`.
 */
export type Tminus = {
  "address": "HRLmVcuk6PRcVwB3UVpcbEC3LVVMhdLZfPvHtmL2PUdL",
  "metadata": {
    "name": "tminus",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "T-MINUS conditional conversion orders for Token-2022 PreStocks"
  },
  "instructions": [
    {
      "name": "cancel",
      "discriminator": [
        232,
        219,
        223,
        41,
        219,
        236,
        220,
        190
      ],
      "accounts": [
        {
          "name": "owner",
          "writable": true,
          "signer": true,
          "relations": [
            "order"
          ]
        },
        {
          "name": "order",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  111,
                  114,
                  100,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "owner"
              },
              {
                "kind": "account",
                "path": "srcMint"
              },
              {
                "kind": "account",
                "path": "order.dstMint",
                "account": "order"
              },
              {
                "kind": "account",
                "path": "order.nonce",
                "account": "order"
              }
            ]
          }
        },
        {
          "name": "srcMint",
          "writable": true,
          "relations": [
            "order"
          ]
        },
        {
          "name": "ownerSrcAta",
          "writable": true
        },
        {
          "name": "escrowAta",
          "writable": true,
          "relations": [
            "order"
          ]
        },
        {
          "name": "tokenProgram"
        }
      ],
      "args": []
    },
    {
      "name": "expire",
      "discriminator": [
        243,
        83,
        205,
        58,
        57,
        201,
        247,
        146
      ],
      "accounts": [
        {
          "name": "owner",
          "writable": true
        },
        {
          "name": "crank",
          "signer": true
        },
        {
          "name": "order",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  111,
                  114,
                  100,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "order.owner",
                "account": "order"
              },
              {
                "kind": "account",
                "path": "srcMint"
              },
              {
                "kind": "account",
                "path": "order.dstMint",
                "account": "order"
              },
              {
                "kind": "account",
                "path": "order.nonce",
                "account": "order"
              }
            ]
          }
        },
        {
          "name": "srcMint",
          "writable": true,
          "relations": [
            "order"
          ]
        },
        {
          "name": "ownerSrcAta",
          "writable": true
        },
        {
          "name": "escrowAta",
          "writable": true,
          "relations": [
            "order"
          ]
        },
        {
          "name": "tokenProgram"
        }
      ],
      "args": []
    },
    {
      "name": "fill",
      "discriminator": [
        168,
        96,
        183,
        163,
        92,
        10,
        40,
        160
      ],
      "accounts": [
        {
          "name": "filler",
          "writable": true,
          "signer": true
        },
        {
          "name": "owner",
          "writable": true
        },
        {
          "name": "order",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  111,
                  114,
                  100,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "order.owner",
                "account": "order"
              },
              {
                "kind": "account",
                "path": "srcMint"
              },
              {
                "kind": "account",
                "path": "dstMint"
              },
              {
                "kind": "account",
                "path": "order.nonce",
                "account": "order"
              }
            ]
          }
        },
        {
          "name": "srcMint",
          "writable": true,
          "relations": [
            "order"
          ]
        },
        {
          "name": "dstMint",
          "relations": [
            "order"
          ]
        },
        {
          "name": "escrowAta",
          "writable": true,
          "relations": [
            "order"
          ]
        },
        {
          "name": "ownerDstAta",
          "writable": true
        },
        {
          "name": "fillerSrcAta",
          "writable": true
        },
        {
          "name": "fillerDstAta",
          "writable": true
        },
        {
          "name": "tokenProgram"
        },
        {
          "name": "dstTokenProgram"
        }
      ],
      "args": [
        {
          "name": "fillSrcRaw",
          "type": "u64"
        },
        {
          "name": "dstRaw",
          "type": "u64"
        }
      ]
    },
    {
      "name": "place",
      "discriminator": [
        143,
        53,
        56,
        40,
        41,
        16,
        5,
        75
      ],
      "accounts": [
        {
          "name": "owner",
          "writable": true,
          "signer": true
        },
        {
          "name": "order",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  111,
                  114,
                  100,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "owner"
              },
              {
                "kind": "account",
                "path": "srcMint"
              },
              {
                "kind": "account",
                "path": "dstMint"
              },
              {
                "kind": "arg",
                "path": "nonce"
              }
            ]
          }
        },
        {
          "name": "srcMint"
        },
        {
          "name": "dstMint"
        },
        {
          "name": "ownerSrcAta",
          "writable": true
        },
        {
          "name": "escrowAta",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "order"
              },
              {
                "kind": "account",
                "path": "tokenProgram"
              },
              {
                "kind": "account",
                "path": "srcMint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "tokenProgram"
        },
        {
          "name": "associatedTokenProgram",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "nonce",
          "type": "u64"
        },
        {
          "name": "amountRaw",
          "type": "u64"
        },
        {
          "name": "minRatioE9",
          "type": "u64"
        },
        {
          "name": "failsafeFloorE9",
          "type": "u64"
        },
        {
          "name": "failsafeTs",
          "type": "i64"
        },
        {
          "name": "hardExpiryTs",
          "type": "i64"
        },
        {
          "name": "minFillRaw",
          "type": "u64"
        },
        {
          "name": "srcMultiplierE9",
          "type": "u64"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "order",
      "discriminator": [
        134,
        173,
        223,
        185,
        77,
        86,
        28,
        51
      ]
    }
  ],
  "events": [
    {
      "name": "orderCancelled",
      "discriminator": [
        108,
        56,
        128,
        68,
        168,
        113,
        168,
        239
      ]
    },
    {
      "name": "orderExpired",
      "discriminator": [
        241,
        55,
        48,
        196,
        160,
        51,
        40,
        213
      ]
    },
    {
      "name": "orderFilled",
      "discriminator": [
        120,
        124,
        109,
        66,
        249,
        116,
        174,
        30
      ]
    },
    {
      "name": "orderPlaced",
      "discriminator": [
        96,
        130,
        204,
        234,
        169,
        219,
        216,
        227
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "paused",
      "msg": "Paused mint"
    },
    {
      "code": 6001,
      "name": "hookAttached",
      "msg": "Transfer hook is attached"
    },
    {
      "code": 6002,
      "name": "feeUnaccounted",
      "msg": "Post-fee amount mismatch"
    },
    {
      "code": 6003,
      "name": "underDelivery",
      "msg": "Fill under-delivers destination tokens"
    },
    {
      "code": 6004,
      "name": "unauthorized",
      "msg": "Unauthorized"
    },
    {
      "code": 6005,
      "name": "statusClosed",
      "msg": "Order is closed"
    },
    {
      "code": 6006,
      "name": "tooEarlyExpire",
      "msg": "Too early to expire"
    },
    {
      "code": 6007,
      "name": "fillTooSmall",
      "msg": "Fill below minimum"
    },
    {
      "code": 6008,
      "name": "overflow",
      "msg": "Arithmetic overflow"
    },
    {
      "code": 6009,
      "name": "zeroAmount",
      "msg": "Zero amount"
    },
    {
      "code": 6010,
      "name": "invalidRatio",
      "msg": "Invalid ratio"
    },
    {
      "code": 6011,
      "name": "invalidTimestamps",
      "msg": "Invalid timestamps"
    },
    {
      "code": 6012,
      "name": "mintsMustDiffer",
      "msg": "Source and destination mints must differ"
    },
    {
      "code": 6013,
      "name": "wrongTokenProgram",
      "msg": "Wrong token program"
    },
    {
      "code": 6014,
      "name": "invalidMint",
      "msg": "Invalid mint account"
    },
    {
      "code": 6015,
      "name": "insufficientEscrow",
      "msg": "Insufficient escrow"
    },
    {
      "code": 6016,
      "name": "hardExpired",
      "msg": "Past hard expiry; use expire"
    },
    {
      "code": 6017,
      "name": "staleMultiplier",
      "msg": "Place-time multiplier disagrees with live mint; v1 pins at place"
    }
  ],
  "types": [
    {
      "name": "order",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "srcMint",
            "type": "pubkey"
          },
          {
            "name": "dstMint",
            "type": "pubkey"
          },
          {
            "name": "escrowAta",
            "type": "pubkey"
          },
          {
            "name": "nonce",
            "type": "u64"
          },
          {
            "name": "srcDecimals",
            "type": "u8"
          },
          {
            "name": "dstDecimals",
            "type": "u8"
          },
          {
            "name": "srcMultiplierE9",
            "type": "u64"
          },
          {
            "name": "escrowedRaw",
            "type": "u64"
          },
          {
            "name": "filledRaw",
            "type": "u64"
          },
          {
            "name": "minRatioE9",
            "type": "u64"
          },
          {
            "name": "failsafeFloorE9",
            "type": "u64"
          },
          {
            "name": "failsafeTs",
            "type": "i64"
          },
          {
            "name": "hardExpiryTs",
            "type": "i64"
          },
          {
            "name": "minFillRaw",
            "type": "u64"
          },
          {
            "name": "status",
            "type": "u8"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "orderCancelled",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "order",
            "type": "pubkey"
          },
          {
            "name": "owner",
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "orderExpired",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "order",
            "type": "pubkey"
          },
          {
            "name": "owner",
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "orderFilled",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "order",
            "type": "pubkey"
          },
          {
            "name": "filler",
            "type": "pubkey"
          },
          {
            "name": "srcDelta",
            "type": "u64"
          },
          {
            "name": "dstDelta",
            "type": "u64"
          },
          {
            "name": "ratioE9",
            "type": "u64"
          },
          {
            "name": "failsafeUsed",
            "type": "bool"
          }
        ]
      }
    },
    {
      "name": "orderPlaced",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "order",
            "type": "pubkey"
          },
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "srcMint",
            "type": "pubkey"
          },
          {
            "name": "dstMint",
            "type": "pubkey"
          },
          {
            "name": "escrowedRaw",
            "type": "u64"
          },
          {
            "name": "minRatioE9",
            "type": "u64"
          },
          {
            "name": "failsafeFloorE9",
            "type": "u64"
          },
          {
            "name": "failsafeTs",
            "type": "i64"
          },
          {
            "name": "hardExpiryTs",
            "type": "i64"
          }
        ]
      }
    }
  ]
};
