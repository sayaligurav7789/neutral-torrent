import type {
  AgentDefinition,
  AgentId,
  AgentPosition,
  AgentWithState,
  DemoStep,
  NarrationEntry,
  StepDefinition,
} from "./agent-demo-types"

export const AGENTS: AgentDefinition[] = [
  {
    id: "A",
    name: "AURA",
    fullName: "Autonomous Urban Reconnaissance Agent",
    specialty: "Dashcam & Driving Data",
    address: "0xA1b2C3d4E5f6789012345678901234567890aaaa",
    accentColor: "rgba(34, 197, 94, VAR)",
    accentHsl: "142 71% 45%",
    avatarType: "dashcam",
    datasets: [
      {
        name: "Denver Metro Dashcam 2025",
        size: 53_687_091_200,
        description: "50GB of highway dashcam footage",
        iconName: "Camera",
      },
    ],
    initialRatio: Infinity,
    initialUpload: 1_073_741_824,
    initialDownload: 0,
  },
  {
    id: "B",
    name: "MEDI",
    fullName: "Medical Imaging Data Intelligence",
    specialty: "X-rays, MRIs & CT Scans",
    address: "0xB2c3D4e5F6a789012345678901234567890bBBb",
    accentColor: "rgba(59, 130, 246, VAR)",
    accentHsl: "217 91% 60%",
    avatarType: "medical",
    datasets: [
      {
        name: "Medical Imaging Corpus v3",
        size: 128_849_018_880,
        description: "120GB anonymized medical scans",
        iconName: "HeartPulse",
      },
    ],
    initialRatio: 1.2,
    initialUpload: 6_442_450_944,
    initialDownload: 5_368_709_120,
  },
  {
    id: "C",
    name: "SATO",
    fullName: "Satellite Observation & Terrain Oracle",
    specialty: "Aerial & Satellite Imagery",
    address: "0xC3d4E5f6A7b89012345678901234567890cCCc",
    accentColor: "rgba(245, 158, 11, VAR)",
    accentHsl: "38 92% 50%",
    avatarType: "satellite",
    datasets: [
      {
        name: "Colorado Front Range Satellite",
        size: 85_899_345_920,
        description: "80GB high-res satellite imagery",
        iconName: "Globe",
      },
    ],
    initialRatio: 0.85,
    initialUpload: 4_294_967_296,
    initialDownload: 5_053_440_000,
  },
  {
    id: "D",
    name: "VOXL",
    fullName: "Voice & Language Learning",
    specialty: "Multilingual Speech Corpus",
    address: "0xD4e5F6a7B8c9012345678901234567890dDDd",
    accentColor: "rgba(168, 85, 247, VAR)",
    accentHsl: "271 76% 65%",
    avatarType: "speech",
    datasets: [
      {
        name: "Polyglot Speech Dataset",
        size: 32_212_254_720,
        description: "30GB speech in 42 languages",
        iconName: "Languages",
      },
    ],
    initialRatio: 0.08,
    initialUpload: 429_496_729,
    initialDownload: 5_368_709_120,
  },
]

export const AGENT_POSITIONS: Record<AgentId, AgentPosition> = {
  A: { x: "12%", y: "50%" },
  B: { x: "35%", y: "20%" },
  C: { x: "65%", y: "20%" },
  D: { x: "88%", y: "50%" },
}

export const DEMO_STEPS: StepDefinition[] = [
  {
    step: "registration",
    label: "Registration",
    description: "Agents register wallets on-chain",
    durationMs: 4000,
    subStepCount: 5,
  },
  {
    step: "cataloging",
    label: "Data Catalog",
    description: "Agents advertise their datasets",
    durationMs: 4000,
    subStepCount: 5,
  },
  {
    step: "discovery",
    label: "Discovery",
    description: "Agent A discovers relevant data",
    durationMs: 5000,
    subStepCount: 5,
  },
  {
    step: "proof",
    label: "Proof of Data",
    description: "Cryptographic proof of possession",
    durationMs: 5000,
    subStepCount: 5,
  },
  {
    step: "transfer",
    label: "BT Transfer",
    description: "Piece-by-piece BitTorrent transfer",
    durationMs: 8000,
    subStepCount: 8,
  },
  {
    step: "reputation",
    label: "Reputation",
    description: "On-chain reputation updates",
    durationMs: 4000,
    subStepCount: 5,
  },
  {
    step: "choking",
    label: "Choking",
    description: "Free-rider gets blocked",
    durationMs: 8000,
    subStepCount: 9,
  },
]

