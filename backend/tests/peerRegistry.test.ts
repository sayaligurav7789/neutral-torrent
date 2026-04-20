import { describe, it, expect, beforeEach } from "@jest/globals";

// Import from source — no mocking needed, pure data structure.
import { peerRegistry } from "../tracker/peerRegistry";

// Reset the singleton between tests by unbinding everything.
function clearRegistry() {
  // Unbind all known peer ids by iterating (peerRegistry doesn't expose clear)
  // We'll rely on bind/unbind logic to keep things isolated.
}

describe("PeerRegistry", () => {
  const peerId1 = "aa".repeat(20); // 40-char hex
  const peerId2 = "bb".repeat(20);
  const addr1 = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";
  const addr2 = "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC";

  beforeEach(() => {
    // Clean up any bindings from previous tests
    peerRegistry.unbind(peerId1);
    peerRegistry.unbind(peerId2);
  });

  it("binds and resolves peerId → address", () => {
    peerRegistry.bind(peerId1, addr1);
    expect(peerRegistry.getAddress(peerId1)).toBe(addr1);
  });

  it("binds and resolves address → peerId (reverse)", () => {
    peerRegistry.bind(peerId1, addr1);
    expect(peerRegistry.getPeerId(addr1)).toBe(peerId1);
  });

  it("is case-insensitive for address lookups", () => {
    peerRegistry.bind(peerId1, addr1);
    expect(peerRegistry.getPeerId(addr1.toLowerCase())).toBe(peerId1);
    expect(peerRegistry.getPeerId(addr1.toUpperCase())).toBe(peerId1);
  });

  it("returns undefined for unknown peerId", () => {
    expect(peerRegistry.getAddress("cc".repeat(20))).toBeUndefined();
  });

  it("returns undefined for unknown address", () => {
    expect(peerRegistry.getPeerId("0x0000000000000000000000000000000000000000")).toBeUndefined();
  });

  it("replaces old peerId when same address rebinds", () => {
    peerRegistry.bind(peerId1, addr1);
    peerRegistry.bind(peerId2, addr1); // same address, new peerId

    expect(peerRegistry.getAddress(peerId2)).toBe(addr1);
    expect(peerRegistry.getAddress(peerId1)).toBeUndefined(); // old binding gone
    expect(peerRegistry.getPeerId(addr1)).toBe(peerId2);
  });

  it("replaces old address when same peerId rebinds", () => {
    peerRegistry.bind(peerId1, addr1);
    peerRegistry.bind(peerId1, addr2); // same peerId, new address

    expect(peerRegistry.getAddress(peerId1)).toBe(addr2);
    expect(peerRegistry.getPeerId(addr2)).toBe(peerId1);
    expect(peerRegistry.getPeerId(addr1)).toBeUndefined(); // old binding gone
  });

  it("unbinds correctly", () => {
    peerRegistry.bind(peerId1, addr1);
    peerRegistry.unbind(peerId1);

    expect(peerRegistry.getAddress(peerId1)).toBeUndefined();
    expect(peerRegistry.getPeerId(addr1)).toBeUndefined();
  });

  it("unbind is a no-op for unknown peerId", () => {
    // Should not throw
    peerRegistry.unbind("dd".repeat(20));
  });

  it("tracks size correctly", () => {
    const before = peerRegistry.size;
    peerRegistry.bind(peerId1, addr1);
    expect(peerRegistry.size).toBe(before + 1);
    peerRegistry.bind(peerId2, addr2);
    expect(peerRegistry.size).toBe(before + 2);
    peerRegistry.unbind(peerId1);
    expect(peerRegistry.size).toBe(before + 1);
  });
});
