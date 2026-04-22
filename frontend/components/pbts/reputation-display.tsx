
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import {
  ArrowUp,
  ArrowDown,
  TrendingUp,
  Database,
} from "lucide-react"
import type { UserReputation } from "@/lib/pbts-types"
import {
  formatBytes,
  getRatioColor,
  getRatioBgColor,
  getRatioLabel,
} from "@/lib/pbts-types"

interface ReputationDisplayProps {
  reputation: UserReputation
}

export function ReputationDisplay({ reputation }: ReputationDisplayProps) {
  const displayRatio =
    reputation.ratio === Infinity
      ? "INF"
      : reputation.ratio.toFixed(2)

  const maxBytes = Math.max(reputation.uploadBytes, reputation.downloadBytes, 1073741824)
  const uploadPercent = (reputation.uploadBytes / (maxBytes * 1.2)) * 100
  const downloadPercent = (reputation.downloadBytes / (maxBytes * 1.2)) * 100

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Ratio Card - Main display */}
      <Card className="border-border bg-card lg:row-span-1">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Reputation Ratio
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex items-baseline gap-3">
            <span
              className={`text-5xl font-bold font-mono tracking-tight ${getRatioColor(reputation.ratio)}`}
            >
              {displayRatio}
            </span>
            <Badge
              variant="outline"
              className={`${getRatioBgColor(reputation.ratio)}/10 border-current ${getRatioColor(reputation.ratio)} text-xs`}
            >
              {getRatioLabel(reputation.ratio)}
            </Badge>
          </div>
          {/* Ratio meter bar */}
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>0.0</span>
              <span>0.5 min</span>
              <span>1.0</span>
              <span>2.0+</span>
            </div>
            <div className="h-2 rounded-full bg-secondary overflow-hidden relative">
              <div
                className={`h-full rounded-full transition-all duration-700 ease-out ${getRatioBgColor(reputation.ratio)}`}
                style={{
                  width: `${Math.min((reputation.ratio === Infinity ? 2.5 : reputation.ratio) / 2.5 * 100, 100)}%`,
                }}
              />
              {/* Min ratio indicator */}
              <div className="absolute top-0 h-full w-px bg-foreground/30" style={{ left: "20%" }} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Upload Card */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <ArrowUp className="h-4 w-4 text-success" />
            Upload
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <span className="text-3xl font-bold font-mono text-foreground">
            {formatBytes(reputation.uploadBytes)}
          </span>
          <Progress
            value={uploadPercent}
            className="h-3 bg-secondary [&>div]:bg-success"
          />
          <p className="text-xs text-muted-foreground">
            {reputation.uploadBytes === 1073741824 && reputation.downloadBytes === 0
              ? "Initial credit: 1 GB"
              : "Total uploaded data"}
          </p>
        </CardContent>
      </Card>

      {/* Download Card */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <ArrowDown className="h-4 w-4 text-chart-2" />
            Download
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <span className="text-3xl font-bold font-mono text-foreground">
            {formatBytes(reputation.downloadBytes)}
          </span>
          <Progress
            value={downloadPercent}
            className="h-3 bg-secondary [&>div]:bg-chart-2"
          />
          <p className="text-xs text-muted-foreground">
            Total downloaded data
          </p>
        </CardContent>
      </Card>

      {/* On-chain persistence badge */}
      <Card className="border-border bg-card lg:col-span-3">
        <CardContent className="py-3 flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <Database className="h-3.5 w-3.5 text-primary" />
          <span>
            All reputation data stored on-chain. Persists across server restarts,
            shutdowns, and migrations.
          </span>
        </CardContent>
      </Card>
    </div>
  )
}
