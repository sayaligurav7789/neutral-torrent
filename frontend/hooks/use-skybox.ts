import { useState, useCallback, useRef, useEffect } from "react"
import type { SkyboxRecord, SpatialMemory } from "@/lib/skybox-types"
import { AGENT_ENVIRONMENT_PROMPTS } from "@/lib/skybox-types"
import {
  generateSkybox,
  checkSkyboxStatus,
  getAgentSpatialMemory,
} from "@/lib/skybox-api"

interface UseSkyboxReturn {
  currentSkybox: SkyboxRecord | null
  isGenerating: boolean
  error: string | null
  spatialMemories: Record<string, SpatialMemory>
  generateForAgent: (agentId: string) => Promise<void>
  loadAgentMemory: (agentId: string) => Promise<void>
  clearError: () => void
}

export function useSkybox(): UseSkyboxReturn {
  const [currentSkybox, setCurrentSkybox] = useState<SkyboxRecord | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [spatialMemories, setSpatialMemories] = useState<
    Record<string, SpatialMemory>
  >({})
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
  }, [])

  // Clean up polling on unmount
  useEffect(() => {
    return () => stopPolling()
  }, [stopPolling])

  const startPolling = useCallback(
    (id: number) => {
      stopPolling()
      pollRef.current = setInterval(async () => {
        try {
          const { skybox } = await checkSkyboxStatus(id)
          if (skybox) {
            setCurrentSkybox(skybox)
            if (skybox.status === "complete" || skybox.status === "error") {
              stopPolling()
              setIsGenerating(false)
              if (skybox.status === "error") {
                setError("Skybox generation failed")
              }
            }
          }
        } catch {
          // Silently retry on network errors
        }
      }, 3000)
    },
    [stopPolling],
  )

  const generateForAgent = useCallback(
    async (agentId: string) => {
      const config = AGENT_ENVIRONMENT_PROMPTS[agentId]
      if (!config) {
        setError(`No environment config for agent ${agentId}`)
        return
      }

      setIsGenerating(true)
      setError(null)

      try {
        const { skybox } = await generateSkybox(
          config.prompt,
          agentId,
          config.spatialContext,
          config.styleId,
        )
        setCurrentSkybox(skybox)
        startPolling(skybox.id)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Generation failed")
        setIsGenerating(false)
      }
    },
    [startPolling],
  )

  const loadAgentMemory = useCallback(async (agentId: string) => {
    try {
      const { memory } = await getAgentSpatialMemory(agentId)
      setSpatialMemories((prev) => ({ ...prev, [agentId]: memory }))
    } catch {
      // Silent fail — memory is optional
    }
  }, [])

  const clearError = useCallback(() => setError(null), [])

  return {
    currentSkybox,
    isGenerating,
    error,
    spatialMemories,
    generateForAgent,
    loadAgentMemory,
    clearError,
  }
}
