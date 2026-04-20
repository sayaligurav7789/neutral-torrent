/**
 * scripts/announce.ts
 *
 * Announces to the tracker via the backend /announce endpoint.
 * The script signs an announce message with DEPLOYER_PRIVATE_KEY, sends
 * the signed request to the backend, and prints the peer list and reputation.
 *
 * Usage:
 *   npx tsx scripts/announce.ts [infohash] [event]
 *
 * Defaults:
 *   infohash = abc123def456
 *   event    = started
 */

import { ethers } from 'ethers';
import 'dotenv/config';

const BASE_URL = `http://localhost:${process.env['PORT'] ?? 3001}`;

const privateKey = process.env['DEPLOYER_PRIVATE_KEY'];
if (!privateKey) {
  throw new Error('DEPLOYER_PRIVATE_KEY not set in .env');
}

const wallet = new ethers.Wallet(privateKey);

const infohash = process.argv[2] ?? 'abc123def456';
const event    = process.argv[3] ?? 'started';

const message = JSON.stringify({
  infohash,
  event,
  timestamp: Math.floor(Date.now() / 1000),
});

const signature = await wallet.signMessage(message);

console.log(`Announcing as: ${wallet.address}`);
console.log(`Infohash:      ${infohash}`);
console.log(`Event:         ${event}`);
console.log(`Sending to:    ${BASE_URL}/announce\n`);

const res = await fetch(`${BASE_URL}/announce`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userAddress: wallet.address,
    infohash,
    event,
    message,
    signature,
  }),
});

const body = await res.json();

if (res.ok) {
  console.log(`Status:        ${body.status}`);
  console.log(`Message:       ${body.message}`);
  console.log(`Upload:        ${(Number(body.uploadBytes) / 1_073_741_824).toFixed(3)} GB`);
  console.log(`Download:      ${(Number(body.downloadBytes) / 1_073_741_824).toFixed(3)} GB`);
  console.log(`Ratio:         ${body.ratio ?? 'N/A'}`);
  console.log(`Peers:         ${JSON.stringify(body.peers, null, 2)}`);
} else {
  console.error(`Announce failed (HTTP ${res.status}): ${body.error}`);
  process.exit(1);
}
