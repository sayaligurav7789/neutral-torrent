/**
 * Integration tests for the Express API endpoints.
 *
 * Strategy: mock the contract utility helpers so that tests run without
 * a live blockchain node, then exercise the request-level logic (input
 * validation, signature verification, access-control decisions, etc.).
 */
import { jest, describe, it, expect, beforeEach, afterAll } from "@jest/globals";
import request from "supertest";
import { ethers } from "ethers";

// ── Mock contract helpers before the route modules are imported ────────────
jest.mock("../utils/contract", () => ({
  isUserRegistered: jest.fn(),
  registerUser: jest.fn(),
  getUserReputation: jest.fn(),
  getUserRatio: jest.fn(),
  updateReputation: jest.fn(),
  migrateFrom: jest.fn(),
  formatRatio: (ratioScaled: bigint): number => {
    if (ratioScaled === ethers.MaxUint256) return Infinity;
    return Number(ratioScaled) / 1e18;
  },
}));

import * as contractUtils from "../utils/contract";

// Import the app *after* mocking so the routes pick up mocked helpers.
import { app, server } from "../server";

afterAll((done) => { server.close(done); });

// Typed mock helpers
const mockIsUserRegistered = jest.mocked(contractUtils.isUserRegistered);
const mockRegisterUser = jest.mocked(contractUtils.registerUser);
const mockGetUserReputation = jest.mocked(contractUtils.getUserReputation);
const mockGetUserRatio = jest.mocked(contractUtils.getUserRatio);
const mockUpdateReputation = jest.mocked(contractUtils.updateReputation);
const mockMigrateFrom = jest.mocked(contractUtils.migrateFrom);

// ── Helpers ────────────────────────────────────────────────────────────────

// Hardhat account #0 deterministic key — safe to use in tests
const PRIVATE_KEY =
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
const wallet = new ethers.Wallet(PRIVATE_KEY);

const INITIAL_CREDIT = 1_073_741_824n; // 1 GiB

function mockReputation(uploadBytes: bigint, downloadBytes: bigint) {
  return {
    uploadBytes,
    downloadBytes,
    lastUpdated: 1n,
  };
}

// ── /health ────────────────────────────────────────────────────────────────

describe("GET /health", () => {
  it("returns 200 and status ok", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
  });
});

// ── /agent-tools ───────────────────────────────────────────────────────────

describe("GET /agent-tools", () => {
  it("returns 200 with a non-empty tools array", async () => {
    const res = await request(app).get("/agent-tools");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.tools)).toBe(true);
    expect(res.body.tools.length).toBeGreaterThan(0);
  });

  it("includes register, announce, report, and reputation tools", async () => {
    const res = await request(app).get("/agent-tools");
    const names: string[] = res.body.tools.map((t: { name: string }) => t.name);
    expect(names).toContain("register");
    expect(names).toContain("announce");
    expect(names).toContain("report");
    expect(names).toContain("reputation");
  });

  it("each tool has name, method, and path fields", async () => {
    const res = await request(app).get("/agent-tools");
    for (const tool of res.body.tools as { name: string; method: string; path: string }[]) {
      expect(typeof tool.name).toBe("string");
      expect(typeof tool.method).toBe("string");
      expect(typeof tool.path).toBe("string");
    }
  });
});

// ── POST /register ─────────────────────────────────────────────────────────

describe("POST /register", () => {
  const message = `Register PBTS account: ${wallet.address}`;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("rejects requests with missing fields", async () => {
    const res = await request(app).post("/register").send({});
    expect(res.status).toBe(400);
  });

  it("rejects an invalid Ethereum address", async () => {
    const res = await request(app).post("/register").send({
      userAddress: "not-an-address",
      message,
      signature: "0x00",
    });
    expect(res.status).toBe(400);
  });

  it("rejects an invalid signature", async () => {
    // Sign a *different* message — recovered address won't match
    const wrongSig = await wallet.signMessage("wrong message");
    const res = await request(app).post("/register").send({
      userAddress: wallet.address,
      message,
      signature: wrongSig,
    });
    expect(res.status).toBe(401);
  });

  it("returns 409 when user is already registered", async () => {
    mockIsUserRegistered.mockResolvedValue(true);
    const sig = await wallet.signMessage(message);
    const res = await request(app).post("/register").send({
      userAddress: wallet.address,
      message,
      signature: sig,
    });
    expect(res.status).toBe(409);
  });

  it("registers a new user and returns 201", async () => {
    mockIsUserRegistered.mockResolvedValue(false);
    mockRegisterUser.mockResolvedValue({ hash: "0xabc" } as ethers.TransactionReceipt);
    const sig = await wallet.signMessage(message);
    const res = await request(app).post("/register").send({
      userAddress: wallet.address,
      message,
      signature: sig,
    });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.initialCredit).toBe(1_073_741_824);
    expect(res.body.txHash).toBe("0xabc");
  });
});

