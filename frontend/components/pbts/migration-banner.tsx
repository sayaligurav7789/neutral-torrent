
import { Badge } from "@/components/ui/badge"
import {
  GitBranch,
  ExternalLink,
  ArrowRight,
} from "lucide-react"
import { shortenAddress, FUJI_EXPLORER } from "@/lib/pbts-types"
import type { ContractInfo } from "@/lib/pbts-types"

interface MigrationBannerProps {
  contractInfo: ContractInfo
}

export function MigrationBanner({ contractInfo }: MigrationBannerProps) {
  if (!contractInfo.migratedFrom) return null

  return (
    <div className="border border-chart-4/30 bg-chart-4/5 rounded-lg px-4 py-3">
      <div className="flex items-center gap-3 flex-wrap">
        <GitBranch className="h-4 w-4 text-chart-4 shrink-0" />
        <Badge
          variant="outline"
          className="border-chart-4/30 text-chart-4 text-[10px] uppercase tracking-wider"
        >
          Migrated
        </Badge>
        <div className="flex items-center gap-2 text-xs flex-wrap">
          <span className="text-muted-foreground">From</span>
          <a
            href={`${FUJI_EXPLORER}/address/${contractInfo.migratedFrom}`}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
          >
            {shortenAddress(contractInfo.migratedFrom)}
            <ExternalLink className="h-2.5 w-2.5" />
          </a>
          <ArrowRight className="h-3 w-3 text-muted-foreground" />
          <span className="text-muted-foreground">To</span>
          <a
            href={`${FUJI_EXPLORER}/address/${contractInfo.address}`}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-foreground hover:text-primary transition-colors flex items-center gap-1"
          >
            {shortenAddress(contractInfo.address)}
            <ExternalLink className="h-2.5 w-2.5" />
          </a>
        </div>
        <span className="text-[10px] text-muted-foreground ml-auto">
          Reputation preserved via RepFactory
        </span>
      </div>
    </div>
  )
}
