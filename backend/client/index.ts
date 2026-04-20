import WebTorrent from "webtorrent";
import { ethers } from "ethers";
import { ReceiptGenerator, type Receipt } from "./receiptGenerator";

export interface PBTSClientOptions {
  /** Ethereum private key for signing receipts and peer binding. */
  privateKey: string;
  /** Express API URL, e.g. "http://localhost:3001" */
  apiUrl: string;
  /** BitTorrent tracker announce URL, e.g. "ws://localhost:8000" or "http://localhost:8000/announce" */
  announceUrl: string;
}

// A minimal wire type matching what WebTorrent / bittorrent-protocol exposes.
interface Wire {
  peerId: string;
  downloaded: number;
  remoteAddress?: string;
  remotePort?: number;
  on(event: string, fn: (...args: unknown[]) => void): void;
}

/**
 * WebTorrent client with PBTS integration.
 *
 * Wraps a standard WebTorrent client and adds:
 *  - Peer-id ↔ Ethereum address binding
 *  - Automatic cryptographic receipt generation on piece download
 *  - Receipt submission to the tracker backend
 */
export class PBTSClient {
  private wt: InstanceType<typeof WebTorrent>;
  private wallet: ethers.Wallet;
  private receiptGen: ReceiptGenerator;
  private opts: PBTSClientOptions;

  /** Cache of peerId → Ethereum address (avoids repeated /resolve-peer calls). */
  private peerAddressCache = new Map<string, string>();

  constructor(opts: PBTSClientOptions) {
    this.opts = opts;
    this.wallet = new ethers.Wallet(opts.privateKey);
    this.wt = new WebTorrent();
    this.receiptGen = new ReceiptGenerator(this.wallet, opts.apiUrl);
  }

  /** This client's hex-encoded peer_id. */
  get peerId(): string {
    return this.wt.peerId;
  }

  /** This client's Ethereum address. */
  get address(): string {
    return this.wallet.address;
  }

  // ────────────────────────────────────────────────────────────────────────
  // Registration & peer binding
  // ────────────────────────────────────────────────────────────────────────

