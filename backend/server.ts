import "dotenv/config";
import express, { Request, Response } from "express";
import cors from "cors";
import config from "./config/index";
import { registerHandler } from "./routes/register";
import { reportHandler } from "./routes/report";
import { announceHandler, swarm } from "./routes/announce";
import { bindPeerHandler } from "./routes/bindPeer";
import { resolvePeerHandler } from "./routes/resolvePeer";
import { migrateFrom, getUserReputation, getUserRatio, formatRatio } from "./utils/contract";
import { getKnownAddresses } from "./tracker/userRegistry";
import marketplaceRouter from "./marketplace/routes";
import skyboxRouter from "./skybox/routes";
import { seedDemoData } from "./marketplace/seedData";
import { getContentPrice, SEPOLIA_TOKENS } from "./marketplace/pricingStore";

const app = express();

// ── Middleware ─────────────────────────────────────────────────────────────
app.use(cors({
  origin: "*",
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));
app.use(express.json());

// ── Routes ─────────────────────────────────────────────────────────────────
app.post("/register", registerHandler);
app.post("/report", reportHandler);
app.post("/announce", announceHandler);
app.post("/bind-peer", bindPeerHandler);
app.get("/resolve-peer", resolvePeerHandler);
app.use("/marketplace", marketplaceRouter);
app.use("/skybox", skyboxRouter);

/**
 * GET /reputation/:address
 *
 * Public read-only endpoint — queries on-chain reputation for any address.
 * No authentication required (the data is public on-chain anyway).
 */
app.get("/reputation/:address", async (req: Request, res: Response): Promise<void> => {
  const { address } = req.params;

  if (!address || !/^0x[0-9a-fA-F]{40}$/.test(address)) {
    res.status(400).json({ error: "Invalid Ethereum address" });
    return;
  }

  try {
    const rep = await getUserReputation(address);
    const ratioScaled = await getUserRatio(address);
    const ratio = formatRatio(ratioScaled);

    res.json({
      address,
      uploadBytes: rep.uploadBytes.toString(),
      downloadBytes: rep.downloadBytes.toString(),
      ratio: isFinite(ratio) ? ratio : null,
      lastUpdated: Number(rep.lastUpdated),
      isRegistered: rep.lastUpdated > 0n,
    });
  } catch (err) {
    console.error(`[/reputation] Error querying ${address}:`, err);
    res.status(500).json({ error: "Failed to query reputation" });
  }
});

/**
 * GET /users
 *
 * Returns all known registered addresses with their on-chain reputation.
 * Addresses are tracked in-memory as users register or appear in receipts.
 */
app.get("/users", async (_req: Request, res: Response): Promise<void> => {
  const addresses = getKnownAddresses();

  try {
    const users = await Promise.all(
      addresses.map(async (address) => {
        const rep = await getUserReputation(address);
        const ratioScaled = await getUserRatio(address);
        const ratio = formatRatio(ratioScaled);

        return {
          address,
          uploadBytes: rep.uploadBytes.toString(),
          downloadBytes: rep.downloadBytes.toString(),
          ratio: isFinite(ratio) ? ratio : null,
          lastUpdated: Number(rep.lastUpdated),
          isRegistered: rep.lastUpdated > 0n,
        };
      })
    );

    res.json({ users });
  } catch (err) {
    console.error("[/users] Error querying users:", err);
    res.status(500).json({ error: "Failed to query users" });
  }
});

// Health check — useful for load balancers and CI smoke tests.
app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

/**
 * GET /agent-tools
 *
 * Tool discovery endpoint for autonomous agents (e.g. CloudLLM-powered).
 * Returns a machine-readable description of every available API action so
 * that an agent can register itself, announce interest in datasets, submit
 * signed piece receipts, and monitor its own reputation — all without human
 * intervention.
 */
app.get("/agent-tools", (_req: Request, res: Response): void => {
  res.json({
    tools: [
      {
        name: "register",
        method: "POST",
        path: "/register",
        description: "Register a new peer address on-chain. Requires an EIP-191 signature over the registration message.",
        body: {
          userAddress: "string — 0x-prefixed Ethereum address",
          message: "string — message that was signed",
          signature: "string — EIP-191 hex signature",
        },
      },
      {
        name: "announce",
        method: "POST",
        path: "/announce",
        description: "Announce interest in (or departure from) a torrent swarm. Returns peer list when ratio ≥ 1.0.",
        body: {
          userAddress: "string — 0x-prefixed Ethereum address",
          infohash: "string — 0x-prefixed 32-byte torrent infohash",
          event: "string — 'started' | 'stopped' | 'completed'",
          message: "string — message that was signed",
          signature: "string — EIP-191 hex signature",
        },
      },
      {
        name: "report",
        method: "POST",
        path: "/report",
        description: "Submit a signed piece receipt to update upload/download reputation on-chain.",
        body: {
          infohash: "string — 0x-prefixed 32-byte torrent infohash",
          sender: "string — 0x-prefixed Ethereum address of data sender",
          receiver: "string — 0x-prefixed Ethereum address of data receiver",
          pieceHash: "string — 0x-prefixed 32-byte hash of the piece",
          pieceIndex: "number — index of the piece within the torrent",
          pieceSize: "number — size of the piece in bytes",
          timestamp: "number — Unix timestamp (must be within 5 minutes)",
          signature: "string — receiver's signature over the solidityPackedKeccak256 hash",
        },
      },
      {
        name: "reputation",
        method: "GET",
        path: "/reputation/:address",
        description: "Query on-chain reputation (upload bytes, download bytes, ratio) for any address.",
        params: {
          address: "string — 0x-prefixed Ethereum address",
        },
      },
      {
        name: "users",
        method: "GET",
        path: "/users",
        description: "List all known registered addresses with their on-chain reputation.",
      },
      {
        name: "torrents",
        method: "GET",
        path: "/torrents",
        description: "List all active torrents in the swarm with peer counts and marketplace pricing.",
      },
    ],
  });
});

/**
 * Approximate USD rates for demo display (same as Uniswap mock mode).
 * In production you'd fetch live rates from an oracle or the Uniswap API.
 */
const APPROX_USD_RATES: Record<string, number> = {
  ETH: 2500,
  WETH: 2500,
  USDC: 1,
  UNI: 8,
};

/** Convert a token amount (in base units) to approximate USDC value. */
function approxUSDC(tokenSymbol: string, amount: string): number | null {
  const rate = APPROX_USD_RATES[tokenSymbol.toUpperCase()];
  if (rate == null) return null;
  const tokenInfo = Object.values(SEPOLIA_TOKENS).find(
    (t) => t.symbol.toUpperCase() === tokenSymbol.toUpperCase()
  );
  if (!tokenInfo) return null;
  const human = Number(amount) / 10 ** tokenInfo.decimals;
  return parseFloat((human * rate).toFixed(2));
}

/**
 * GET /torrents
 *
 * Returns all active torrents in the swarm with their peer counts.
 * If a torrent is listed on the marketplace, includes pricing info
 * and an approximate USDC equivalent.
 * Public endpoint — no authentication required.
 */
app.get("/torrents", (_req: Request, res: Response): void => {
  const torrents = Array.from(swarm.entries()).map(([infohash, peers]) => {
    const listing = getContentPrice(infohash);
    return {
      infohash,
      peerCount: peers.size,
      peers: Array.from(peers),
      // Marketplace pricing (null if not listed)
      ...(listing
        ? {
            listed: true,
            description: listing.description,
            tokenSymbol: listing.tokenSymbol,
            tokenAmount: listing.amount,
            sellerAddress: listing.sellerAddress,
            priceUSDC: approxUSDC(listing.tokenSymbol, listing.amount),
          }
        : { listed: false }),
    };
  });
  res.json({ torrents });
});

/**
 * POST /migrate
 *
 * Admin-only endpoint (protected by Authorization: Bearer <ADMIN_SECRET>).
 * Deploys a new ReputationTracker via RepFactory with the current contract as
 * referrer so that reputation history is preserved, then returns the new
 * contract address.  The operator must update REPUTATION_TRACKER_ADDRESS in
 * the environment and restart the server to complete the migration.
 *
 * Body: { oldContract?: string }
 *   oldContract — address of the tracker to migrate from.
 *                 Defaults to the currently configured contractAddress.
 */
app.post("/migrate", async (req: Request, res: Response): Promise<void> => {
  // ── Auth check ──────────────────────────────────────────────────────────
  const authHeader = req.headers["authorization"] ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!config.adminSecret || token !== config.adminSecret) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const oldContract: string =
    (req.body as { oldContract?: string }).oldContract ?? config.contractAddress;

  try {
    const newAddress = await migrateFrom(oldContract);
    res.status(200).json({
      success: true,
      oldContract,
      newContract: newAddress,
      message:
        "New ReputationTracker deployed. Update REPUTATION_TRACKER_ADDRESS and restart the server.",
    });
  } catch (err) {
    console.error("[/migrate] Migration error:", err);
    res.status(500).json({ error: "Migration failed" });
  }
});

// ── Seed demo data (development only) ─────────────────────────────────────
if (config.nodeEnv !== "test") {
  seedDemoData();
}

// ── Start Express ─────────────────────────────────────────────────────────
const server = app.listen(config.port, () => {
  console.log(
    `[PBTS] Tracker server running on port ${config.port} (${config.nodeEnv})`
  );
  console.log(`[PBTS] RPC URL : ${config.rpcUrl}`);
  console.log(`[PBTS] Contract: ${config.contractAddress}`);
});

// ── Start BitTorrent Tracker (skip in test environment) ───────────────────
let btTracker: import("bittorrent-tracker").Server | null = null;

if (config.nodeEnv !== "test") {
  import("./tracker/index").then(({ createTracker }) => {
    btTracker = createTracker();
    btTracker!.listen(config.trackerPort, () => {
      console.log(
        `[PBTS] BitTorrent tracker running on port ${config.trackerPort}`
      );
    });
  });
}

export { app, server, btTracker };
