import { useDemoTimeline } from "@/hooks/use-demo-timeline"
import { DemoControlBar } from "./demo-control-bar"
import { NetworkCanvas } from "./network-canvas"
import { NarrationPanel } from "./narration-panel"
import { SpatialWorlds } from "./spatial-worlds"
import type { AgentId } from "@/lib/agent-demo-types"

function getActiveAgents(step: string): AgentId[] {
  switch (step) {
    case "registration":
    case "cataloging":
      return ["A", "B", "C", "D"]
    case "discovery":
    case "proof":
    case "transfer":
      return ["A", "B"]
    case "reputation":
      return ["A", "B"]
    case "choking":
      return ["C", "D"]
    default:
      return []
  }
}

export function AgentDemo() {
  const { state, play, pause, reset, setSpeed, isComplete } =
    useDemoTimeline()

  return (
    <div className="flex flex-col gap-4 h-full min-h-[calc(100vh-180px)]">
      {/* Header */}
      <div>
        <h2 className="text-lg font-bold text-foreground">
          Agent Data Exchange
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          AI agents autonomously discover, verify, and exchange training data
          via the Neural Torrent protocol
        </p>
      </div>

      {/* Control bar */}
      <DemoControlBar
        stepIndex={state.stepIndex}
        isAutoPlaying={state.isAutoPlaying}
        playbackSpeed={state.playbackSpeed}
        isComplete={isComplete}
        onPlay={play}
        onPause={pause}
        onReset={reset}
        onSpeedChange={setSpeed}
      />

      {/* Canvas + Activity Log side by side (3:1) */}
      <div className="flex gap-4 h-[700px]">
        {/* Network canvas — 3/4 width */}
        <div className="flex-[3] min-w-0">
          <NetworkCanvas
            agents={state.agents}
            connections={state.connections}
            particles={state.particles}
            currentStep={state.currentStep}
            subStep={state.subStep}
            transferProgress={state.transferProgress}
          />
        </div>

        {/* Narration panel — 1/4 width */}
        <div className="flex-[1] min-w-0 h-full">
          <NarrationPanel entries={state.narration} />
        </div>
      </div>

      {/* Spatial Worlds — Skybox AI integration */}
      <SpatialWorlds
        currentStep={state.currentStep}
        activeAgentIds={getActiveAgents(state.currentStep)}
      />
    </div>
  )
}
