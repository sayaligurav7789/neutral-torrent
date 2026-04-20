import "dotenv/config";

function requireEnv(key: string, fallback?: string): string {
  const value = process.env[key] ?? fallback;
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

/**
 * Resolve the JSON-RPC URL in priority order:
 *   1. RPC_URL          — generic, network-agnostic
 *   2. ETH_SEPOLIA_RPC_URL — Ethereum Sepolia (legacy)
 */
function resolveRpcUrl(): string {
  return (
    process.env["RPC_URL"] ??
    process.env["ETH_SEPOLIA_RPC_URL"] ??
    "https://rpc.sepolia.org"
  );
}

/**
 * Infer a sensible default chain ID from the RPC URL when CHAIN_ID is not
 * explicitly set.  Defaults to Sepolia (11155111) if the URL is unrecognised.
 */
function resolveChainId(): number {
  if (process.env["CHAIN_ID"]) {
    return parseInt(process.env["CHAIN_ID"], 10);
  }
  const rpc = resolveRpcUrl().toLowerCase();
  if (rpc.includes("sepolia") || rpc.includes("11155111")) return 11155111;
  return 11155111; // Ethereum Sepolia
}

const config = {
  port: parseInt(process.env["PORT"] ?? "3001", 10),
  nodeEnv: process.env["NODE_ENV"] ?? "development",

  /** JSON-RPC endpoint — set RPC_URL, ETH_SEPOLIA_RPC_URL, or AVALANCHE_FUJI_RPC_URL */
  rpcUrl: resolveRpcUrl(),

  /** Private key of the tracker server wallet (pays gas for contract writes) */
  trackerPrivateKey: requireEnv("DEPLOYER_PRIVATE_KEY", ""),

  /** Current active ReputationTracker contract the backend writes to */
  contractAddress: requireEnv("REPUTATION_TRACKER_ADDRESS", ""),

  /** RepFactory address — used only during migration */
  factoryAddress: requireEnv("FACTORY_ADDRESS", "0x0000000000000000000000000000000000000000"),

  /**
   * Chain ID.
   *   Ethereum Sepolia : 11155111
   *   Avalanche Fuji   : 43113
   * Auto-inferred from RPC_URL if not explicitly set.
   */
  chainId: resolveChainId(),

  /**
   * Minimum upload/download ratio required to receive a peer list.
   * Stored as a regular JS number; the contract returns ratios scaled by 1e18.
   * 0.5 → 0.5 * 1e18 = 5e17
   */
  minRatio: parseFloat(process.env["MIN_RATIO"] ?? "0.5"),

  /** Receipts older than this (seconds) are rejected as potential replays. */
  timestampWindowSeconds: parseInt(
    process.env["TIMESTAMP_WINDOW_SECONDS"] ?? "300",
    10
  ),

  /** Port for the BitTorrent tracker (HTTP announce + WebSocket). */
  trackerPort: parseInt(process.env["TRACKER_PORT"] ?? "8000", 10),

  /**
   * Secret token that must be supplied in the Authorization header when
   * calling the /migrate admin endpoint.  Keep this out of version control.
   */
  adminSecret: requireEnv("ADMIN_SECRET", ""),

  /** Skybox AI (Blockade Labs) API key — required for spatial environment generation. */
  skyboxApiKey: process.env["SKYBOX_API_KEY"] ?? "",

  /** Uniswap Trading API key — leave empty to use mock mode for demos. */
  uniswapApiKey: process.env["UNISWAP_API_KEY"] ?? "",

  /** Uniswap Trading API base URL. */
  uniswapApiBaseUrl:
    process.env["UNISWAP_API_BASE_URL"] ??
    "https://trade-api.gateway.uniswap.org/v1",

  /** Chain ID for swap operations (defaults to Sepolia). */
  swapChainId: parseInt(process.env["SWAP_CHAIN_ID"] ?? "11155111", 10),
};

export default config;

