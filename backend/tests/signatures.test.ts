/**
 * Unit tests for ECDSA signature utilities.
 * These tests use ethers.js to generate real signatures so that the
 * verification helpers can be exercised against known-good inputs.
 */
import { describe, it, expect } from "@jest/globals";
import { ethers } from "ethers";
import { recoverSigner, assertSigner, recoverReceiptSigner } from "../utils/signatures";

// Deterministic test wallet (never use for real funds)
const TEST_PRIVATE_KEY =
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
const wallet = new ethers.Wallet(TEST_PRIVATE_KEY);

describe("recoverSigner", () => {
  it("returns the correct signer address for a personal_sign message", async () => {
    const message = "Hello, PBTS!";
    const signature = await wallet.signMessage(message);
    const recovered = recoverSigner(message, signature);
    expect(recovered.toLowerCase()).toBe(wallet.address.toLowerCase());
  });

  it("returns a different address when the message is tampered", async () => {
    const message = "Original message";
    const signature = await wallet.signMessage(message);
    const recovered = recoverSigner("Tampered message", signature);
    expect(recovered.toLowerCase()).not.toBe(wallet.address.toLowerCase());
  });
});

describe("assertSigner", () => {
  it("does not throw when the signature matches the expected address", async () => {
    const message = "Register PBTS account: " + wallet.address;
    const signature = await wallet.signMessage(message);
    expect(() => assertSigner(message, signature, wallet.address)).not.toThrow();
  });

  it("throws when the recovered address does not match", async () => {
    const message = "Register PBTS account: " + wallet.address;
    const signature = await wallet.signMessage(message);
    expect(() =>
      assertSigner(message, signature, "0x0000000000000000000000000000000000000001")
    ).toThrow(/Signature mismatch/);
  });
});

describe("recoverReceiptSigner", () => {
  const infohash = ethers.zeroPadValue(ethers.toUtf8Bytes("torrent-abc"), 32);
  const sender = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"; // hardhat account 1
  const receiver = wallet.address;
  const pieceHash = ethers.zeroPadValue(ethers.toUtf8Bytes("piece-hash"), 32);
  const pieceIndex = 42;
  const pieceSize = 262144; // 256 KB
  const timestamp = 1_700_000_000;

  async function makeSignature(): Promise<string> {
    const hash = ethers.solidityPackedKeccak256(
      ["bytes32", "address", "address", "bytes32", "uint256", "uint256", "uint256"],
      [infohash, sender, receiver, pieceHash, pieceIndex, pieceSize, timestamp]
    );
    return wallet.signMessage(ethers.getBytes(hash));
  }

  it("recovers the receiver address from a valid receipt signature", async () => {
    const signature = await makeSignature();
    const recovered = recoverReceiptSigner(
      infohash,
      sender,
      receiver,
      pieceHash,
      pieceIndex,
      pieceSize,
      timestamp,
      signature
    );
    expect(recovered.toLowerCase()).toBe(receiver.toLowerCase());
  });

  it("returns a different address when the pieceSize is tampered", async () => {
    const signature = await makeSignature();
    const recovered = recoverReceiptSigner(
      infohash,
      sender,
      receiver,
      pieceHash,
      pieceIndex,
      pieceSize + 1, // tampered
      timestamp,
      signature
    );
    expect(recovered.toLowerCase()).not.toBe(receiver.toLowerCase());
  });
});
