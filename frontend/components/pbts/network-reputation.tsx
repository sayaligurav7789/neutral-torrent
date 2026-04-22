import { useState, useCallback, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Users,
  Plus,
  RefreshCw,
  ArrowUpCircle,
  ArrowDownCircle,
  Trash2,
} from "lucide-react"
import { getReputation, getAllUsers, type ReputationResponse } from "@/lib/api"
import { formatBytes, shortenAddress, getRatioColor, getRatioLabel } from "@/lib/pbts-types"

interface TrackedAgent {
  address: string
  label: string
  data: ReputationResponse | null
  loading: boolean
  error: string | null
}

interface NetworkReputationProps {
  currentAddress: string
}

function agentLabel(address: string, currentAddress: string, index: number): string {
  if (address.toLowerCase() === currentAddress.toLowerCase()) return "You"
  return `Agent ${index + 1}`
}

export function NetworkReputation({ currentAddress }: NetworkReputationProps) {
  const [agents, setAgents] = useState<TrackedAgent[]>([])
  const [newAddress, setNewAddress] = useState("")
  const [refreshingAll, setRefreshingAll] = useState(false)
  const [initialLoaded, setInitialLoaded] = useState(false)

  const fetchReputation = useCallback(async (address: string): Promise<{
    data: ReputationResponse | null
    error: string | null
  }> => {
    try {
      const data = await getReputation(address)
      return { data, error: null }
    } catch (err) {
      return { data: null, error: err instanceof Error ? err.message : "Failed to fetch" }
    }
  }, [])

  // Auto-load all known users on mount
  useEffect(() => {
    if (initialLoaded) return

    async function loadUsers() {
      const users = await getAllUsers()
      if (users.length === 0) return

      const tracked: TrackedAgent[] = users.map((u, i) => ({
        address: u.address,
        label: agentLabel(u.address, currentAddress, i),
        data: u,
        loading: false,
        error: null,
      }))

      setAgents(tracked)
      setInitialLoaded(true)
    }

    loadUsers()
  }, [currentAddress, initialLoaded])

  const addAgent = useCallback(async () => {
    const address = newAddress.trim()
    if (!address || !/^0x[0-9a-fA-F]{40}$/.test(address)) return
    if (agents.some((a) => a.address.toLowerCase() === address.toLowerCase())) return

    const index = agents.length
    const label = agentLabel(address, currentAddress, index)

    const agent: TrackedAgent = { address, label, data: null, loading: true, error: null }
    setAgents((prev) => [...prev, agent])
    setNewAddress("")

    const { data, error } = await fetchReputation(address)
    setAgents((prev) =>
      prev.map((a) =>
        a.address === address ? { ...a, data, error, loading: false } : a
      )
    )
  }, [newAddress, agents, currentAddress, fetchReputation])

  const removeAgent = useCallback((address: string) => {
    setAgents((prev) => prev.filter((a) => a.address !== address))
  }, [])

  const refreshAll = useCallback(async () => {
    setRefreshingAll(true)

    // Also pull any new users from the backend
    const users = await getAllUsers()
    const currentAddrs = new Set(agents.map((a) => a.address.toLowerCase()))

    const newAgents: TrackedAgent[] = users
      .filter((u) => !currentAddrs.has(u.address.toLowerCase()))
      .map((u, i) => ({
        address: u.address,
        label: agentLabel(u.address, currentAddress, agents.length + i),
        data: u,
        loading: false,
        error: null,
      }))

    // Refresh existing agents
    const existingRefreshed = await Promise.all(
      agents.map(async (agent) => {
        const { data, error } = await fetchReputation(agent.address)
        return { ...agent, data: data ?? agent.data, error, loading: false }
      })
    )

    setAgents([...existingRefreshed, ...newAgents])
    setRefreshingAll(false)
  }, [agents, currentAddress, fetchReputation])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") addAgent()
    },
    [addAgent]
  )

  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Users className="h-4 w-4" />
            Network Reputation
            {agents.length > 0 && (
              <Badge variant="secondary" className="text-[10px] ml-1">
                {agents.length} agent{agents.length !== 1 ? "s" : ""}
              </Badge>
            )}
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={refreshAll}
            disabled={refreshingAll}
            className="h-7 px-2 text-xs text-muted-foreground"
          >
            <RefreshCw className={`h-3 w-3 mr-1 ${refreshingAll ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Address input */}
        <div className="flex gap-2">
          <Input
            placeholder="0x... agent address"
            value={newAddress}
            onChange={(e) => setNewAddress(e.target.value)}
            onKeyDown={handleKeyDown}
            className="font-mono text-xs h-8"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={addAgent}
            disabled={!newAddress.trim() || !/^0x[0-9a-fA-F]{40}$/.test(newAddress.trim())}
            className="h-8 px-3 shrink-0"
          >
            <Plus className="h-3 w-3 mr-1" />
            Track
          </Button>
        </div>

        {/* Agent list */}
        {agents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <Users className="h-8 w-8 mb-3 opacity-40" />
            <p className="text-sm">No agents registered yet</p>
            <p className="text-xs mt-1">
              Registered agents will appear here automatically
            </p>
          </div>
        ) : (
          <ScrollArea className="max-h-[400px]">
            <div className="space-y-2">
              {agents.map((agent) => (
                <div
                  key={agent.address}
                  className="rounded-lg border border-border p-3 space-y-2 hover:bg-secondary/30 transition-colors"
                >
                  {/* Header row */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-sm font-medium">{agent.label}</span>
                      <span className="text-xs text-muted-foreground font-mono truncate">
                        {shortenAddress(agent.address)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {agent.data && (
                        <Badge
                          variant="outline"
                          className={`text-[10px] ${
                            agent.data.isRegistered
                              ? "border-success/30 text-success"
                              : "border-destructive/30 text-destructive"
                          }`}
                        >
                          {agent.data.isRegistered ? "Registered" : "Not Registered"}
                        </Badge>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeAgent(agent.address)}
                        className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>

                  {/* Data rows */}
                  {agent.loading ? (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground py-1">
                      <RefreshCw className="h-3 w-3 animate-spin" />
                      Querying on-chain...
                    </div>
                  ) : agent.error ? (
                    <p className="text-xs text-destructive">{agent.error}</p>
                  ) : agent.data && agent.data.isRegistered ? (
                    <div className="grid grid-cols-3 gap-3">
                      {/* Upload */}
                      <div className="flex items-center gap-1.5">
                        <ArrowUpCircle className="h-3.5 w-3.5 text-success shrink-0" />
                        <div>
                          <p className="text-[10px] text-muted-foreground">Uploaded</p>
                          <p className="text-xs font-medium">
                            {formatBytes(parseInt(agent.data.uploadBytes, 10))}
                          </p>
                        </div>
                      </div>

                      {/* Download */}
                      <div className="flex items-center gap-1.5">
                        <ArrowDownCircle className="h-3.5 w-3.5 text-warning shrink-0" />
                        <div>
                          <p className="text-[10px] text-muted-foreground">Downloaded</p>
                          <p className="text-xs font-medium">
                            {formatBytes(parseInt(agent.data.downloadBytes, 10))}
                          </p>
                        </div>
                      </div>

                      {/* Ratio */}
                      <div className="flex items-center gap-1.5">
                        <div>
                          <p className="text-[10px] text-muted-foreground">Ratio</p>
                          <p className={`text-xs font-bold ${getRatioColor(agent.data.ratio ?? Infinity)}`}>
                            {agent.data.ratio !== null ? agent.data.ratio.toFixed(2) : "INF"}
                          </p>
                          <p className={`text-[10px] ${getRatioColor(agent.data.ratio ?? Infinity)}`}>
                            {getRatioLabel(agent.data.ratio ?? Infinity)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : agent.data ? (
                    <p className="text-xs text-muted-foreground">
                      This address has not registered on the Neural Torrent network.
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  )
}
