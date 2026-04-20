import { ethers } from "ethers";

/**
 * Receipt shape expected by the backend's POST /report endpoint.
 * Must match the Receipt interface in routes/report.ts exactly.
 */
export interface Receipt {
  infohash: string;   // bytes32 (0x-prefixed, 66 chars)
  sender: string;     // checksummed Ethereum address
  receiver: string;   // checksummed Ethereum address
  pieceHash: string;  // bytes32 keccak256 of piece data
  pieceIndex: number;
  pieceSize: number;  // bytes
  timestamp: number;  // unix epoch seconds
  signature: string;  // EIP-191 signature by receiver
}

/**
 * Wire-level download snapshot for piece attribution.
 */
interface WireSnapshot {
  peerId: string;
  downloaded: number;
}

/**
 * Generates and signs cryptographic receipts for downloaded pieces,
 * attributing each piece to the peer that contributed the most data.
 */
export class ReceiptGenerator {
  private wallet: ethers.Wallet;
  private apiUrl: string;
  private lastSnapshots = new Map<string, number>();

  constructor(wallet: ethers.Wallet, apiUrl: string) {
    this.wallet = wallet;
    this.apiUrl = apiUrl;
  }

  /**
   * Capture the current `wire.downloaded` value for each connected wire.
   * Call this once when the torrent starts and after each piece attribution.
   */
  snapshotWires(wires: Array<{ peerId?: string; downloaded: number }>): void {
    for (const wire of wires) {
      if (wire.peerId) {
        this.lastSnapshots.set(wire.peerId, wire.downloaded);
      }
    }
  }

  /**
   * Determine which peer contributed the most bytes since the last snapshot.
   * Returns the peerId with the largest download delta, or null if no
   * attribution is possible.
   */
  attributePiece(
    wires: Array<{ peerId?: string; downloaded: number }>
  ): { peerId: string; delta: number } | null {
    let bestPeer: string | null = null;
    let bestDelta = 0;

    const validWires = wires.filter((w) => !!w.peerId);

    for (const wire of validWires) {
      const prev = this.lastSnapshots.get(wire.peerId!) ?? 0;
      const delta = wire.downloaded - prev;
      if (delta > bestDelta) {
        bestDelta = delta;
        bestPeer = wire.peerId!;
      }
    }

    // Fallback: if no delta detected but exactly one peer is connected,
    // it must be the sender (common for small single-piece files where
    // wire.downloaded hasn't updated by the time "verified" fires).
    if (!bestPeer && validWires.length === 1) {
      bestPeer = validWires[0].peerId!;
      bestDelta = validWires[0].downloaded || 1;
    }

    // Update snapshots for next round
    this.snapshotWires(wires);

    return bestPeer ? { peerId: bestPeer, delta: bestDelta } : null;
  }

  /**
   * Build and sign a receipt for a verified piece.
   *
   * The signing scheme matches `recoverReceiptSigner()` in
   * `backend/utils/signatures.ts` — solidityPackedKeccak256 over the
   * seven receipt fields, then EIP-191 personal_sign of the hash bytes.
   */
  async generateReceipt(
    infoHash: string,
    senderAddress: string,
    pieceIndex: number,
    pieceData: Buffer | Uint8Array,
    pieceSize: number
  ): Promise<Receipt> {
    const receiver = this.wallet.address;
    const timestamp = Math.floor(Date.now() / 1000);

    // Hash the raw piece data for the receipt
    const pieceHash = ethers.keccak256(pieceData);

    // Pad the 20-byte infohash to bytes32 (BT infohashes are 20 bytes / 40 hex)
    const infohash = ethers.zeroPadValue("0x" + infoHash, 32);

    // Construct the same hash the backend will reconstruct for verification
    const hash = ethers.solidityPackedKeccak256(
      [
        "bytes32",
        "address",
        "address",
        "bytes32",
        "uint256",
        "uint256",
        "uint256",
      ],
      [infohash, senderAddress, receiver, pieceHash, pieceIndex, pieceSize, timestamp]
    );

    // EIP-191 personal_sign over the hash bytes
    const signature = await this.wallet.signMessage(ethers.getBytes(hash));

    return {
      infohash,
      sender: senderAddress,
      receiver,
      pieceHash,
      pieceIndex,
      pieceSize,
      timestamp,
      signature,
    };
  }

  /**
   * Submit a signed receipt to the backend's POST /report endpoint.
   */
  async submitReceipt(receipt: Receipt): Promise<{ success: boolean; [key: string]: unknown }> {
    const res = await fetch(`${this.apiUrl}/report`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(receipt),
    });
    return res.json() as Promise<{ success: boolean; [key: string]: unknown }>;
  }
}
