
import { Button } from "@/components/ui/button"
import {
  ArrowUpDown,
  Radio,
  GitBranch,
  RotateCcw,
  Loader2,
} from "lucide-react"

interface ActionButtonsProps {
  onSimulateTransfer: () => void
  onAnnounce: () => void
  onMigrate: () => void
  onServerRestart: () => void
  isMigrated: boolean
  isRestarting: boolean
  isAnnouncing: boolean
}

export function ActionButtons({
  onSimulateTransfer,
  onAnnounce,
  onMigrate,
  onServerRestart,
  isMigrated,
  isRestarting,
  isAnnouncing,
}: ActionButtonsProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <Button
        onClick={onSimulateTransfer}
        className="h-auto py-4 flex-col gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
      >
        <ArrowUpDown className="h-5 w-5" />
        <span className="text-xs font-medium">Simulate Transfer</span>
      </Button>

      <Button
        onClick={onAnnounce}
        disabled={isAnnouncing}
        variant="outline"
        className="h-auto py-4 flex-col gap-2 border-border text-foreground hover:bg-secondary hover:border-warning/30 hover:text-warning"
      >
        {isAnnouncing ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <Radio className="h-5 w-5" />
        )}
        <span className="text-xs font-medium">Announce</span>
      </Button>

      <Button
        onClick={onServerRestart}
        disabled={isRestarting}
        variant="outline"
        className="h-auto py-4 flex-col gap-2 border-border text-foreground hover:bg-secondary hover:border-chart-4/30 hover:text-chart-4"
      >
        {isRestarting ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <RotateCcw className="h-5 w-5" />
        )}
        <span className="text-xs font-medium">
          {isRestarting ? "Restarting..." : "Server Restart"}
        </span>
      </Button>

      <Button
        onClick={onMigrate}
        disabled={isMigrated}
        variant="outline"
        className="h-auto py-4 flex-col gap-2 border-border text-foreground hover:bg-secondary hover:border-chart-4/30 hover:text-chart-4 disabled:opacity-50"
      >
        <GitBranch className="h-5 w-5" />
        <span className="text-xs font-medium">
          {isMigrated ? "Migrated" : "Migrate"}
        </span>
      </Button>
    </div>
  )
}
