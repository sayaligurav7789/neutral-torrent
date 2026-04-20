/**
 * Tests for the ReceiptGenerator:
 *  - Correct receipt hash format (matches recoverReceiptSigner in utils/signatures.ts)
 *  - Signature roundtrip (generate → verify)
 *  - Piece attribution logic
 */
import { describe, it, expect, beforeEach } from "@jest/globals";
import { ethers } from "ethers";
import { ReceiptGenerator } from "../client/receiptGenerator";
import { recoverReceiptSigner } from "../utils/signatures";

// Hardhat accounts
const RECEIVER_KEY =
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
const receiverWallet = new ethers.Wallet(RECEIVER_KEY);

const SENDER_ADDR = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";
const FAKE_API = "http://localhost:9999"; // never actually called in unit tests

// ── Receipt generation & signature roundtrip ────────────────────────────

describe("ReceiptGenerator — generateReceipt", () => {
  let gen: ReceiptGenerator;

  beforeEach(() => {
    gen = new ReceiptGenerator(receiverWallet, FAKE_API);
  });

  it("generates a receipt with all required fields", async () => {
    const infoHash = "ab".repeat(20); // 40-char hex (standard BT infohash)
    const pieceData = Buffer.from("hello world piece data");
    const receipt = await gen.generateReceipt(
      infoHash,
      SENDER_ADDR,
      0,
      pieceData,
      pieceData.length
    );

    expect(receipt.sender).toBe(SENDER_ADDR);
    expect(receipt.receiver).toBe(receiverWallet.address);
    expect(receipt.pieceIndex).toBe(0);
    expect(receipt.pieceSize).toBe(pieceData.length);
    expect(receipt.timestamp).toBeGreaterThan(0);
    expect(receipt.signature).toMatch(/^0x[0-9a-fA-F]+$/);

    // infohash should be padded to bytes32 (66 chars with 0x prefix)
    expect(receipt.infohash).toHaveLength(66);
    expect(receipt.infohash.startsWith("0x")).toBe(true);

    // pieceHash should be keccak256 of the data
    expect(receipt.pieceHash).toBe(ethers.keccak256(pieceData));
  });

  it("produces a signature that recoverReceiptSigner can verify", async () => {
    const infoHash = "cd".repeat(20);
    const pieceData = Buffer.from("some piece content for hashing");

    const receipt = await gen.generateReceipt(
      infoHash,
      SENDER_ADDR,
      5,
      pieceData,
      pieceData.length
    );

    // Use the backend's own verification function
    const recovered = recoverReceiptSigner(
      receipt.infohash,
      receipt.sender,
      receipt.receiver,
      receipt.pieceHash,
      receipt.pieceIndex,
      receipt.pieceSize,
      receipt.timestamp,
      receipt.signature
    );

    expect(recovered.toLowerCase()).toBe(receiverWallet.address.toLowerCase());
  });

  it("different piece data produces different pieceHash", async () => {
    const infoHash = "ee".repeat(20);

    const receipt1 = await gen.generateReceipt(
      infoHash, SENDER_ADDR, 0, Buffer.from("piece A"), 7
    );
    const receipt2 = await gen.generateReceipt(
      infoHash, SENDER_ADDR, 0, Buffer.from("piece B"), 7
    );

    expect(receipt1.pieceHash).not.toBe(receipt2.pieceHash);
  });

  it("pads 20-byte infohash to bytes32 correctly", async () => {
    const infoHash = "ff".repeat(20); // 40 hex = 20 bytes
    const receipt = await gen.generateReceipt(
      infoHash, SENDER_ADDR, 0, Buffer.from("x"), 1
    );

    // Should be 0x + 24 leading zeros + 40 hex = 66 chars
    expect(receipt.infohash).toBe(
      "0x000000000000000000000000" + "ff".repeat(20)
    );
  });
});

// ── Piece attribution ───────────────────────────────────────────────────

describe("ReceiptGenerator — piece attribution", () => {
  let gen: ReceiptGenerator;

  beforeEach(() => {
    gen = new ReceiptGenerator(receiverWallet, FAKE_API);
  });

  function mockWires(
    ...specs: Array<{ peerId: string; downloaded: number }>
  ) {
    return specs.map((s) => ({
      peerId: s.peerId,
      downloaded: s.downloaded,
    }));
  }

  it("attributes piece to the peer with the largest download delta", () => {
    const wires = mockWires(
      { peerId: "aa".repeat(20), downloaded: 0 },
      { peerId: "bb".repeat(20), downloaded: 0 }
    );

    // Take initial snapshot
    gen.snapshotWires(wires);

    // Simulate: peer aa downloaded 1000 bytes, peer bb downloaded 5000 bytes
    wires[0].downloaded = 1000;
    wires[1].downloaded = 5000;

    const result = gen.attributePiece(wires);
    expect(result).not.toBeNull();
    expect(result!.peerId).toBe("bb".repeat(20));
    expect(result!.delta).toBe(5000);
  });

  it("returns null when multiple wires have no download activity", () => {
    const wires = mockWires(
      { peerId: "aa".repeat(20), downloaded: 100 },
      { peerId: "bb".repeat(20), downloaded: 200 }
    );

    gen.snapshotWires(wires);

    // No change in downloaded bytes — and multiple peers, so no fallback
    const result = gen.attributePiece(wires);
    expect(result).toBeNull();
  });

  it("falls back to single connected peer when no delta detected", () => {
    const wires = mockWires(
      { peerId: "aa".repeat(20), downloaded: 100 }
    );

    gen.snapshotWires(wires);

    // No delta, but only one peer — must be the sender
    const result = gen.attributePiece(wires);
    expect(result).not.toBeNull();
    expect(result!.peerId).toBe("aa".repeat(20));
  });

  it("updates snapshots after attribution", () => {
    const wires = mockWires(
      { peerId: "aa".repeat(20), downloaded: 0 }
    );

    gen.snapshotWires(wires);
    wires[0].downloaded = 1000;
    gen.attributePiece(wires);

    // Second round: only 500 new bytes
    wires[0].downloaded = 1500;
    const result = gen.attributePiece(wires);
    expect(result).not.toBeNull();
    expect(result!.delta).toBe(500);
  });

  it("handles wires without peerId gracefully", () => {
    const wires = [
      { peerId: undefined as unknown as string, downloaded: 5000 },
      { peerId: "aa".repeat(20), downloaded: 1000 },
    ];

    gen.snapshotWires(wires as any);
    (wires[0] as any).downloaded = 10000;
    wires[1].downloaded = 2000;

    const result = gen.attributePiece(wires as any);
    // Should attribute to the peer WITH a peerId
    expect(result).not.toBeNull();
    expect(result!.peerId).toBe("aa".repeat(20));
  });

  it("handles single peer correctly", () => {
    const wires = mockWires(
      { peerId: "aa".repeat(20), downloaded: 0 }
    );

    gen.snapshotWires(wires);
    wires[0].downloaded = 262144; // one piece worth

    const result = gen.attributePiece(wires);
    expect(result).not.toBeNull();
    expect(result!.peerId).toBe("aa".repeat(20));
    expect(result!.delta).toBe(262144);
  });
});
