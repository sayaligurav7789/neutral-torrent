export interface SkyboxRecord {
  id: number
  agentId: string
  prompt: string
  styleId: number
  status: "pending" | "dispatched" | "processing" | "complete" | "error"
  fileUrl: string | null
  thumbUrl: string | null
  depthMapUrl: string | null
  createdAt: number
  completedAt: number | null
  spatialContext: string
}

export interface SpatialMemory {
  agentId: string
  visitedEnvironments: SkyboxRecord[]
  currentEnvironmentId: number | null
}

/**
 * Each agent's data specialty maps to a curated environment prompt.
 * These prompts generate 360° worlds that visually represent the
 * agent's domain — demonstrating spatial contextual reasoning.
 */
export const AGENT_ENVIRONMENT_PROMPTS: Record<
  string,
  { prompt: string; spatialContext: string; styleId: number }
> = {
  A: {
    prompt:
      "A futuristic highway at sunset with autonomous vehicles streaming data, Denver Colorado Rocky Mountains in background, neon road markers, smart traffic monitoring systems, wide panoramic view, cyberpunk aesthetic",
    spatialContext:
      "AURA's autonomous driving corridor — Denver I-70 highway monitoring zone",
    styleId: 2,
  },
  B: {
    prompt:
      "Inside a high-tech medical imaging laboratory with MRI machines, holographic X-ray displays floating in air, blue sterile lighting, hospital equipment, medical AI workstation with brain scans on screens",
    spatialContext:
      "MEDI's medical imaging analysis lab — diagnostic data processing center",
    styleId: 2,
  },
  C: {
    prompt:
      "A satellite ground station control room with panoramic view of Colorado Rocky Mountains from orbit, terrain data overlays, topographic holograms, aerial surveillance screens, Earth observation deck",
    spatialContext:
      "SATO's satellite observation deck — Colorado Front Range monitoring post",
    styleId: 2,
  },
  D: {
    prompt:
      "A multilingual speech processing room with colorful sound wave visualizations, recording booths, floating text in many different languages, audio spectrum analyzers, futuristic voice AI interface",
    spatialContext:
      "VOXL's polyglot speech laboratory — multilingual corpus processing center",
    styleId: 2,
  },
}
