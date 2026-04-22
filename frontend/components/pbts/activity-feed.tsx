
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Activity,
  UserPlus,
  ArrowUpDown,
  Radio,
  GitBranch,
  ExternalLink,
} from "lucide-react"
import type { ActivityItem } from "@/lib/pbts-types"
import { shortenAddress, FUJI_EXPLORER } from "@/lib/pbts-types"

interface ActivityFeedProps {
  activities: ActivityItem[]
}

const typeIcons: Record<ActivityItem["type"], typeof Activity> = {
  register: UserPlus,
  transfer: ArrowUpDown,
  announce: Radio,
  migration: GitBranch,
}

const typeColors: Record<ActivityItem["type"], string> = {
  register: "text-primary",
  transfer: "text-success",
  announce: "text-warning",
  migration: "text-chart-4",
}

export function ActivityFeed({ activities }: ActivityFeedProps) {
  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <Activity className="h-4 w-4" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[300px]">
          {activities.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Activity className="h-8 w-8 mb-3 opacity-40" />
              <p className="text-sm">No activity yet</p>
              <p className="text-xs mt-1">
                Simulate a transfer to get started
              </p>
            </div>
          ) : (
            <div className="flex flex-col">
              {activities.map((item) => {
                const Icon = typeIcons[item.type]
                return (
                  <div
                    key={item.id}
                    className="flex items-start gap-3 px-6 py-3 border-b border-border last:border-0 hover:bg-secondary/50 transition-colors"
                  >
                    <div className="mt-0.5">
                      <Icon className={`h-4 w-4 ${typeColors[item.type]}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground">
                        {item.description}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-muted-foreground font-mono">
                          {shortenAddress(item.txHash)}
                        </span>
                        <a
                          href={`${FUJI_EXPLORER}/tx/${item.txHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:text-primary/80 transition-colors"
                        >
                          <ExternalLink className="h-3 w-3" />
                          <span className="sr-only">View on Snowtrace</span>
                        </a>
                        <span className="text-xs text-muted-foreground ml-auto">
                          {new Date(item.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className={`text-[10px] shrink-0 ${
                        item.status === "success"
                          ? "border-success/30 text-success"
                          : item.status === "error"
                            ? "border-destructive/30 text-destructive"
                            : "border-warning/30 text-warning"
                      }`}
                    >
                      {item.status}
                    </Badge>
                  </div>
                )
              })}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
