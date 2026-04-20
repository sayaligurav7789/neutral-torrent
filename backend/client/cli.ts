#!/usr/bin/env node
/**
 * PBTS CLI — demo tool for the Persistent BitTorrent Tracker System.
 *
 * Usage:
 *   npx tsx client/cli.ts register
 *   npx tsx client/cli.ts seed <file>
 *   npx tsx client/cli.ts download <magnet-or-infohash>
 *   npx tsx client/cli.ts status
 *
 * Environment:
 *   PRIVATE_KEY          — Ethereum private key for this client
 *   PBTS_API_URL         — Express API  (default: http://localhost:3001)
 *   PBTS_TRACKER_URL     — BT tracker   (default: ws://localhost:8000)
 */

import "dotenv/config";
import path from "node:path";
import fs from "node:fs";
import { PBTSClient } from "./index";

// ── Config ──────────────────────────────────────────────────────────────────
const PRIVATE_KEY = process.env.PRIVATE_KEY;
if (!PRIVATE_KEY) {
  console.error("Error: PRIVATE_KEY environment variable is required");
  process.exit(1);
}

const API_URL = process.env.PBTS_API_URL ?? "http://localhost:3001";
const TRACKER_URL = process.env.PBTS_TRACKER_URL ?? "ws://localhost:8000";

const client = new PBTSClient({
  privateKey: PRIVATE_KEY,
  apiUrl: API_URL,
  announceUrl: TRACKER_URL,
});

// ── Commands ────────────────────────────────────────────────────────────────
const [command, ...args] = process.argv.slice(2);

async function main() {
  console.log(`[PBTS CLI] Address: ${client.address}`);
  console.log(`[PBTS CLI] API:     ${API_URL}`);
  console.log(`[PBTS CLI] Tracker: ${TRACKER_URL}\n`);

  switch (command) {
    case "register":
      await cmdRegister();
      break;
    case "seed":
      await cmdSeed(args[0]);
      break;
    case "download":
      await cmdDownload(args[0]);
      break;
    case "status":
      await cmdStatus();
      break;
    default:
      console.log("Usage:");
      console.log("  npx tsx client/cli.ts register");
      console.log("  npx tsx client/cli.ts seed <file>");
      console.log("  npx tsx client/cli.ts download <magnet-or-infohash>");
      console.log("  npx tsx client/cli.ts status");
      process.exit(1);
  }
}

async function cmdRegister() {
  console.log("Registering on-chain...");
  try {
    const result = await client.register();
    console.log("Registration result:", JSON.stringify(result, null, 2));
  } catch (err: any) {
    console.error("Registration failed:", err.message);
  }

  console.log("\nBinding peer_id to Ethereum address...");
  try {
    await client.bindPeerId();
    console.log(`Bound peer_id ${client.peerId.slice(0, 16)}... to ${client.address}`);
  } catch (err: any) {
    console.error("Peer binding failed:", err.message);
  }

  await client.destroy();
  process.exit(0);
}

async function cmdSeed(filePath?: string) {
  if (!filePath) {
    console.error("Error: file path required. Usage: seed <file>");
    process.exit(1);
  }

  const resolved = path.resolve(filePath);
  if (!fs.existsSync(resolved)) {
    console.error(`Error: file not found: ${resolved}`);
    process.exit(1);
  }

  // Bind peer_id first
  console.log("Binding peer_id...");
  await client.bindPeerId();

  console.log(`Seeding ${resolved}...`);
  const { infoHash, magnetURI } = await client.seed(resolved, {
    name: path.basename(resolved),
  });

  console.log(`\nSeeding active!`);
  console.log(`  Info hash: ${infoHash}`);
  console.log(`  Magnet:    ${magnetURI}`);
  console.log(`\nPress Ctrl+C to stop seeding.`);

  // Keep the process alive
  await new Promise(() => {});
}

async function cmdDownload(torrentId?: string) {
  if (!torrentId) {
    console.error("Error: magnet URI or info hash required. Usage: download <magnet>");
    process.exit(1);
  }

  // Bind peer_id first
  console.log("Binding peer_id...");
  await client.bindPeerId();

  console.log(`Downloading ${torrentId.slice(0, 60)}...\n`);

  let receiptCount = 0;
  const { infoHash } = await client.download(torrentId, (receipt, result) => {
    receiptCount++;
    console.log(
      `  Receipt #${receiptCount}: piece ${receipt.pieceIndex}, ` +
      `${receipt.pieceSize} bytes, sender=${receipt.sender.slice(0, 10)}...`
    );
  });

  console.log(`\nDownload complete! ${receiptCount} receipts submitted.`);
  console.log(`Info hash: ${infoHash}`);

  // Check status after download
  console.log("\nChecking updated reputation...");
  const status = await client.status();
  console.log(JSON.stringify(status, null, 2));

  await client.destroy();
  process.exit(0);
}

async function cmdStatus() {
  console.log("Querying reputation...\n");

  // Bind peer_id so the server can identify us
  await client.bindPeerId();

  const status = await client.status();
  console.log(JSON.stringify(status, null, 2));

  await client.destroy();
  process.exit(0);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
