import { writeFileSync, statSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const RPC = "https://api.mainnet-beta.solana.com";
const SO = resolve("target/deploy/tminus.so");
const PROGRAMDATA_HEADER = 45;
const BUFFER_HEADER = 37;
const PROGRAM_ACCOUNT = 36;

async function rpc(method, params) {
  const res = await fetch(RPC, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const body = await res.json();
  if (body.error) throw new Error(`${method}: ${JSON.stringify(body.error)}`);
  return body.result;
}

async function rent(bytes) {
  return rpc("getMinimumBalanceForRentExemption", [bytes]);
}

const soBytes = existsSync(SO) ? statSync(SO).size : 0;
const programDataBytes = PROGRAMDATA_HEADER + soBytes;
const bufferBytes = BUFFER_HEADER + soBytes;

const rentSysvar = await rpc("getAccountInfo", [
  "SysvarRent111111111111111111111111111111111",
  { encoding: "base64" },
]);
const rentRaw = Buffer.from(rentSysvar.value.data[0], "base64");
const lamportsPerByteYear = Number(rentRaw.readBigUInt64LE(0));
const exemptionThreshold = rentRaw.readDoubleLE(8);

const [soRent, programDataRent, bufferRent, programRent] = await Promise.all([
  rent(soBytes),
  rent(programDataBytes),
  rent(bufferBytes),
  rent(PROGRAM_ACCOUNT),
]);

const peakLamports = bufferRent + programDataRent + programRent;
const lockedLamports = programDataRent + programRent;
const feeBufferLamports = 20_000_000;
const minSafe = peakLamports + feeBufferLamports;

const out = {
  label: "MAINNET_DEPLOY_RENT",
  at: new Date().toISOString(),
  soBytes,
  layout: {
    programAccountBytes: PROGRAM_ACCOUNT,
    programDataHeader: PROGRAMDATA_HEADER,
    bufferHeader: BUFFER_HEADER,
    programDataBytes,
    bufferBytes,
  },
  rentSysvar: { lamportsPerByteYear, exemptionThreshold },
  lamports: {
    soOnly: soRent,
    programAccount: programRent,
    programData: programDataRent,
    buffer: bufferRent,
    peakDuringDeploy: peakLamports,
    lockedAfterDeploy: lockedLamports,
    feeBuffer: feeBufferLamports,
    minSafeDeploy: minSafe,
  },
  sol: {
    soOnly: soRent / 1e9,
    programAccount: programRent / 1e9,
    programData: programDataRent / 1e9,
    buffer: bufferRent / 1e9,
    peakDuringDeploy: peakLamports / 1e9,
    lockedAfterDeploy: lockedLamports / 1e9,
    feeBuffer: feeBufferLamports / 1e9,
    minSafeDeploy: minSafe / 1e9,
  },
  note: "solana program deploy keeps the buffer live until DeployWithMaxDataLen creates program+programdata, then closes the buffer to the payer. Peak SOL = buffer + programdata + program + fees. After success, buffer rent is refunded; locked SOL = programdata + program.",
};

writeFileSync(resolve("evidence/mainnet-deploy-rent.json"), JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 2));
