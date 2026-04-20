/**
 * Tests for POST /bind-peer and GET /resolve-peer endpoints.
 */
import { jest, describe, it, expect, beforeEach, afterAll } from "@jest/globals";
import request from "supertest";
import { ethers } from "ethers";

// Mock contract helpers (same pattern as api.test.ts)
jest.mock("../utils/contract", () => ({
  isUserRegistered: jest.fn(),
  registerUser: jest.fn(),
  getUserReputation: jest.fn(),
  getUserRatio: jest.fn(),
  updateReputation: jest.fn(),
  formatRatio: (ratioScaled: bigint): number => {
    if (ratioScaled === ethers.MaxUint256) return Infinity;
    return Number(ratioScaled) / 1e18;
  },
}));

import { app, server } from "../server";
import { peerRegistry } from "../tracker/peerRegistry";

afterAll((done) => { server.close(done); });

// Hardhat account #0
const PRIVATE_KEY =
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
const wallet = new ethers.Wallet(PRIVATE_KEY);
const validPeerId = "ab".repeat(20); // 40-char hex

beforeEach(() => {
  peerRegistry.unbind(validPeerId);
});

// ── POST /bind-peer ─────────────────────────────────────────────────────

describe("POST /bind-peer", () => {
  async function buildBody(overrides: Record<string, unknown> = {}) {
    const peerId = (overrides.peerId as string) ?? validPeerId;
    const userAddress = (overrides.userAddress as string) ?? wallet.address;
    const message =
      (overrides.message as string) ??
      `Bind peer_id ${peerId} to PBTS account ${userAddress}`;
    const signature =
      (overrides.signature as string) ?? (await wallet.signMessage(message));

    return { userAddress, peerId, message, signature, ...overrides };
  }

  it("rejects missing fields", async () => {
    const res = await request(app).post("/bind-peer").send({});
    expect(res.status).toBe(400);
  });

  it("rejects invalid Ethereum address", async () => {
    const body = await buildBody({ userAddress: "not-an-address" });
    const res = await request(app).post("/bind-peer").send(body);
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/address/i);
  });

  it("rejects invalid peerId format (too short)", async () => {
    const body = await buildBody({ peerId: "abcdef" });
    const res = await request(app).post("/bind-peer").send(body);
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/hex/i);
  });

  it("rejects invalid peerId format (non-hex)", async () => {
    const body = await buildBody({ peerId: "zz".repeat(20) });
    const res = await request(app).post("/bind-peer").send(body);
    expect(res.status).toBe(400);
  });

  it("rejects invalid signature", async () => {
    const wrongSig = await wallet.signMessage("wrong message");
    const body = await buildBody({ signature: wrongSig });
    const res = await request(app).post("/bind-peer").send(body);
    expect(res.status).toBe(401);
  });

  it("binds successfully with valid inputs", async () => {
    const body = await buildBody();
    const res = await request(app).post("/bind-peer").send(body);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.peerId).toBe(validPeerId);
    expect(res.body.userAddress).toBe(wallet.address);

    // Verify the registry was updated
    expect(peerRegistry.getAddress(validPeerId)).toBe(wallet.address);
  });

  it("replaces old binding on re-bind", async () => {
    // First bind
    const body1 = await buildBody();
    await request(app).post("/bind-peer").send(body1);

    // Second bind with new peerId
    const newPeerId = "cd".repeat(20);
    const message2 = `Bind peer_id ${newPeerId} to PBTS account ${wallet.address}`;
    const sig2 = await wallet.signMessage(message2);
    const body2 = {
      userAddress: wallet.address,
      peerId: newPeerId,
      message: message2,
      signature: sig2,
    };
    const res = await request(app).post("/bind-peer").send(body2);
    expect(res.status).toBe(200);

    // Old peerId should be gone, new one active
    expect(peerRegistry.getAddress(validPeerId)).toBeUndefined();
    expect(peerRegistry.getAddress(newPeerId)).toBe(wallet.address);

    // Cleanup
    peerRegistry.unbind(newPeerId);
  });
});

// ── GET /resolve-peer ───────────────────────────────────────────────────

describe("GET /resolve-peer", () => {
  it("rejects missing peerId param", async () => {
    const res = await request(app).get("/resolve-peer");
    expect(res.status).toBe(400);
  });

  it("rejects invalid peerId format", async () => {
    const res = await request(app).get("/resolve-peer?peerId=tooshort");
    expect(res.status).toBe(400);
  });

  it("returns 404 for unbound peerId", async () => {
    const res = await request(app).get(`/resolve-peer?peerId=${"ee".repeat(20)}`);
    expect(res.status).toBe(404);
  });

  it("resolves a bound peerId", async () => {
    // Bind first
    peerRegistry.bind(validPeerId, wallet.address);

    const res = await request(app).get(`/resolve-peer?peerId=${validPeerId}`);
    expect(res.status).toBe(200);
    expect(res.body.ethAddress).toBe(wallet.address);
  });
});