// ── POST /report ───────────────────────────────────────────────────────────

describe("POST /report", () => {
  const infohash = ethers.zeroPadValue(ethers.toUtf8Bytes("torrent-1"), 32);
  const sender = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";
  const receiver = wallet.address;
  const pieceHash = ethers.zeroPadValue(ethers.toUtf8Bytes("piece-1"), 32);
  const pieceIndex = 0;
  const pieceSize = 262144;
  const validTimestamp = Math.floor(Date.now() / 1000);

  async function makeReceipt(overrides: Record<string, unknown> = {}) {
    const ts = (overrides["timestamp"] as number) ?? validTimestamp;
    const si = (overrides["sender"] as string) ?? sender;
    const ri = (overrides["receiver"] as string) ?? receiver;
    const ps = (overrides["pieceSize"] as number) ?? pieceSize;
    const pi = (overrides["pieceIndex"] as number) ?? pieceIndex;
    const ph = (overrides["pieceHash"] as string) ?? pieceHash;
    const ih = (overrides["infohash"] as string) ?? infohash;

    const hash = ethers.solidityPackedKeccak256(
      ["bytes32", "address", "address", "bytes32", "uint256", "uint256", "uint256"],
      [ih, si, ri, ph, pi, ps, ts]
    );
    const sig = await wallet.signMessage(ethers.getBytes(hash));

    return {
      infohash: ih,
      sender: si,
      receiver: ri,
      pieceHash: ph,
      pieceIndex: pi,
      pieceSize: ps,
      timestamp: ts,
      signature: overrides["signature"] ?? sig,
      ...overrides,
    };
  }

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("rejects missing fields", async () => {
    const res = await request(app).post("/report").send({});
    expect(res.status).toBe(400);
  });

  it("rejects a stale timestamp", async () => {
    const receipt = await makeReceipt({ timestamp: validTimestamp - 600 });
    const res = await request(app).post("/report").send(receipt);
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/timestamp/i);
  });

  it("rejects a receipt not signed by the receiver", async () => {
    const otherWallet = ethers.Wallet.createRandom();
    const hash = ethers.solidityPackedKeccak256(
      ["bytes32", "address", "address", "bytes32", "uint256", "uint256", "uint256"],
      [infohash, sender, receiver, pieceHash, pieceIndex, pieceSize, validTimestamp]
    );
    const wrongSig = await otherWallet.signMessage(ethers.getBytes(hash));
    const receipt = await makeReceipt({ signature: wrongSig });
    const res = await request(app).post("/report").send(receipt);
    expect(res.status).toBe(401);
  });

  it("returns 404 when sender is not registered", async () => {
    mockIsUserRegistered
      .mockResolvedValueOnce(false)  // sender
      .mockResolvedValueOnce(true);  // receiver
    const receipt = await makeReceipt();
    const res = await request(app).post("/report").send(receipt);
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/sender/i);
  });

  it("updates reputation and returns 200 for a valid receipt", async () => {
    mockIsUserRegistered.mockResolvedValue(true);
    mockUpdateReputation.mockResolvedValue({ hash: "0xdead" } as ethers.TransactionReceipt);
    mockGetUserReputation.mockResolvedValue(
      mockReputation(INITIAL_CREDIT + BigInt(pieceSize), BigInt(pieceSize))
    );

    const receipt = await makeReceipt();
    const res = await request(app).post("/report").send(receipt);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.senderTxHash).toBe("0xdead");
  });
});

// ── POST /announce ─────────────────────────────────────────────────────────

