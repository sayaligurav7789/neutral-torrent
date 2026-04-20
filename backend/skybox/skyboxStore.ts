// ── Types ─────────────────────────────────────────────────────────────────

export interface SkyboxRecord {
  id: number;
  agentId: string;
  prompt: string;
  styleId: number;
  status: "pending" | "dispatched" | "processing" | "complete" | "error";
  fileUrl: string | null;
  thumbUrl: string | null;
  depthMapUrl: string | null;
  createdAt: number;
  completedAt: number | null;
  spatialContext: string;
}

export interface SpatialMemory {
  agentId: string;
  visitedEnvironments: SkyboxRecord[];
  currentEnvironmentId: number | null;
}

// ── In-memory stores ──────────────────────────────────────────────────────

const skyboxes = new Map<number, SkyboxRecord>();
const spatialMemory = new Map<string, SpatialMemory>();

// ── Skybox records ────────────────────────────────────────────────────────

export function addSkybox(record: SkyboxRecord): void {
  skyboxes.set(record.id, record);
}

export function getSkybox(id: number): SkyboxRecord | null {
  return skyboxes.get(id) ?? null;
}

export function updateSkyboxStatus(
  id: number,
  updates: Partial<SkyboxRecord>,
): void {
  const existing = skyboxes.get(id);
  if (existing) {
    skyboxes.set(id, { ...existing, ...updates });

    // Also update in spatial memory if present
    const memory = spatialMemory.get(existing.agentId);
    if (memory) {
      const idx = memory.visitedEnvironments.findIndex((e) => e.id === id);
      if (idx !== -1) {
        memory.visitedEnvironments[idx] = { ...existing, ...updates };
      }
    }
  }
}

export function getAllSkyboxes(): SkyboxRecord[] {
  return Array.from(skyboxes.values());
}

// ── Spatial memory ────────────────────────────────────────────────────────

export function getAgentMemory(agentId: string): SpatialMemory {
  if (!spatialMemory.has(agentId)) {
    spatialMemory.set(agentId, {
      agentId,
      visitedEnvironments: [],
      currentEnvironmentId: null,
    });
  }
  return spatialMemory.get(agentId)!;
}

export function addToAgentMemory(
  agentId: string,
  skybox: SkyboxRecord,
): void {
  const memory = getAgentMemory(agentId);
  memory.visitedEnvironments.push(skybox);
}

export function setCurrentEnvironment(
  agentId: string,
  skyboxId: number,
): void {
  const memory = getAgentMemory(agentId);
  memory.currentEnvironmentId = skyboxId;
}
