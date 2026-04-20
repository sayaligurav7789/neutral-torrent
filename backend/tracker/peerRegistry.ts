/**
 * In-memory bidirectional mapping between BitTorrent peer_ids and Ethereum addresses.
 *
 * Peer IDs are ephemeral (regenerated each WebTorrent session), so persistence
 * is unnecessary — clients re-bind on every session start.
 */

class PeerRegistry {
  /** peer_id (hex) → checksummed Ethereum address */
  private peerToAddress = new Map<string, string>();
  /** lowercase Ethereum address → peer_id (hex) */
  private addressToPeer = new Map<string, string>();

  /**
   * Bind a peer_id to an Ethereum address.
   * Replaces any existing binding for either the peerId or the address.
   */
  bind(peerId: string, ethAddress: string): void {
    const lowerAddr = ethAddress.toLowerCase();

    // Clear stale binding for this address (one address ↔ one peer_id)
    const oldPeerId = this.addressToPeer.get(lowerAddr);
    if (oldPeerId) {
      this.peerToAddress.delete(oldPeerId);
    }

    // Clear stale binding for this peer_id
    const oldAddress = this.peerToAddress.get(peerId);
    if (oldAddress) {
      this.addressToPeer.delete(oldAddress.toLowerCase());
    }

    this.peerToAddress.set(peerId, ethAddress);
    this.addressToPeer.set(lowerAddr, peerId);
  }

  /** Resolve a peer_id to an Ethereum address. */
  getAddress(peerId: string): string | undefined {
    return this.peerToAddress.get(peerId);
  }

  /** Reverse lookup: Ethereum address → peer_id. */
  getPeerId(ethAddress: string): string | undefined {
    return this.addressToPeer.get(ethAddress.toLowerCase());
  }

  /** Remove a binding by peer_id. */
  unbind(peerId: string): void {
    const addr = this.peerToAddress.get(peerId);
    if (addr) {
      this.addressToPeer.delete(addr.toLowerCase());
      this.peerToAddress.delete(peerId);
    }
  }

  /** Number of active bindings. */
  get size(): number {
    return this.peerToAddress.size;
  }
}

export const peerRegistry = new PeerRegistry();
