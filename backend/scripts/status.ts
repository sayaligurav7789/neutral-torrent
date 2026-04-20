/**
 * scripts/status.ts
 *
 * Shows the current ReputationTracker contract information:
 *   - Contract address, OWNER, authorized tracker backend
 *   - REFERRER chain (up to 10 hops)
 *   - Reputation for an optional sample address
 *
 * Usage:
 *   npm run status
 *   npm run status -- --address 0x<ethereum-address>
 *
 * Prerequisites:
 *   RPC_URL and REPUTATION_TRACKER_ADDRESS set in backend/.env.
 */

import { ethers } from 'ethers';
import 'dotenv/config';

// ── Parse optional --address flag ────────────────────────────────────────────

const args = process.argv.slice(2);
const addrFlagIdx = args.indexOf('--address');
const sampleAddress = addrFlagIdx !== -1 ? args[addrFlagIdx + 1] : undefined;

// ── Environment ───────────────────────────────────────────────────────────────

const rpcUrl =
  process.env['RPC_URL'] ??
  process.env['ETH_SEPOLIA_RPC_URL'] ??
  'https://rpc.sepolia.org';

const contractAddress = process.env['REPUTATION_TRACKER_ADDRESS'];

if (!contractAddress) {
  console.error('Error: REPUTATION_TRACKER_ADDRESS not set in .env');
  process.exit(1);
}

// ── Connect ───────────────────────────────────────────────────────────────────

const provider = new ethers.JsonRpcProvider(rpcUrl);

const TRACKER_ABI = [
  'function REFERRER() external view returns (address)',
  'function tracker() external view returns (address)',
  'function getReputation(address user) external view returns (tuple(uint256 uploadBytes, uint256 downloadBytes, uint256 lastUpdated))',
  'function getRatio(address user) external view returns (uint256)',
];

// ── Status ────────────────────────────────────────────────────────────────────

console.log('=== PBTS Status ===');
console.log(`Network : ${rpcUrl}`);
console.log(`Contract: ${contractAddress}\n`);

const contract = new ethers.Contract(contractAddress, TRACKER_ABI, provider);

const [tracker, referrer] = await Promise.all([
  contract['tracker']() as Promise<string>,
  contract['REFERRER']() as Promise<string>,
]);

console.log('Contract Info:');
console.log(`  tracker : ${tracker}`);
console.log(
  `  REFERRER: ${referrer === ethers.ZeroAddress ? '(none — genesis contract)' : referrer}`
);

// Walk the referrer chain (single-hop design; display up to 10 hops for safety)
if (referrer !== ethers.ZeroAddress) {
  console.log('\nReferrer Chain:');
  console.log(`  ${contractAddress}  ← current`);

  let current = referrer;
  let depth = 0;

  while (current !== ethers.ZeroAddress && depth < 10) {
    console.log(`  ${current}  ← referrer`);
    try {
      const parentContract = new ethers.Contract(current, TRACKER_ABI, provider);
      current = (await parentContract['REFERRER']()) as string;
      depth++;
    } catch {
      break;
    }
  }

  if (current === ethers.ZeroAddress) {
    console.log('  (genesis — no further referrer)');
  }
}

// Reputation for a sample address
if (sampleAddress) {
  console.log(`\nReputation for ${sampleAddress}:`);
  try {
    const [rep, ratioScaled] = await Promise.all([
      contract['getReputation'](sampleAddress) as Promise<{
        uploadBytes: bigint;
        downloadBytes: bigint;
        lastUpdated: bigint;
      }>,
      contract['getRatio'](sampleAddress) as Promise<bigint>,
    ]);

    const GB = 1_073_741_824n;
    const ratio =
      ratioScaled === ethers.MaxUint256
        ? 'Infinity'
        : (Number(ratioScaled) / 1e18).toFixed(4);

    console.log(`  Upload    : ${(Number(rep.uploadBytes) / Number(GB)).toFixed(3)} GB`);
    console.log(`  Download  : ${(Number(rep.downloadBytes) / Number(GB)).toFixed(3)} GB`);
    console.log(`  Ratio     : ${ratio}`);
    console.log(
      `  Registered: ${
        rep.lastUpdated > 0n
          ? new Date(Number(rep.lastUpdated) * 1000).toISOString()
          : 'no'
      }`
    );
  } catch (err: unknown) {
    console.error(`  Error fetching reputation: ${(err as Error).message}`);
  }
}
