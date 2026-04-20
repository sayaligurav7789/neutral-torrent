import { ethers } from "ethers";

/**
 * Verify an EIP-191 personal_sign signature and return the recovered address.
 *
 * @param message   The original plaintext (or binary) message that was signed.
 * @param signature The 0x-prefixed hex signature produced by personal_sign.
 * @returns The checksummed Ethereum address of the signer.
 */
export function recoverSigner(message: string, signature: string): string {
  return ethers.verifyMessage(message, signature);
}

/**
 * Verify that a personal_sign signature was produced by `expectedAddress`.
 *
 * @throws {Error} If the recovered address does not match.
 */
export function assertSigner(
  message: string,
  signature: string,
  expectedAddress: string
): void {
  const recovered = recoverSigner(message, signature);
  if (recovered.toLowerCase() !== expectedAddress.toLowerCase()) {
    throw new Error(
      `Signature mismatch: expected ${expectedAddress}, got ${recovered}`
    );
  }
}

/**
 * Reconstruct and verify the signed receipt hash used in the /report endpoint.
 *
 * The message is an EIP-191-wrapped keccak256 of the ABI-encoded receipt fields.
 * This matches the client-side signing in the frontend:
 *
 *   const hash = ethers.solidityPackedKeccak256(
 *     ['bytes32','address','address','bytes32','uint256','uint256','uint256'],
 *     [infohash, sender, receiver, pieceHash, pieceIndex, pieceSize, timestamp]
 *   );
 *   const sig = await wallet.signMessage(ethers.getBytes(hash));
 *
 * @param infohash   bytes32 torrent identifier (0x-prefixed hex)
 * @param sender     Uploader's address
 * @param receiver   Downloader's address
 * @param pieceHash  bytes32 SHA-256 of the piece (0x-prefixed hex)
 * @param pieceIndex Piece index (uint256)
 * @param pieceSize  Piece size in bytes (uint256)
 * @param timestamp  Unix epoch seconds (uint256)
 * @param signature  Receiver's ECDSA signature
 * @returns The checksummed address recovered from the signature
 */
export function recoverReceiptSigner(
  infohash: string,
  sender: string,
  receiver: string,
  pieceHash: string,
  pieceIndex: number,
  pieceSize: number,
  timestamp: number,
  signature: string
): string {
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
    [infohash, sender, receiver, pieceHash, pieceIndex, pieceSize, timestamp]
  );
  return ethers.verifyMessage(ethers.getBytes(hash), signature);
}
