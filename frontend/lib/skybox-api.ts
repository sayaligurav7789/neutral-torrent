import type { SkyboxRecord, SpatialMemory } from "./skybox-types"

const BASE_URL = import.meta.env.VITE_BACKEND_URL ?? "http://localhost:3001"

export async function generateSkybox(
  prompt: string,
  agentId: string,
  spatialContext: string,
  skyboxStyleId?: number,
): Promise<{ success: boolean; skybox: SkyboxRecord }> {
  const res = await fetch(`${BASE_URL}/skybox/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt,
      skybox_style_id: skyboxStyleId ?? 2,
      enhance_prompt: true,
      agentId,
      spatialContext,
    }),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export async function checkSkyboxStatus(
  id: number,
): Promise<{ skybox: SkyboxRecord }> {
  const res = await fetch(`${BASE_URL}/skybox/status/${id}`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export async function getSkyboxHistory(): Promise<{
  skyboxes: SkyboxRecord[]
}> {
  const res = await fetch(`${BASE_URL}/skybox/history`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export async function getAgentSpatialMemory(
  agentId: string,
): Promise<{ memory: SpatialMemory }> {
  const res = await fetch(`${BASE_URL}/skybox/memory/${agentId}`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export async function getSkyboxStyles(): Promise<unknown> {
  const res = await fetch(`${BASE_URL}/skybox/styles`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}
