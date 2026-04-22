import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Globe,
  ChevronDown,
  ChevronUp,
  Sparkles,
  MapPin,
  Brain,
} from "lucide-react"
import type { AgentId, DemoStep } from "@/lib/agent-demo-types"
import { AGENTS } from "@/lib/agent-demo-data"
import { AGENT_ENVIRONMENT_PROMPTS } from "@/lib/skybox-types"
import { SkyboxViewer } from "./skybox-viewer"
import { useSkybox } from "@/hooks/use-skybox"

interface SpatialWorldsProps {
  currentStep: DemoStep
  activeAgentIds: AgentId[]
}

export function SpatialWorlds({
  currentStep,
  activeAgentIds,
}: SpatialWorldsProps) {
  const [isExpanded, setIsExpanded] = useState(true)
  const [selectedAgent, setSelectedAgent] = useState<AgentId | null>(null)
  const [visitedLog, setVisitedLog] = useState<
    Array<{ agentId: AgentId; timestamp: number; context: string }>
  >([])

  const {
    currentSkybox,
    isGenerating,
    error,
    generateForAgent,
    loadAgentMemory,
  } = useSkybox()

  // Determine relevant agents based on current demo step
  const relevantAgents: AgentId[] =
    currentStep === "idle"
      ? (["A", "B", "C", "D"] as AgentId[])
      : activeAgentIds.length > 0
        ? activeAgentIds
        : (["A", "B", "C", "D"] as AgentId[])

  // Auto-select first agent if none selected
  useEffect(() => {
    if (!selectedAgent && relevantAgents.length > 0) {
      setSelectedAgent(relevantAgents[0])
    }
  }, [relevantAgents, selectedAgent])

  // Load memory when agent is selected
  useEffect(() => {
    if (selectedAgent) {
      loadAgentMemory(selectedAgent)
    }
  }, [selectedAgent, loadAgentMemory])

  const handleGenerate = async (agentId: AgentId) => {
    setSelectedAgent(agentId)
    await generateForAgent(agentId)

    const envConfig = AGENT_ENVIRONMENT_PROMPTS[agentId]
    if (envConfig) {
      setVisitedLog((prev) => [
        ...prev,
        {
          agentId,
          timestamp: Date.now(),
          context: envConfig.spatialContext,
        },
      ])
    }
  }

  const agentInfo = selectedAgent
    ? AGENTS.find((a) => a.id === selectedAgent)
    : null

  return (
    <div className="rounded-lg border border-border bg-card/30 backdrop-blur-sm overflow-hidden">
      {/* Collapsible header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-secondary/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Globe className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">
            Spatial Worlds
          </span>
          <Badge
            variant="outline"
            className="text-[10px] border-primary/30 text-primary"
          >
            Skybox AI
          </Badge>
          {visitedLog.length > 0 && (
            <Badge variant="secondary" className="text-[10px]">
              {visitedLog.length} visited
            </Badge>
          )}
        </div>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="px-4 pb-4 space-y-3">
              {/* Agent selector row */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-muted-foreground">
                  Environment:
                </span>
                <div className="flex gap-1.5">
                  {relevantAgents.map((agentId) => {
                    const agent = AGENTS.find((a) => a.id === agentId)!
                    const isSelected = selectedAgent === agentId
                    const hasVisited = visitedLog.some(
                      (v) => v.agentId === agentId,
                    )
                    return (
                      <button
                        key={agentId}
                        onClick={() => setSelectedAgent(agentId)}
                        className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                          isSelected
                            ? "bg-primary/15 text-primary border border-primary/30"
                            : "bg-secondary/50 text-muted-foreground border border-transparent hover:border-border"
                        }`}
                      >
                        {agent.name}
                        {hasVisited && (
                          <span className="ml-1 text-green-400">&#x2713;</span>
                        )}
                      </button>
                    )
                  })}
                </div>

                {selectedAgent && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleGenerate(selectedAgent)}
                    disabled={isGenerating}
                    className="ml-auto h-7 text-xs gap-1.5"
                  >
                    <Sparkles className="h-3 w-3" />
                    {isGenerating ? "Generating..." : "Generate World"}
                  </Button>
                )}
              </div>

              {/* Error display */}
              {error && (
                <div className="text-xs text-red-400 bg-red-500/10 rounded px-3 py-2">
                  {error}
                </div>
              )}

              {/* 360-degree panorama viewer */}
              <SkyboxViewer
                skybox={currentSkybox}
                isGenerating={isGenerating}
                className="h-[280px]"
              />

              {/* Spatial context info */}
              {agentInfo && selectedAgent && (
                <div className="text-xs">
                  <p className="text-muted-foreground">
                    <span className="font-medium text-foreground">
                      {agentInfo.name}
                    </span>
                    &apos;s data domain: {agentInfo.specialty}
                  </p>
                  {AGENT_ENVIRONMENT_PROMPTS[selectedAgent] && (
                    <p className="text-muted-foreground/60 mt-0.5 italic">
                      {AGENT_ENVIRONMENT_PROMPTS[selectedAgent].spatialContext}
                    </p>
                  )}
                </div>
              )}

              {/* Spatial Memory Log */}
              {visitedLog.length > 0 && (
                <div className="border-t border-border pt-3">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Brain className="h-3.5 w-3.5 text-primary/60" />
                    <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                      Spatial Memory ({visitedLog.length} environments)
                    </span>
                  </div>
                  <div className="space-y-1 max-h-[120px] overflow-y-auto">
                    {visitedLog.map((entry, i) => {
                      const agent = AGENTS.find(
                        (a) => a.id === entry.agentId,
                      )
                      return (
                        <div
                          key={`${entry.agentId}-${entry.timestamp}-${i}`}
                          className="flex items-center gap-2 text-[10px] text-muted-foreground"
                        >
                          <MapPin className="h-2.5 w-2.5 shrink-0" />
                          <span className="font-medium text-foreground">
                            {agent?.name}
                          </span>
                          <span className="truncate">{entry.context}</span>
                          <span className="ml-auto text-muted-foreground/50 shrink-0">
                            {new Date(entry.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
