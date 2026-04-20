/**
 * Seeds demo data for testing all features of the PBTS marketplace.
 *
 * Populates:
 *   - Known users (userRegistry) — so GET /users returns agents
 *   - Swarm torrents (announce.swarm) — so GET /torrents returns content
 *   - Marketplace listings (pricingStore) — so GET /marketplace/listings returns priced content
 *   - Access grants (pricingStore) — so one agent already has purchased access
 */

import { trackAddress } from "../tracker/userRegistry";
import { swarm } from "../routes/announce";
import { setContentPrice, grantAccess } from "./pricingStore";

// ── Demo agents ──────────────────────────────────────────────────────────

const DEMO_AGENTS = {
  alpha: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",  // Anvil account #0
  beta:  "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",  // Anvil account #1
  gamma: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",  // Anvil account #2
  delta: "0x90F79bf6EB2c4f870365E785982E1f101E93b906",  // Anvil account #3
  echo:  "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65",  // Anvil account #4
};

// ── Demo infohashes ──────────────────────────────────────────────────────

const DEMO_TORRENTS = {
  cookingVideos:     "0xaabbccdd11223344556677889900aabbccdd1122334455667788990011223344",
  mlDataset:         "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
  researchPapers:    "0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef",
  ethDenverWorkshop: "0x00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff",
  openSourceModels:  "0xfedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210",
};

// ── Seed function ────────────────────────────────────────────────────────

export function seedDemoData(): void {
  console.log("[Demo] Seeding demo data...");

  // 1. Register all demo agents as known users
  for (const [name, address] of Object.entries(DEMO_AGENTS)) {
    trackAddress(address);
    console.log(`[Demo]   User: ${name} (${address})`);
  }

  // 2. Populate swarm with torrents and peers
  const swarmData: Array<{ infohash: string; name: string; seeders: string[] }> = [
    {
      infohash: DEMO_TORRENTS.cookingVideos,
      name: "Cooking Videos",
      seeders: [DEMO_AGENTS.alpha, DEMO_AGENTS.beta],
    },
    {
      infohash: DEMO_TORRENTS.mlDataset,
      name: "ML Training Dataset",
      seeders: [DEMO_AGENTS.beta, DEMO_AGENTS.gamma, DEMO_AGENTS.delta],
    },
    {
      infohash: DEMO_TORRENTS.researchPapers,
      name: "Research Papers Collection",
      seeders: [DEMO_AGENTS.gamma],
    },
    {
      infohash: DEMO_TORRENTS.ethDenverWorkshop,
      name: "ETH Denver Workshop Materials",
      seeders: [DEMO_AGENTS.alpha, DEMO_AGENTS.echo],
    },
    {
      infohash: DEMO_TORRENTS.openSourceModels,
      name: "Open Source AI Models",
      seeders: [DEMO_AGENTS.delta, DEMO_AGENTS.echo],
    },
  ];

  for (const torrent of swarmData) {
    const peerSet = new Set(torrent.seeders.map((a) => a.toLowerCase()));
    swarm.set(torrent.infohash, peerSet);
    console.log(`[Demo]   Torrent: ${torrent.name} (${peerSet.size} seeders)`);
  }

  // 3. Add marketplace listings with prices
  setContentPrice({
    infohash: DEMO_TORRENTS.cookingVideos,
    sellerAddress: DEMO_AGENTS.alpha,
    tokenAddress: "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14", // WETH
    tokenSymbol: "WETH",
    amount: "10000000000000000", // 0.01 WETH
    description: "Cooking Videos Dataset — 500 recipes with video demonstrations",
    createdAt: Date.now() - 3600000, // 1 hour ago
  });

  setContentPrice({
    infohash: DEMO_TORRENTS.mlDataset,
    sellerAddress: DEMO_AGENTS.beta,
    tokenAddress: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238", // USDC
    tokenSymbol: "USDC",
    amount: "5000000", // 5 USDC
    description: "ML Training Dataset — 10k labeled images for computer vision",
    createdAt: Date.now() - 7200000, // 2 hours ago
  });

  setContentPrice({
    infohash: DEMO_TORRENTS.researchPapers,
    sellerAddress: DEMO_AGENTS.gamma,
    tokenAddress: "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984", // UNI
    tokenSymbol: "UNI",
    amount: "2000000000000000000", // 2 UNI
    description: "Research Papers — 50 curated papers on decentralized systems",
    createdAt: Date.now() - 1800000, // 30 min ago
  });

  setContentPrice({
    infohash: DEMO_TORRENTS.ethDenverWorkshop,
    sellerAddress: DEMO_AGENTS.alpha,
    tokenAddress: "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14", // WETH
    tokenSymbol: "WETH",
    amount: "5000000000000000", // 0.005 WETH
    description: "ETH Denver 2026 Workshop — Smart contract security deep dive",
    createdAt: Date.now() - 600000, // 10 min ago
  });

  setContentPrice({
    infohash: DEMO_TORRENTS.openSourceModels,
    sellerAddress: DEMO_AGENTS.delta,
    tokenAddress: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238", // USDC
    tokenSymbol: "USDC",
    amount: "10000000", // 10 USDC
    description: "Open Source AI Models — Fine-tuned LLMs for code generation",
    createdAt: Date.now() - 300000, // 5 min ago
  });

  // 4. Grant one pre-existing access (echo already bought the cooking videos)
  grantAccess(DEMO_TORRENTS.cookingVideos, DEMO_AGENTS.echo);

  console.log("[Demo] Seed data loaded: 5 users, 5 torrents, 5 listings, 1 access grant");
}
