import { motion, AnimatePresence } from "framer-motion"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { shortenAddress, formatBytes, getRatioColor } from "@/lib/pbts-types"
import type { AgentWithState, AgentPosition, DemoStep } from "@/lib/agent-demo-types"
import { AgentAvatar } from "./agent-avatar"
import { AgentStateBadge } from "./agent-state-badge"
import { DatasetTag } from "./dataset-tag"

interface AgentNodeProps {
  agent: AgentWithState
  position: AgentPosition
  isYou: boolean
  currentStep: DemoStep
  transferProgress: number
}

export function AgentNode({
  agent,
  position,
  isYou,
  currentStep,
  transferProgress,
}: AgentNodeProps) {
  const showDatasets =
    currentStep !== "idle" && currentStep !== "registration"
  const showTransferProgress =
    agent.state === "receiving" || (agent.id === "A" && currentStep === "transfer")

  return (
    <AnimatePresence>
      {agent.state !== "hidden" && (
        <motion.div
          className="absolute -translate-x-1/2 -translate-y-1/2 z-10"
          style={{ left: position.x, top: position.y }}
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.5 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <div
            className={`relative w-[160px] rounded-xl border p-3 transition-all duration-500 ${
              agent.state === "choked"
                ? "border-red-500/40 bg-card/30"
                : agent.state === "transferring" || agent.state === "receiving"
                  ? "border-green-500/30 bg-card/60 shadow-[0_0_20px_rgba(34,197,94,0.1)]"
                  : agent.state === "discovering" || agent.state === "proving"
                    ? "border-primary/30 bg-card/60"
                    : "border-border bg-card/50"
            } backdrop-blur-sm`}
          >
            {/* YOU badge */}
            {isYou && (
              <Badge className="absolute -top-2.5 -right-2 bg-primary text-primary-foreground text-[9px] px-2 py-0 z-20">
                YOU
              </Badge>
            )}

            {/* Avatar */}
            <AgentAvatar
              avatarType={agent.avatarType}
              accentHsl={agent.accentHsl}
              state={agent.state}
            />

            {/* Name & specialty */}
            <div className="text-center mt-2">
              <p className="font-bold text-sm text-foreground leading-tight">
                {agent.name}
              </p>
              <p className="text-[9px] text-muted-foreground leading-tight mt-0.5">
                {agent.specialty}
              </p>
              <Badge
                variant="outline"
                className="text-[8px] font-mono mt-1 px-1.5 py-0 border-border"
              >
                {shortenAddress(agent.address)}
              </Badge>
            </div>

            {/* Reputation mini-bar */}
            <div className="mt-2 px-1">
              <div className="flex justify-between text-[9px] text-muted-foreground">
                <span>Ratio</span>
                <motion.span
                  className={getRatioColor(agent.ratio)}
                  key={agent.ratio}
                  initial={{ scale: 1.3 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  {agent.ratio === Infinity ? "INF" : agent.ratio.toFixed(2)}
                </motion.span>
              </div>
              <Progress
                value={Math.min(agent.ratio === Infinity ? 100 : agent.ratio * 50, 100)}
                className="h-1 mt-0.5"
              />
              <div className="flex justify-between text-[8px] text-muted-foreground mt-0.5">
                <span className="text-green-400">
                  Up: {formatBytes(agent.uploadBytes)}
                </span>
                <span className="text-red-400">
                  Dn: {formatBytes(agent.downloadBytes)}
                </span>
              </div>
            </div>

            {/* Transfer progress bar (for receiver during transfer step) */}
            {showTransferProgress && (
              <motion.div
                className="mt-2 px-1"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
              >
                <div className="flex justify-between text-[9px]">
                  <span className="text-green-400">Downloading</span>
                  <span className="text-green-400 font-mono">
                    {transferProgress}%
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-secondary mt-0.5 overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-green-500"
                    initial={{ width: 0 }}
                    animate={{ width: `${transferProgress}%` }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                  />
                </div>
              </motion.div>
            )}

            {/* State badge */}
            <div className="flex justify-center mt-2">
              <AgentStateBadge state={agent.state} />
            </div>

            {/* Dataset tags */}
            {showDatasets && agent.datasets.length > 0 && (
              <div className="flex justify-center mt-1.5">
                <DatasetTag
                  dataset={agent.datasets[0]}
                  visible={showDatasets}
                />
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
