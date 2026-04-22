
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  CheckCircle2,
  XCircle,
  Radio,
  Server,
} from "lucide-react"
import type { AnnounceResult } from "@/lib/pbts-types"

interface AnnounceCardProps {
  result: AnnounceResult
}

export function AnnounceCard({ result }: AnnounceCardProps) {
  if (result.status === "allowed") {
    return (
      <Card className="border-success/30 bg-success/5">
        <CardContent className="pt-6 flex flex-col gap-4">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-full bg-success/10 border border-success/20 flex items-center justify-center shrink-0">
              <CheckCircle2 className="h-5 w-5 text-success" />
            </div>
            <div className="flex flex-col gap-1">
              <h3 className="text-lg font-semibold text-success">
                Access Granted
              </h3>
              <p className="text-sm text-muted-foreground">
                {result.message}
              </p>
              <Badge
                variant="outline"
                className="w-fit border-success/30 text-success text-xs mt-1"
              >
                Ratio: {result.ratio === Infinity ? "INF" : result.ratio.toFixed(2)}
              </Badge>
            </div>
          </div>

          {/* Peer list */}
          <div className="rounded-md bg-card border border-border p-3">
            <div className="flex items-center gap-2 mb-3">
              <Radio className="h-3.5 w-3.5 text-success" />
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Connected Peers ({result.peers.length})
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {result.peers.map((peer, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 px-3 py-2 rounded-md bg-secondary border border-border"
                >
                  <Server className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs font-mono text-foreground">
                    {peer.ip}:{peer.port}
                  </span>
                  <span className="h-1.5 w-1.5 rounded-full bg-success ml-auto" />
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-destructive/30 bg-destructive/5">
      <CardContent className="pt-6 flex flex-col gap-4">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-full bg-destructive/10 border border-destructive/20 flex items-center justify-center shrink-0">
            <XCircle className="h-5 w-5 text-destructive" />
          </div>
          <div className="flex flex-col gap-1">
            <h3 className="text-lg font-semibold text-destructive">
              Access Denied
            </h3>
            <p className="text-sm text-muted-foreground">
              {result.message}
            </p>
            <Badge
              variant="outline"
              className="w-fit border-destructive/30 text-destructive text-xs mt-1"
            >
              Ratio: {result.ratio.toFixed(2)} (Min: 0.50)
            </Badge>
          </div>
        </div>

        <div className="rounded-md bg-card border border-border p-4 text-center">
          <p className="text-sm text-muted-foreground">
            Improve your ratio by seeding existing torrents.
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            No peers will be shared until your ratio meets the minimum
            requirement.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