  /**
   * Register the Ethereum address with the PBTS backend (POST /register).
   */
  async register(): Promise<{ success: boolean; txHash?: string }> {
    const message = `Register PBTS account: ${this.wallet.address}`;
    const signature = await this.wallet.signMessage(message);

    const res = await fetch(`${this.opts.apiUrl}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userAddress: this.wallet.address,
        message,
        signature,
      }),
    });

    return res.json() as Promise<{ success: boolean; txHash?: string }>;
  }

  /**
   * Bind this client's WebTorrent peer_id to the Ethereum address so the
   * BT tracker can resolve reputation during the filter callback.
   */
  async bindPeerId(): Promise<void> {
    const message = `Bind peer_id ${this.peerId} to PBTS account ${this.wallet.address}`;
    const signature = await this.wallet.signMessage(message);

    const res = await fetch(`${this.opts.apiUrl}/bind-peer`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userAddress: this.wallet.address,
        peerId: this.peerId,
        message,
        signature,
      }),
    });

    if (!res.ok) {
      const body = await res.json();
      throw new Error(`bind-peer failed: ${(body as { error?: string }).error}`);
    }
  }

  // ────────────────────────────────────────────────────────────────────────
  // Seeding
  // ────────────────────────────────────────────────────────────────────────

  /**
   * Seed a file (or Buffer) as a new torrent.
   * Returns the torrent object once seeding begins.
   */
  seed(
    input: string | Buffer | Uint8Array,
    opts: { name?: string } = {}
  ): Promise<{ infoHash: string; magnetURI: string; torrent: unknown }> {
    return new Promise((resolve, reject) => {
      this.wt.seed(
        input as any,
        { announce: [this.opts.announceUrl], ...opts } as any,
        (torrent: any) => {
          resolve({
            infoHash: torrent.infoHash,
            magnetURI: torrent.magnetURI,
            torrent,
          });
        }
      );

      this.wt.on("error", reject);
    });
  }

  // ────────────────────────────────────────────────────────────────────────
  // Downloading (with auto-receipt generation)
  // ────────────────────────────────────────────────────────────────────────

  /**
   * Download a torrent and automatically generate signed receipts for each
   * verified piece.
   *
   * @param torrentId  Magnet URI, info hash, or .torrent buffer
   * @param onReceipt  Optional callback invoked after each receipt is submitted
   */
  download(
    torrentId: string | Buffer,
    onReceipt?: (receipt: Receipt, result: unknown) => void
  ): Promise<{ infoHash: string; torrent: unknown }> {
    return new Promise((resolve, reject) => {
      const torrent: any = this.wt.add(torrentId as any, {
        announce: [this.opts.announceUrl],
      } as any);

      const activeWires: Wire[] = [];
      const pendingReceipts: Promise<void>[] = [];

      // Track peer connections for piece attribution
      torrent.on("wire", (wire: Wire) => {
        activeWires.push(wire);
        console.log(
          `[PBTS] Peer connected: ${wire.peerId?.slice(0, 12)}... (${wire.remoteAddress})`
        );

        wire.on("close", () => {
          const idx = activeWires.indexOf(wire);
          if (idx !== -1) activeWires.splice(idx, 1);
        });
      });

      // Take initial wire snapshot once metadata is available
      torrent.on("ready", () => {
        this.receiptGen.snapshotWires(activeWires);
      });

      // Auto-generate receipts on piece verification
      torrent.on("verified", (pieceIndex: number) => {
        const p = this.handlePieceVerified(torrent, activeWires, pieceIndex, onReceipt).catch(
          (err) =>
            console.error(
              `[PBTS] Receipt error for piece ${pieceIndex}:`,
              err.message
            )
        );
        pendingReceipts.push(p);
      });

      torrent.on("done", async () => {
        // Wait for all pending receipt submissions before reporting complete
        await Promise.allSettled(pendingReceipts);
        console.log("[PBTS] Download complete");
        resolve({ infoHash: torrent.infoHash, torrent });
      });

      torrent.on("error", reject);
    });
  }

  // ────────────────────────────────────────────────────────────────────────
  // Status
  // ────────────────────────────────────────────────────────────────────────

  /**
   * Query the backend for the current user's reputation and access status.
   */
  async status(
    infohash = "0x0000000000000000000000000000000000000000000000000000000000000000"
  ): Promise<unknown> {
    const message = `Announce started for ${infohash}`;
    const signature = await this.wallet.signMessage(message);

    const res = await fetch(`${this.opts.apiUrl}/announce`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userAddress: this.wallet.address,
        infohash,
        event: "started",
        message,
        signature,
      }),
    });

    return res.json();
  }

  /**
   * Gracefully shut down the WebTorrent client.
   */
  async destroy(): Promise<void> {
    return new Promise((resolve) => this.wt.destroy(() => resolve()));
  }

  // ────────────────────────────────────────────────────────────────────────
  // Private helpers
  // ────────────────────────────────────────────────────────────────────────

  private async handlePieceVerified(
    torrent: any,
    wires: Wire[],
    pieceIndex: number,
    onReceipt?: (receipt: Receipt, result: unknown) => void
  ): Promise<void> {
    // 1. Attribute the piece to a specific peer
    const attribution = this.receiptGen.attributePiece(wires);
    if (!attribution) {
      console.log(`[PBTS] Piece ${pieceIndex}: no peer attribution (skipping)`);
      return;
    }

    // 2. Resolve peer_id → Ethereum address
    const senderAddress = await this.resolvePeerAddress(attribution.peerId);
    if (!senderAddress) {
      console.log(
        `[PBTS] Piece ${pieceIndex}: cannot resolve address for peer ${attribution.peerId.slice(0, 12)}... (skipping)`
      );
      return;
    }

    // 3. Read the piece data from storage for hashing
    const pieceData = await this.getPieceData(torrent, pieceIndex);

    // 4. Generate the signed receipt
    const receipt = await this.receiptGen.generateReceipt(
      torrent.infoHash,
      senderAddress,
      pieceIndex,
      pieceData,
      pieceData.length
    );

    // 5. Submit to backend
    const result = await this.receiptGen.submitReceipt(receipt);
    console.log(
      `[PBTS] Piece ${pieceIndex}: receipt submitted (sender=${senderAddress.slice(0, 8)}..., ${pieceData.length} bytes)`
    );

    if (onReceipt) onReceipt(receipt, result);
  }

  /**
   * Resolve a BitTorrent peer_id to an Ethereum address.
   * Results are cached for the session lifetime.
   */
  private async resolvePeerAddress(peerId: string): Promise<string | null> {
    const cached = this.peerAddressCache.get(peerId);
    if (cached) return cached;

    try {
      const res = await fetch(
        `${this.opts.apiUrl}/resolve-peer?peerId=${encodeURIComponent(peerId)}`
      );
      if (!res.ok) return null;

      const data = (await res.json()) as { ethAddress: string };
      this.peerAddressCache.set(peerId, data.ethAddress);
      return data.ethAddress;
    } catch {
      return null;
    }
  }

  /**
   * Read piece data from the torrent's chunk store.
   */
  private getPieceData(torrent: any, pieceIndex: number): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const isLast = pieceIndex === torrent.pieces.length - 1;
      const len = isLast ? torrent.lastPieceLength : torrent.pieceLength;

      torrent.store.get(pieceIndex, { offset: 0, length: len }, (err: Error | null, buf: Buffer) => {
        if (err) reject(err);
        else resolve(buf);
      });
    });
  }
}
