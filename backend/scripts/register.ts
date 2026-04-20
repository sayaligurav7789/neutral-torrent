/**
 * scripts/register.ts
 *
 * Registers the deployer wallet on-chain via the backend /register endpoint.
 * The script signs a registration message with DEPLOYER_PRIVATE_KEY, sends
 * the signed request to the backend, and prints the result.
 *
 * Usage:
 *   npx tsx scripts/register.ts
 */

import { ethers } from 'ethers';
import 'dotenv/config';

const BASE_URL = `http://localhost:${process.env['PORT'] ?? 3001}`;

const privateKey = process.env['DEPLOYER_PRIVATE_KEY'];
if (!privateKey) {
  throw new Error('DEPLOYER_PRIVATE_KEY not set in .env');
}

const wallet = new ethers.Wallet(privateKey);

const message = JSON.stringify({
  action: 'register',
  timestamp: Math.floor(Date.now() / 1000),
});

const signature = await wallet.signMessage(message);

console.log(`Registering address: ${wallet.address}`);
console.log(`Sending request to:  ${BASE_URL}/register\n`);

const res = await fetch(`${BASE_URL}/register`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userAddress: wallet.address,
    message,
    signature,
  }),
});

const body = await res.json();

if (res.ok) {
  console.log('Registration successful!');
  console.log(`  tx hash:        ${body.txHash}`);
  console.log(`  initial credit: ${body.initialCredit / 1_073_741_824} GB`);
} else {
  console.error(`Registration failed (HTTP ${res.status}): ${body.error}`);
  process.exit(1);
}
