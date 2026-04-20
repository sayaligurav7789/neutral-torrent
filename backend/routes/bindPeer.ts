import { Request, Response } from "express";
import { ethers } from "ethers";
import { assertSigner } from "../utils/signatures";
import { peerRegistry } from "../tracker/peerRegistry";

/**
 * POST /bind-peer
 *
 * Body: { userAddress: string, peerId: string, message: string, signature: string }
 *
 * Links a WebTorrent peer_id to an Ethereum address so the BT tracker's
 * filter can resolve the peer's on-chain reputation.
 *
 * The message must be signed by `userAddress` to prove ownership.
 */
export async function bindPeerHandler(req: Request, res: Response): Promise<void> {
  const { userAddress, peerId, message, signature } = req.body as {
    userAddress?: string;
    peerId?: string;
    message?: string;
    signature?: string;
  };

  // ── Input validation ──────────────────────────────────────────────────────
  if (!userAddress || !peerId || !message || !signature) {
    res.status(400).json({
      error: "userAddress, peerId, message, and signature are required",
    });
    return;
  }

  if (!ethers.isAddress(userAddress)) {
    res.status(400).json({ error: "Invalid Ethereum address" });
    return;
  }

  // peer_id from WebTorrent is a 20-byte value represented as 40 hex chars.
  if (!/^[0-9a-fA-F]{40}$/.test(peerId)) {
    res.status(400).json({
      error: "peerId must be a 40-character hex string (20 bytes)",
    });
    return;
  }

  // ── Signature verification ────────────────────────────────────────────────
  try {
    assertSigner(message, signature, userAddress);
  } catch {
    res.status(401).json({ error: "Invalid signature" });
    return;
  }

  // ── Bind ──────────────────────────────────────────────────────────────────
  peerRegistry.bind(peerId, userAddress);

  res.status(200).json({
    success: true,
    peerId,
    userAddress,
  });
}
