/**
 * In-memory registry of known Ethereum addresses that have interacted
 * with the PBTS tracker (registered or appeared in transfer receipts).
 *
 * Used by GET /users to return all known agents without needing
 * on-chain enumeration (which the contract doesn't support).
 */

const knownAddresses = new Set<string>();

/** Record an address as known (idempotent). Normalizes to checksum-style storage. */
export function trackAddress(address: string): void {
  knownAddresses.add(address);
}

/** Return all known addresses. */
export function getKnownAddresses(): string[] {
  return Array.from(knownAddresses);
}
