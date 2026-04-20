import { Request, Response } from "express";
import { ethers } from "ethers";
import config from "../config/index";
import { assertSigner } from "../utils/signatures";
import {
  isUserRegistered,
  getUserReputation,
  getUserRatio,
  formatRatio,
} from "../utils/contract";
import { peerRegistry } from "../tracker/peerRegistry";

// In-memory swarm: infohash → Set of active user addresses (lowercase).
export const swarm = new Map<string, Set<string>>();

/**
 * Build a peer list from the in-memory swarm, excluding the requesting user.
 * Falls back to a reference to the BT tracker port when no connection info
 * is available (peers connect via the BT tracker, not via this JSON API).
 */
function getSwarmPeers(
  infohash: string,
  excludeAddress: string
): Array<{ address: string; peerId: string | null }> {
  const members = swarm.get(infohash);
  if (!members) return [];

  return Array.from(members)
    .filter((addr) => addr !== excludeAddress.toLowerCase())
    .map((addr) => ({
      address: addr,
      peerId: peerRegistry.getPeerId(addr) ?? null,
    }));
}

/**
 * POST /announce
 *
 * Body:
 *   userAddress : string
 *   infohash    : string
 *   event       : "started" | "stopped" | "completed"
 *   message     : string   — the plaintext that was signed
 *   signature   : string   — EIP-191 personal_sign signature
 *
 * 1. Verifies the user's signature over `message`.
 * 2. Reads their on-chain reputation.
 * 3. If ratio ≥ MIN_RATIO → returns mock peer list.
 * 4. If ratio < MIN_RATIO → returns blocked response.
 */
export async function announceHandler(req: Request, res: Response): Promise<void> {
  const { userAddress, infohash, event, message, signature } = req.body as {
    userAddress?: string;
    infohash?: string;
    event?: string;
    message?: string;
    signature?: string;
  };

  // ── Input validation ──────────────────────────────────────────────────────
  if (!userAddress || !infohash || !event || !message || !signature) {
    res.status(400).json({
      error: "userAddress, infohash, event, message, and signature are required",
    });
    return;
  }

  if (!ethers.isAddress(userAddress)) {
    res.status(400).json({ error: "Invalid Ethereum address" });
    return;
  }

  const validEvents = ["started", "stopped", "completed"];
  if (!validEvents.includes(event)) {
    res.status(400).json({ error: `event must be one of: ${validEvents.join(", ")}` });
    return;
  }

  // ── Signature verification ────────────────────────────────────────────────
  try {
    assertSigner(message, signature, userAddress);
  } catch {
    res.status(401).json({ error: "Invalid signature" });
    return;
  }

  // ── Registration check ────────────────────────────────────────────────────
  try {
    const registered = await isUserRegistered(userAddress);
    if (!registered) {
      res.status(404).json({ error: "User is not registered" });
      return;
    }

    // ── Reputation check ────────────────────────────────────────────────────
    const [ratioScaled, reputation] = await Promise.all([
      getUserRatio(userAddress),
      getUserReputation(userAddress),
    ]);

    const ratio = formatRatio(ratioScaled);

    // Manage swarm membership
    if (!swarm.has(infohash)) swarm.set(infohash, new Set());
    const peers = swarm.get(infohash)!;

    if (event === "stopped") {
      peers.delete(userAddress.toLowerCase());
    } else {
      peers.add(userAddress.toLowerCase());
    }

    // Convert ratio to a comparable number (Infinity → treat as max)
    const ratioForCompare = isFinite(ratio) ? ratio : Number.MAX_SAFE_INTEGER;
    const accessGranted = ratioForCompare >= config.minRatio;

    if (!accessGranted) {
      const uploadGB = Number(reputation.uploadBytes) / 1_073_741_824;
      const downloadGB = Number(reputation.downloadBytes) / 1_073_741_824;
      // How many more bytes the user needs to upload to reach MIN_RATIO
      const bytesNeeded =
        reputation.downloadBytes > 0n
          ? Math.max(
              0,
              Math.ceil(
                config.minRatio * Number(reputation.downloadBytes) -
                  Number(reputation.uploadBytes)
              )
            )
          : 0;
      const mbNeeded = Math.ceil(bytesNeeded / 1_048_576);

      res.status(403).json({
        status: "blocked",
        peers: [],
        ratio: isFinite(ratio) ? ratio : null,
        uploadGB: parseFloat(uploadGB.toFixed(3)),
        downloadGB: parseFloat(downloadGB.toFixed(3)),
        message: `Insufficient ratio. You need to upload ${mbNeeded} MB more to regain access.`,
      });
      return;
    }

    const peerList = getSwarmPeers(infohash, userAddress);

    res.status(200).json({
      status: "allowed",
      peers: peerList,
      peerCount: peerList.length,
      ratio: isFinite(ratio) ? ratio : null,
      uploadBytes: reputation.uploadBytes.toString(),
      downloadBytes: reputation.downloadBytes.toString(),
      trackerPort: config.trackerPort,
      message: "Access granted. Happy seeding!",
    });
  } catch (err) {
    console.error("[/announce] Contract error:", err);
    res.status(500).json({ error: "Failed to read reputation from chain" });
  }
}
