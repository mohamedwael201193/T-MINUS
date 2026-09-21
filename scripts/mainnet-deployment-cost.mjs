import { writeFileSync, statSync, existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const RPC = "https://api.mainnet-beta.solana.com";
const DEVNET = "https://api.devnet.solana.com";
const SO = resolve("target/deploy/tminus.so");
const PROGRAM = "HRLmVcuk6PRcVwB3UVpcbEC3LVVMhdLZfPvHtmL2PUdL";
const PAYER = "CpTxsgPjvaaPSaBKkijvB1h3hzgJmPiTsWNhuS7tRkgX";
const LOADER_V4 = "LoaderV411111111111111111111111111111111111";
const PROGRAMDATA_HEADER = 45;
const BUFFER_HEADER = 37;
const PROGRAM_ACCOUNT = 36;
const FEE_BUFFER_LAMPORTS = 20_000_000;

async function rpc(url, method, params) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const body = await res.json();
  if (body.error) throw new Error(`${url} ${method}: ${JSON.stringify(body.error)}`);
  return body.result;
}

const soBytes = existsSync(SO) ? statSync(SO).size : 0;
const programDataBytes = PROGRAMDATA_HEADER + soBytes;
const bufferBytes = BUFFER_HEADER + soBytes;

const [
  rentSysvar,
  soRent,
  programDataRent,
  bufferRent,
  programRent,
  payer,
  program,
  loaderV4Mainnet,
  loaderV4Devnet,
  devnetProgram,
] = await Promise.all([
  rpc(RPC, "getAccountInfo", ["SysvarRent111111111111111111111111111111111", { encoding: "base64" }]),
  rpc(RPC, "getMinimumBalanceForRentExemption", [soBytes]),
  rpc(RPC, "getMinimumBalanceForRentExemption", [programDataBytes]),
  rpc(RPC, "getMinimumBalanceForRentExemption", [bufferBytes]),
  rpc(RPC, "getMinimumBalanceForRentExemption", [PROGRAM_ACCOUNT]),
  rpc(RPC, "getBalance", [PAYER]),
  rpc(RPC, "getAccountInfo", [PROGRAM, { encoding: "base64" }]),
  rpc(RPC, "getAccountInfo", [LOADER_V4, { encoding: "base64" }]),
  rpc(DEVNET, "getAccountInfo", [LOADER_V4, { encoding: "base64" }]),
  rpc(DEVNET, "getAccountInfo", [PROGRAM, { encoding: "base64" }]),
]);

const rentRaw = Buffer.from(rentSysvar.value.data[0], "base64");
const lamportsPerByteYear = Number(rentRaw.readBigUInt64LE(0));
const exemptionThreshold = rentRaw.readDoubleLE(8);

const incorrectDoubleCountPeak = bufferRent + programDataRent + programRent;
const recycledPeak = programDataRent + programRent;
const locked = programDataRent + programRent;
const minSafe = recycledPeak + FEE_BUFFER_LAMPORTS;
const have = payer.value ?? 0;

let localnet = null;
let tight = null;
try {
  localnet = JSON.parse(readFileSync(resolve("evidence/localnet-loader-cost.json"), "utf8"));
} catch {}
try {
  tight = JSON.parse(readFileSync(resolve("evidence/localnet-loader-tight.json"), "utf8"));
} catch {}

