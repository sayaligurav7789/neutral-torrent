/**
 * scripts/migrate.ts
 *
 * Controlled migration: deploys a new ReputationTracker via RepFactory,
 * linking it to the current contract as its REFERRER so that existing
 * reputation is immediately available through single-hop delegation.
 *
 * Usage:
 *   npm run migrate
 *   npm run migrate -- --old-contract 0x<address>
 *
 * Prerequisites:
 *   DEPLOYER_PRIVATE_KEY, RPC_URL, FACTORY_ADDRESS, and
 *   REPUTATION_TRACKER_ADDRESS all set in backend/.env.
 */

import { ethers } from 'ethers';
import 'dotenv/config';

// ── Parse optional --old-contract flag ───────────────────────────────────────

const args = process.argv.slice(2);
const contractFlagIdx = args.indexOf('--old-contract');
const explicitOldContract =
  contractFlagIdx !== -1 ? args[contractFlagIdx + 1] : undefined;

// ── Environment ───────────────────────────────────────────────────────────────

const rpcUrl =
  process.env['RPC_URL'] ??
  process.env['ETH_SEPOLIA_RPC_URL'] ??
  'https://rpc.sepolia.org';

const privateKey = process.env['DEPLOYER_PRIVATE_KEY'];
const factoryAddress = process.env['FACTORY_ADDRESS'];
const currentTrackerAddress = process.env['REPUTATION_TRACKER_ADDRESS'];

if (!privateKey) {
  console.error('Error: DEPLOYER_PRIVATE_KEY not set in .env');
  process.exit(1);
}

if (!factoryAddress || factoryAddress === ethers.ZeroAddress) {
  console.error('Error: FACTORY_ADDRESS not set in .env');
  process.exit(1);
}

const oldContract = explicitOldContract ?? currentTrackerAddress;

if (!oldContract) {
  console.error(
    'Error: REPUTATION_TRACKER_ADDRESS not set in .env\n' +
      '       (or pass --old-contract 0x<address> explicitly)'
  );
  process.exit(1);
}

// ── Connect ───────────────────────────────────────────────────────────────────

const provider = new ethers.JsonRpcProvider(rpcUrl);
const wallet = new ethers.Wallet(privateKey, provider);

const REP_FACTORY_ABI = [
  'function deployNewTracker(address _referrer) external returns (address)',
  'event NewReputationTracker(address indexed newContract, address indexed referrer, address indexed caller)',
];

const repFactory = new ethers.Contract(factoryAddress, REP_FACTORY_ABI, wallet);

// ── Migrate ───────────────────────────────────────────────────────────────────

console.log('=== PBTS Controlled Migration ===');
console.log(`Network     : ${rpcUrl}`);
console.log(`Deployer    : ${wallet.address}`);
console.log(`Factory     : ${factoryAddress}`);
console.log(`Old contract: ${oldContract}\n`);

console.log('Deploying new ReputationTracker...');
const tx: ethers.TransactionResponse = await repFactory['deployNewTracker'](oldContract);
const receipt = await tx.wait();
if (!receipt) {
  console.error('Error: Migration transaction receipt is null');
  process.exit(1);
}

const iface = new ethers.Interface(REP_FACTORY_ABI);
let newTrackerAddress: string | null = null;
for (const log of receipt.logs) {
  try {
    const parsed = iface.parseLog({ topics: log.topics as string[], data: log.data });
    if (parsed && parsed.name === 'NewReputationTracker') {
      newTrackerAddress = parsed.args[0] as string;
      break;
    }
  } catch {
    // skip logs from other contracts
  }
}

if (!newTrackerAddress) {
  console.error('Error: NewReputationTracker event not found in migration receipt');
  process.exit(1);
}

// ── Summary ───────────────────────────────────────────────────────────────────

console.log(`✓ New ReputationTracker deployed: ${newTrackerAddress}`);
console.log(`  REFERRER points to            : ${oldContract}`);
console.log(
  '\nReputation from the old contract is immediately available via single-hop'
);
console.log('delegation — no data migration required.\n');
console.log('=== Next Steps ===');
console.log('1. Update REPUTATION_TRACKER_ADDRESS in backend/.env:');
console.log(`\n     REPUTATION_TRACKER_ADDRESS=${newTrackerAddress}\n`);
console.log('2. Restart the tracker server:');
console.log('     npm run start');
