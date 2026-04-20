/**
 * scripts/deploy.ts
 *
 * Full initial deployment: RepFactory + first ReputationTracker.
 *
 *   • If FACTORY_ADDRESS is not set (or is the zero address), a new RepFactory
 *     is deployed using the compiled artifact at ../contracts/out/.
 *   • Then calls RepFactory.deployNewTracker(address(0)) to create the first
 *     ReputationTracker with no referrer.
 *
 * Usage:
 *   npm run deploy
 *
 * Prerequisites:
 *   - DEPLOYER_PRIVATE_KEY and RPC_URL set in backend/.env
 *   - Contracts compiled: cd ../contracts && forge build
 */

import { ethers } from 'ethers';
import 'dotenv/config';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── Environment ───────────────────────────────────────────────────────────────

const rpcUrl =
  process.env['RPC_URL'] ??
  process.env['ETH_SEPOLIA_RPC_URL'] ??
  'https://rpc.sepolia.org';

const privateKey = process.env['DEPLOYER_PRIVATE_KEY'];
if (!privateKey) {
  console.error('Error: DEPLOYER_PRIVATE_KEY not set in .env');
  process.exit(1);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const OUT_DIR = path.resolve(__dirname, '../../contracts/out');

function loadArtifact(contractName: string): { abi: ethers.InterfaceAbi; bytecode: string } {
  const artifactPath = path.join(OUT_DIR, `${contractName}.sol`, `${contractName}.json`);
  if (!existsSync(artifactPath)) {
    console.error(`Error: Compiled artifact not found: ${artifactPath}`);
    console.error('Run the following first, then retry:');
    console.error('  cd ../contracts && forge build');
    process.exit(1);
  }
  const raw = JSON.parse(readFileSync(artifactPath, 'utf8'));
  return { abi: raw.abi as ethers.InterfaceAbi, bytecode: raw.bytecode.object as string };
}

const REP_FACTORY_ABI = [
  'function deployNewTracker(address _referrer) external returns (address)',
  'event NewReputationTracker(address indexed newContract, address indexed referrer, address indexed caller)',
];

// ── Deploy ────────────────────────────────────────────────────────────────────

const provider = new ethers.JsonRpcProvider(rpcUrl);
const wallet = new ethers.Wallet(privateKey, provider);

console.log('=== PBTS Initial Deployment ===');
console.log(`Network : ${rpcUrl}`);
console.log(`Deployer: ${wallet.address}\n`);

let factoryAddress = process.env['FACTORY_ADDRESS'];

// 1. Deploy RepFactory if not already configured
if (!factoryAddress || factoryAddress === ethers.ZeroAddress) {
  console.log('Deploying RepFactory...');
  const { abi, bytecode } = loadArtifact('RepFactory');
  const contractFactory = new ethers.ContractFactory(abi, bytecode, wallet);
  const deployed = await contractFactory.deploy();
  await deployed.waitForDeployment();
  factoryAddress = await deployed.getAddress();
  console.log(`✓ RepFactory deployed: ${factoryAddress}`);
} else {
  console.log(`Using existing RepFactory: ${factoryAddress}`);
}

// 2. Deploy first ReputationTracker via factory (no referrer)
console.log('\nDeploying first ReputationTracker...');
const repFactory = new ethers.Contract(factoryAddress, REP_FACTORY_ABI, wallet);
const tx: ethers.TransactionResponse = await repFactory['deployNewTracker'](ethers.ZeroAddress);
const receipt = await tx.wait();
if (!receipt) {
  console.error('Error: Deployment transaction receipt is null');
  process.exit(1);
}

const iface = new ethers.Interface(REP_FACTORY_ABI);
let trackerAddress: string | null = null;
for (const log of receipt.logs) {
  try {
    const parsed = iface.parseLog({ topics: log.topics as string[], data: log.data });
    if (parsed && parsed.name === 'NewReputationTracker') {
      trackerAddress = parsed.args[0] as string;
      break;
    }
  } catch {
    // skip logs from other contracts
  }
}

if (!trackerAddress) {
  console.error('Error: NewReputationTracker event not found in deployment receipt');
  process.exit(1);
}

console.log(`✓ ReputationTracker deployed: ${trackerAddress}`);

// ── Summary ───────────────────────────────────────────────────────────────────

console.log('\n=== Deployment Complete ===');
console.log('\nAdd the following to your backend/.env and restart the server:\n');
console.log(`  FACTORY_ADDRESS=${factoryAddress}`);
console.log(`  REPUTATION_TRACKER_ADDRESS=${trackerAddress}`);
console.log('\nThen start the tracker:');
console.log('  npm run start');