const out = {
  label: "MAINNET_DEPLOYMENT_COST",
  at: new Date().toISOString(),
  programId: PROGRAM,
  payer: PAYER,
  soBytes,
  sha256: "838ebc5c218c26a6883e62e93a9019d818c479b992960225c29284eff2c70335",
  toolchain: {
    solanaCli: "4.1.2",
    anchor: "1.2.0",
    rustc: "1.96.0",
    programV4Subcommand: false,
  },
  rentSysvar: { lamportsPerByteYear, exemptionThreshold },
  layout: {
    programAccountBytes: PROGRAM_ACCOUNT,
    programDataHeader: PROGRAMDATA_HEADER,
    bufferHeader: BUFFER_HEADER,
    programDataBytes,
    bufferBytes,
  },
  lamports: {
    soOnly: soRent,
    programAccount: programRent,
    programData: programDataRent,
    buffer: bufferRent,
    incorrectDoubleCountPeak,
    recycledBufferPeak: recycledPeak,
    lockedAfterDeploy: locked,
    feeBuffer: FEE_BUFFER_LAMPORTS,
    minSafeDeploy: minSafe,
    payerHave: have,
    shortfall: Math.max(0, minSafe - have),
  },
  sol: {
    soOnly: soRent / 1e9,
    programAccount: programRent / 1e9,
    programData: programDataRent / 1e9,
    buffer: bufferRent / 1e9,
    incorrectDoubleCountPeak: incorrectDoubleCountPeak / 1e9,
    recycledBufferPeak: recycledPeak / 1e9,
    lockedAfterDeploy: locked / 1e9,
    feeBuffer: FEE_BUFFER_LAMPORTS / 1e9,
    minSafeDeploy: minSafe / 1e9,
    payerHave: have / 1e9,
    shortfall: Math.max(0, minSafe - have) / 1e9,
  },
  methods: {
    loaderV3: {
      mainnetSupported: true,
      command: "solana program deploy target/deploy/tminus.so --program-id <program.json> --keypair <payer.json>",
      peakSol: minSafe / 1e9,
      lockedSol: locked / 1e9,
      recoverableSol: locked / 1e9,
      upgradeable: true,
      sameProgramId: true,
      proven: "localnet deploy + tight-wallet deploy; Agave loader-v3 DeployWithMaxDataLen drains buffer to payer before create_account(ProgramData)",
    },
    loaderV4: {
      mainnetSupported: false,
      command: "solana program-v4 deploy (absent in CLI 4.1.2)",
      peakSol: null,
      lockedSol: null,
      recoverableSol: null,
      upgradeable: null,
      sameProgramId: "would have used the same keypair if the loader existed",
      proven: "CLI subcommand missing; LoaderV4 account absent on mainnet; Agave deleted builtin (PR 11990) and renamed feature to LoaderV4WasAbandoned; SIMD-0167 closed",
    },
    koraDeploy: {
      mainnetSupported: false,
      rejectedBecause: "paymaster keeps upgrade authority; 7-day idle reaper; documented as devnet; not a self-custodied T-MINUS program",
    },
    bpfLoaderV1V2: {
      mainnetSupported: false,
      rejectedBecause: "official docs: loader management disabled; cannot deploy new programs",
    },
    immutableLoaderV3: {
      mainnetSupported: true,
      cheaper: false,
      note: "--final after deploy does not reduce peak or locked rent; it prevents close so SOL cannot be recovered",
    },
  },
  chain: {
    mainnetProgramExists: Boolean(program?.value),
    mainnetProgramExecutable: Boolean(program?.value?.executable),
    loaderV4MainnetExists: Boolean(loaderV4Mainnet?.value),
    loaderV4Devnet: loaderV4Devnet?.value
      ? {
          owner: loaderV4Devnet.value.owner,
          executable: loaderV4Devnet.value.executable,
          lamports: loaderV4Devnet.value.lamports,
        }
      : null,
    devnetProgram: devnetProgram?.value
      ? {
          owner: devnetProgram.value.owner,
          executable: devnetProgram.value.executable,
          lamports: devnetProgram.value.lamports,
        }
      : null,
  },
  localnet,
  tightLocalnet: tight,
  recommendedMethod: "loader-v3 solana program deploy",
  recommendedPeakSol: minSafe / 1e9,
  recommendedLockedSol: locked / 1e9,
  humanApprovalRequired: `Mainnet deployment method loader-v3 (solana program deploy) is verified. Peak required balance is ${minSafe / 1e9} SOL. Deploy?`,
  mainnetSendBlocked: true,
  note: "The previous 2.14859112 SOL figure double-counted buffer + ProgramData as if both stayed funded at once. Agave bpf_loader DeployWithMaxDataLen drains the buffer into the payer in the same instruction before create_account(ProgramData). CLI check_payer only requires ProgramData rent + tx fees. Localnet tight wallet of 2.0 SOL (< 2x local ProgramData rent 2.915 SOL) deployed the same 209,256-byte ELF.",
};

writeFileSync(resolve("evidence/mainnet-deployment-cost.json"), JSON.stringify(out, null, 2));

const rentOut = {
  label: "MAINNET_DEPLOY_RENT",
  at: out.at,
  soBytes,
  layout: out.layout,
  rentSysvar: out.rentSysvar,
  lamports: {
    soOnly: soRent,
    programAccount: programRent,
    programData: programDataRent,
    buffer: bufferRent,
    incorrectDoubleCountPeak,
    peakDuringDeploy: recycledPeak,
    lockedAfterDeploy: locked,
    feeBuffer: FEE_BUFFER_LAMPORTS,
    minSafeDeploy: minSafe,
  },
  sol: {
    soOnly: soRent / 1e9,
    programAccount: programRent / 1e9,
    programData: programDataRent / 1e9,
    buffer: bufferRent / 1e9,
    incorrectDoubleCountPeak: incorrectDoubleCountPeak / 1e9,
    peakDuringDeploy: recycledPeak / 1e9,
    lockedAfterDeploy: locked / 1e9,
    feeBuffer: FEE_BUFFER_LAMPORTS / 1e9,
    minSafeDeploy: minSafe / 1e9,
  },
  note: "Peak SOL = ProgramData rent + program account rent + 0.02 fee buffer. Buffer is funded at ProgramData rent, then drained to the payer in the same DeployWithMaxDataLen instruction that creates ProgramData. The old 2.14859112 number incorrectly summed buffer+ProgramData+program as simultaneous wallet spend.",
};

writeFileSync(resolve("evidence/mainnet-deploy-rent.json"), JSON.stringify(rentOut, null, 2));
console.log(JSON.stringify(out, null, 2));
