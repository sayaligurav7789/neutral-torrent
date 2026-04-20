import { Server as TrackerServer } from "bittorrent-tracker";
import { peerRegistry } from "./peerRegistry";
import {
  isUserRegistered,
  getUserRatio,
  formatRatio,
} from "../utils/contract";
import config from "../config/index";

// Simple TTL cache to avoid hitting the RPC on every announce.
// Key: lowercase Ethereum address, Value: { ratio, expiresAt }.
const reputationCache = new Map<
  string,
  { ratio: number; expiresAt: number }
>();
const CACHE_TTL_MS = 30_000; // 30 seconds

async function getCachedRatio(ethAddress: string): Promise<number> {
  const key = ethAddress.toLowerCase();
  const cached = reputationCache.get(key);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.ratio;
  }

  const ratioScaled = await getUserRatio(ethAddress);
  const ratio = formatRatio(ratioScaled);
  reputationCache.set(key, {
    ratio,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
  return ratio;
}

/**
 * Create a `bittorrent-tracker` Server with a reputation-gating filter.
 *
 * The filter callback runs on every announce request:
 *   1. Resolve peer_id → Ethereum address via peerRegistry
 *   2. Verify the address is registered on-chain
 *   3. Check that the user's ratio meets the minimum threshold
 *
 * Peers that fail any check are rejected with a descriptive error.
 */
export function createTracker(): TrackerServer {
  const tracker = new TrackerServer({
    http: true,
    ws: true,
    udp: false, // not needed for hackathon demo
    stats: true,

    filter(
      infoHash: string,
      params: { peer_id: string; [key: string]: unknown },
      cb: (err?: Error) => void
    ) {
      const peerId = params.peer_id; // hex string (40 chars)

      // 1. Resolve peer_id → Ethereum address
      const ethAddress = peerRegistry.getAddress(peerId);
      if (!ethAddress) {
        return cb(
          new Error(
            "Unknown peer_id. Call POST /bind-peer to link your peer_id to an Ethereum address."
          )
        );
      }

      // 2–3. Check registration + reputation (async)
      (async () => {
        const registered = await isUserRegistered(ethAddress);
        if (!registered) {
          return cb(
            new Error("Ethereum address is not registered on PBTS.")
          );
        }

        const ratio = await getCachedRatio(ethAddress);
        const comparable = isFinite(ratio)
          ? ratio
          : Number.MAX_SAFE_INTEGER;

        if (comparable < config.minRatio) {
          return cb(
            new Error(
              `Insufficient ratio (${ratio.toFixed(2)}). Minimum required: ${config.minRatio}`
            )
          );
        }

        // All checks passed — allow the peer into the swarm.
        cb();
      })().catch((err) => {
        console.error("[BT Tracker] filter error:", err);
        cb(new Error("Internal tracker error"));
      });
    },
  });

  // ── Lifecycle logging ───────────────────────────────────────────────────
  tracker.on("listening", () => {
    console.log("[BT Tracker] Listening");
  });

  tracker.on("error", (err: Error) => {
    console.error("[BT Tracker] Error:", err.message);
  });

  tracker.on("warning", (err: Error) => {
    console.warn("[BT Tracker] Warning:", err.message);
  });

  // ── Peer events (useful for demo logging) ───────────────────────────────
  tracker.on("start", (addr: string) => {
    console.log(`[BT Tracker] Peer started: ${addr}`);
  });

  tracker.on("complete", (addr: string) => {
    console.log(`[BT Tracker] Peer completed: ${addr}`);
  });

  tracker.on("stop", (addr: string) => {
    console.log(`[BT Tracker] Peer stopped: ${addr}`);
  });

  return tracker;
}