export function getStepNarration(
  step: DemoStep,
  subStep: number
): NarrationEntry | null {
  const narrations: Record<DemoStep, { text: string; type: NarrationEntry["type"] }[]> = {
    idle: [],
    registration: [
      { text: "Agent AURA (You) registers wallet 0xA1...aaaa on Neural Torrent network", type: "info" },
      { text: "Agent MEDI registers wallet 0xB2...bBBb — 1 GB initial credit granted", type: "info" },
      { text: "Agent SATO registers wallet 0xC3...cCCc — on-chain confirmation received", type: "info" },
      { text: "Agent VOXL registers wallet 0xD4...dDDd — 4 agents now in swarm", type: "info" },
      { text: "All agents registered on-chain — reputation tracking active", type: "success" },
    ],
    cataloging: [
      { text: "AURA advertises: 50GB dashcam footage (Highway I-70, Denver metro)", type: "info" },
      { text: "MEDI advertises: 120GB medical imaging (X-ray, MRI, CT scans)", type: "info" },
      { text: "SATO advertises: 80GB satellite imagery (Colorado Front Range)", type: "info" },
      { text: "VOXL advertises: 30GB multilingual speech corpus (42 languages)", type: "info" },
      { text: "Data catalog complete — all datasets discoverable on network", type: "success" },
    ],
    discovery: [
      { text: "AURA needs medical imaging data to improve autonomous driving safety", type: "highlight" },
      { text: "AURA queries Neural Torrent tracker for medical imaging datasets...", type: "info" },
      { text: "Scanning network peers for matching data categories...", type: "info" },
      { text: "Match found: MEDI has 120GB medical imaging data available", type: "success" },
      { text: "Peer connection established between AURA and MEDI", type: "success" },
    ],
    proof: [
      { text: "AURA sends Merkle root challenge to MEDI", type: "info" },
      { text: "Challenge: Prove possession of piece #7 of medical_imaging_batch_01.tar", type: "info" },
      { text: "MEDI responds with Merkle proof + piece hash (0x7f3a...b2c1)", type: "info" },
      { text: "Cryptographic verification PASSED — data possession confirmed ✓", type: "success" },
      { text: "Proof of possession complete — ready for BitTorrent transfer", type: "success" },
    ],
    transfer: [
      { text: "BitTorrent transfer initiated: 4 pieces @ 256KB each", type: "highlight" },
      { text: "Piece 1/4 received — signed receipt submitted to blockchain", type: "info" },
      { text: "Receipt signature verified: 0x8e2f...a3d9 (ECDSA secp256k1)", type: "info" },
      { text: "Piece 2/4 received — cryptographic receipt verified on-chain", type: "info" },
      { text: "Piece 3/4 received — transfer 75% complete", type: "info" },
      { text: "Piece 4/4 received — final receipt recorded on-chain", type: "info" },
      { text: "All 4 pieces received — transfer complete: 1MB from MEDI to AURA", type: "success" },
      { text: "AURA now has medical imaging data to improve driving safety model", type: "highlight" },
    ],
    reputation: [
      { text: "Updating on-chain reputation via ReputationTracker contract...", type: "info" },
      { text: "MEDI: Upload +1MB → Ratio 1.20 → 1.50 (Excellent)", type: "success" },
      { text: "AURA: Download +1MB → Ratio ∞ → 0.95 (Good)", type: "warning" },
      { text: "Reputation changes confirmed on-chain — immutable record", type: "success" },
      { text: "Both agents maintain healthy ratios — network access preserved", type: "success" },
    ],
    choking: [
      { text: "VOXL requests satellite imagery from SATO...", type: "info" },
      { text: "SATO grants peer access — VOXL begins downloading", type: "info" },
      { text: "Pieces flowing: SATO → VOXL (satellite imagery transfer)", type: "info" },
      { text: "VOXL downloads 2GB but does NOT seed any speech data back", type: "warning" },
      { text: "VOXL ratio drops: 0.08 → 0.04 — below minimum threshold (0.50)", type: "warning" },
      { text: "Neural Torrent tracker detects free-rider behavior...", type: "error" },
      { text: "Choking mechanism enforced — VOXL connections severed", type: "error" },
      { text: "VOXL is now BLOCKED from the network until it seeds data", type: "error" },
      { text: "Free-rider protection enforced — honest agents are protected", type: "highlight" },
    ],
  }

  const entries = narrations[step]
  if (!entries || subStep >= entries.length) return null

  const entry = entries[subStep]
  return {
    id: `${step}-${subStep}-${Date.now()}`,
    timestamp: Date.now(),
    text: entry.text,
    type: entry.type,
    step,
  }
}

export function createInitialAgents(): Record<AgentId, AgentWithState> {
  const result = {} as Record<AgentId, AgentWithState>
  for (const agent of AGENTS) {
    result[agent.id] = {
      ...agent,
      state: "hidden",
      ratio: agent.initialRatio,
      uploadBytes: agent.initialUpload,
      downloadBytes: agent.initialDownload,
    }
  }
  return result
}