describe("POST /announce", () => {
  const infohash = "0x" + "ab".repeat(32);
  const buildAnnounceBody = async (event = "started") => {
    const message = `Announce ${event} for ${infohash}`;
    const sig = await wallet.signMessage(message);
    return { userAddress: wallet.address, infohash, event, message, signature: sig };
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("rejects missing fields", async () => {
    const res = await request(app).post("/announce").send({});
    expect(res.status).toBe(400);
  });

  it("rejects unregistered user", async () => {
    mockIsUserRegistered.mockResolvedValue(false);
    const body = await buildAnnounceBody();
    const res = await request(app).post("/announce").send(body);
    expect(res.status).toBe(404);
  });

  it("returns 403 with empty peers for low-ratio user", async () => {
    mockIsUserRegistered.mockResolvedValue(true);
    // ratio ≈ 0.093 → blocked
    const uploadBytes = 100_000_000n;        // 100 MB
    const downloadBytes = INITIAL_CREDIT;    // 1 GiB
    mockGetUserRatio.mockResolvedValue((uploadBytes * BigInt(1e18)) / downloadBytes);
    mockGetUserReputation.mockResolvedValue(mockReputation(uploadBytes, downloadBytes));

    const body = await buildAnnounceBody();
    const res = await request(app).post("/announce").send(body);
    expect(res.status).toBe(403);
    expect(res.body.status).toBe("blocked");
    expect(res.body.peers).toHaveLength(0);
  });

  it("returns 200 with peer list for high-ratio user", async () => {
    mockIsUserRegistered.mockResolvedValue(true);
    // ratio = 2.5 → allowed
    const uploadBytes = 5n * INITIAL_CREDIT;
    const downloadBytes = 2n * INITIAL_CREDIT;
    mockGetUserRatio.mockResolvedValue((uploadBytes * BigInt(1e18)) / downloadBytes);
    mockGetUserReputation.mockResolvedValue(mockReputation(uploadBytes, downloadBytes));

    const body = await buildAnnounceBody();
    const res = await request(app).post("/announce").send(body);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("allowed");
    expect(Array.isArray(res.body.peers)).toBe(true);
  });

  it("returns 200 with peers for user with no downloads (infinite ratio)", async () => {
    mockIsUserRegistered.mockResolvedValue(true);
    // No downloads → getRatio returns MaxUint256
    mockGetUserRatio.mockResolvedValue(ethers.MaxUint256);
    mockGetUserReputation.mockResolvedValue(mockReputation(INITIAL_CREDIT, 0n));

    const body = await buildAnnounceBody();
    const res = await request(app).post("/announce").send(body);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("allowed");
  });
});

// ── POST /migrate ──────────────────────────────────────────────────────────

describe("POST /migrate", () => {
  const ADMIN_SECRET = "test-admin-secret";
  const OLD_CONTRACT = "0x0000000000000000000000000000000000000001";
  const NEW_CONTRACT = "0x0000000000000000000000000000000000000003";

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 401 without Authorization header", async () => {
    const res = await request(app).post("/migrate").send({});
    expect(res.status).toBe(401);
  });

  it("returns 401 with wrong secret", async () => {
    const res = await request(app)
      .post("/migrate")
      .set("Authorization", "Bearer wrong-secret")
      .send({});
    expect(res.status).toBe(401);
  });

  it("deploys new tracker and returns 200 with correct secret", async () => {
    mockMigrateFrom.mockResolvedValue(NEW_CONTRACT);
    const res = await request(app)
      .post("/migrate")
      .set("Authorization", `Bearer ${ADMIN_SECRET}`)
      .send({ oldContract: OLD_CONTRACT });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.newContract).toBe(NEW_CONTRACT);
    expect(res.body.oldContract).toBe(OLD_CONTRACT);
    expect(mockMigrateFrom).toHaveBeenCalledWith(OLD_CONTRACT);
  });

  it("uses configured contractAddress when oldContract is omitted", async () => {
    mockMigrateFrom.mockResolvedValue(NEW_CONTRACT);
    const res = await request(app)
      .post("/migrate")
      .set("Authorization", `Bearer ${ADMIN_SECRET}`)
      .send({});
    expect(res.status).toBe(200);
    expect(mockMigrateFrom).toHaveBeenCalledWith(
      "0x0000000000000000000000000000000000000001"
    );
  });

  it("returns 500 when migration fails", async () => {
    mockMigrateFrom.mockRejectedValue(new Error("on-chain error"));
    const res = await request(app)
      .post("/migrate")
      .set("Authorization", `Bearer ${ADMIN_SECRET}`)
      .send({ oldContract: OLD_CONTRACT });
    expect(res.status).toBe(500);
  });
});
