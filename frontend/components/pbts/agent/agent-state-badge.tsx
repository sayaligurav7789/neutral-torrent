import { Badge } from "@/components/ui/badge"
import type { AgentState } from "@/lib/agent-demo-types"

const STATE_CONFIG: Record<
  AgentState,
  { label: string; className: string }
> = {
  hidden: { label: "", className: "" },
  idle: {
    label: "Idle",
    className: "border-border text-muted-foreground bg-secondary/50",
  },
  registering: {
    label: "Registering...",
    className: "border-blue-500/30 text-blue-400 bg-blue-500/10",
  },
  cataloging: {
    label: "Cataloging...",
    className: "border-amber-500/30 text-amber-400 bg-amber-500/10",
  },
  discovering: {
    label: "Discovering...",
    className: "border-primary/30 text-primary bg-primary/10",
  },
  proving: {
    label: "Verifying...",
    className: "border-primary/30 text-primary bg-primary/10",
  },
  transferring: {
    label: "Transferring...",
    className: "border-green-500/30 text-green-400 bg-green-500/10",
  },
  receiving: {
    label: "Receiving...",
    className: "border-green-500/30 text-green-400 bg-green-500/10",
  },
  choked: {
    label: "CHOKED",
    className: "border-red-500/30 text-red-400 bg-red-500/10",
  },
}

interface AgentStateBadgeProps {
  state: AgentState
}

export function AgentStateBadge({ state }: AgentStateBadgeProps) {
  if (state === "hidden") return null
  const config = STATE_CONFIG[state]

  return (
    <Badge
      variant="outline"
      className={`text-[10px] px-2 py-0 ${config.className}`}
    >
      {state !== "idle" && state !== "choked" && (
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-current mr-1 animate-pulse" />
      )}
      {config.label}
    </Badge>
  )
}
