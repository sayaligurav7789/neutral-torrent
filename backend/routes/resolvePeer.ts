import { Request, Response } from "express";
import { peerRegistry } from "../tracker/peerRegistry";

/**
 * GET /resolve-peer?peerId=<hex>
 *
 * Returns the Ethereum address associated with a BitTorrent peer_id.
 * Used by downloading clients to identify the sender when generating
 * cryptographic receipts.
 */
export async function resolvePeerHandler(req: Request, res: Response): Promise<void> {
  const peerId = req.query.peerId as string | undefined;

  if (!peerId) {
    res.status(400).json({ error: "peerId query parameter is required" });
    return;
  }

  if (!/^[0-9a-fA-F]{40}$/.test(peerId)) {
    res.status(400).json({
      error: "peerId must be a 40-character hex string (20 bytes)",
    });
    return;
  }

  const ethAddress = peerRegistry.getAddress(peerId);

  if (!ethAddress) {
    res.status(404).json({ error: "No Ethereum address bound to this peer_id" });
    return;
  }

  res.status(200).json({ ethAddress });
}
