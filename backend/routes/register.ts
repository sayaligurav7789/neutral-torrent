import { Request, Response } from "express";
import { ethers } from "ethers";
import { assertSigner } from "../utils/signatures";
import {
  isUserRegistered,
  registerUser,
} from "../utils/contract";
import { trackAddress } from "../tracker/userRegistry";

/**
 * POST /register
 *
 * Body: { userAddress: string, message: string, signature: string }
 *
 * Verifies that the caller owns `userAddress` by checking their EIP-191 signature
 * over `message`, then calls `ReputationTracker.register()` on-chain.
 */
export async function registerHandler(req: Request, res: Response): Promise<void> {
  const { userAddress, message, signature } = req.body as {
    userAddress?: string;
    message?: string;
    signature?: string;
  };

  // ── Input validation ──────────────────────────────────────────────────────
  if (!userAddress || !message || !signature) {
    res.status(400).json({ error: "userAddress, message, and signature are required" });
    return;
  }

  if (!ethers.isAddress(userAddress)) {
    res.status(400).json({ error: "Invalid Ethereum address" });
    return;
  }

  // ── Signature verification ────────────────────────────────────────────────
  try {
    assertSigner(message, signature, userAddress);
  } catch {
    res.status(401).json({ error: "Invalid signature" });
    return;
  }

  // ── Contract interaction ──────────────────────────────────────────────────
  try {
    const alreadyRegistered = await isUserRegistered(userAddress);
    if (alreadyRegistered) {
      res.status(409).json({ error: "User already registered" });
      return;
    }

    const receipt = await registerUser(userAddress);
    trackAddress(userAddress);
    res.status(201).json({
      success: true,
      userAddress,
      initialCredit: 1_073_741_824, // 1 GiB in bytes
      txHash: receipt.hash,
    });
  } catch (err) {
    console.error("[/register] Contract error:", err);
    res.status(500).json({ error: "Failed to register user on-chain" });
  }
}
