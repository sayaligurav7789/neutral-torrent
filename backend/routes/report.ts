import { Request, Response } from "express";
import { ethers } from "ethers";
import config from "../config/index";
import { recoverReceiptSigner } from "../utils/signatures";
import {
  isUserRegistered,
  updateReputation,
  getUserReputation,
  formatRatio,
} from "../utils/contract";
import { trackAddress } from "../tracker/userRegistry";

/**
 * Receipt as submitted by the frontend.
 */
interface Receipt {
  infohash: string;
  sender: string;
  receiver: string;
  pieceHash: string;
  pieceIndex: number;
  pieceSize: number;
  timestamp: number;
  signature: string;
}

// In-memory replay-attack prevention.
// Maps `${receiver}-${infohash}-${pieceIndex}-${timestamp}` → true.
// Entries are pruned lazily when they are older than TIMESTAMP_WINDOW_SECONDS.
const seenReceipts = new Map<string, number>();

function pruneSeenReceipts(): void {
  const cutoff = Math.floor(Date.now() / 1000) - config.timestampWindowSeconds;
  for (const [key, ts] of seenReceipts) {
    if (ts < cutoff) seenReceipts.delete(key);
  }
}

/**
 * POST /report
 *
 * Body: Receipt (see interface above)
 *
 * 1. Validates all required fields.
 * 2. Checks timestamp freshness (within the configured window).
 * 3. Verifies receiver's ECDSA signature over the receipt fields.
 * 4. Checks for duplicate receipt (replay attack).
 * 5. Confirms both sender and receiver are registered on-chain.
 * 6. Updates both users' reputation on-chain.
 */
export async function reportHandler(req: Request, res: Response): Promise<void> {
  const receipt = req.body as Partial<Receipt>;

  // ── Input validation ──────────────────────────────────────────────────────
  const {
    infohash,
    sender,
    receiver,
    pieceHash,
    pieceIndex,
    pieceSize,
    timestamp,
    signature,
  } = receipt;

  if (
    !infohash || !sender || !receiver || !pieceHash ||
    pieceIndex === undefined || pieceSize === undefined ||
    timestamp === undefined || !signature
  ) {
    res.status(400).json({ error: "All receipt fields are required" });
    return;
  }

  if (!ethers.isAddress(sender) || !ethers.isAddress(receiver)) {
    res.status(400).json({ error: "Invalid sender or receiver address" });
    return;
  }

  if (sender.toLowerCase() === receiver.toLowerCase()) {
    res.status(400).json({ error: "Sender and receiver must be different" });
    return;
  }

  if (typeof pieceSize !== "number" || pieceSize <= 0) {
    res.status(400).json({ error: "pieceSize must be a positive number" });
    return;
  }

  // ── Timestamp freshness ───────────────────────────────────────────────────
  const nowSeconds = Math.floor(Date.now() / 1000);
  if (Math.abs(nowSeconds - timestamp) > config.timestampWindowSeconds) {
    res.status(400).json({ error: "Receipt timestamp is outside the allowed window" });
    return;
  }

  // ── Signature verification ────────────────────────────────────────────────
  let recoveredAddress: string;
  try {
    recoveredAddress = recoverReceiptSigner(
      infohash,
      sender,
      receiver,
      pieceHash,
      pieceIndex,
      pieceSize,
      timestamp,
      signature
    );
  } catch {
    res.status(400).json({ error: "Malformed signature" });
    return;
  }

  if (recoveredAddress.toLowerCase() !== receiver.toLowerCase()) {
    res.status(401).json({ error: "Signature is not from the receiver" });
    return;
  }

  // ── Replay detection (check only — record after success) ──────────────────
  pruneSeenReceipts();
  const receiptKey = `${receiver.toLowerCase()}-${infohash}-${pieceIndex}-${timestamp}`;
  if (seenReceipts.has(receiptKey)) {
    res.status(409).json({ error: "Duplicate receipt — replay attack detected" });
    return;
  }

  // ── Contract interaction ──────────────────────────────────────────────────
  try {
    const [senderRegistered, receiverRegistered] = await Promise.all([
      isUserRegistered(sender),
      isUserRegistered(receiver),
    ]);

    if (!senderRegistered) {
      res.status(404).json({ error: "Sender is not registered" });
      return;
    }
    if (!receiverRegistered) {
      res.status(404).json({ error: "Receiver is not registered" });
      return;
    }

    const pieceSizeBig = BigInt(pieceSize);

    // Update sender (upload) then receiver (download) sequentially.
    // Both use the same signer wallet, so parallel sends cause nonce collisions.
    const senderReceipt = await updateReputation(sender, pieceSizeBig, 0n);
    const receiverReceipt = await updateReputation(receiver, 0n, pieceSizeBig);

    // Record receipt only after successful on-chain update to avoid
    // blocking future valid retries caused by ephemeral errors.
    seenReceipts.set(receiptKey, timestamp);
    trackAddress(sender);
    trackAddress(receiver);

    // Read updated reputation for the response.
    const [senderRep, receiverRep] = await Promise.all([
      getUserReputation(sender),
      getUserReputation(receiver),
    ]);

    const senderRatio = senderRep.downloadBytes > 0n
      ? formatRatio((senderRep.uploadBytes * BigInt(1e18)) / senderRep.downloadBytes)
      : Infinity;

    const receiverRatio = receiverRep.downloadBytes > 0n
      ? formatRatio((receiverRep.uploadBytes * BigInt(1e18)) / receiverRep.downloadBytes)
      : Infinity;

    res.status(200).json({
      success: true,
      sender: {
        address: sender,
        ratio: isFinite(senderRatio) ? senderRatio : null,
        uploadBytes: senderRep.uploadBytes.toString(),
        downloadBytes: senderRep.downloadBytes.toString(),
      },
      receiver: {
        address: receiver,
        ratio: isFinite(receiverRatio) ? receiverRatio : null,
        uploadBytes: receiverRep.uploadBytes.toString(),
        downloadBytes: receiverRep.downloadBytes.toString(),
      },
      senderTxHash: senderReceipt.hash,
      receiverTxHash: receiverReceipt.hash,
    });
  } catch (err) {
    console.error("[/report] Contract error:", err);
    res.status(500).json({ error: "Failed to update reputation on-chain" });
  }
}
