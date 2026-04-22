import { useState, useCallback, useEffect } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Shield,
  ArrowLeft,
  Users,
  RefreshCw,
  ArrowUpCircle,
  ArrowDownCircle,
  Loader2,
  Rocket,
  Sun,
  Moon,
} from "lucide-react"
import { useTheme } from "next-themes"
import {
  checkHealth,
  getAllUsers,
  getReputation,
  migrateContract,
  type ReputationResponse,
} from "@/lib/api"
import {
  formatBytes,
  shortenAddress,
  getRatioColor,
  getRatioLabel,
  MOCK_CONTRACT_ADDRESS,
} from "@/lib/pbts-types"

const REGISTERED_WALLETS_KEY = "nt-registered-wallets"
const USER_REPUTATIONS_KEY = "nt-user-reputations"

interface PersistedReputation {
  uploadBytes: number
  downloadBytes: number
  ratio: number
  timestamp: number
}

function getRegisteredWallets(): string[] {
  try {
    const raw = localStorage.getItem(REGISTERED_WALLETS_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function getAllUserReputations(): Record<string, PersistedReputation> {
  try {
    const raw = localStorage.getItem(USER_REPUTATIONS_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

interface TrackerDashboardProps {
  onBack: () => void
}

export function TrackerDashboard({ onBack }: TrackerDashboardProps) {
  const { theme, setTheme } = useTheme()
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null)
  const [users, setUsers] = useState<ReputationResponse[]>([])
  const [isLoadingUsers, setIsLoadingUsers] = useState(false)
  const [isDeploying, setIsDeploying] = useState(false)
  const [newContractAddress, setNewContractAddress] = useState<string | null>(null)

  useEffect(() => {
    checkHealth().then(setBackendOnline)
    loadUsers()
  }, [])

  async function loadUsers() {
    setIsLoadingUsers(true)
    try {
      const backendUsers = await getAllUsers()

      // Merge locally-registered wallets not already in backend results
      const localWallets = getRegisteredWallets()
      const backendAddresses = new Set(
        backendUsers.map((u) => u.address.toLowerCase())
      )
      const missingWallets = localWallets.filter(
        (addr) => !backendAddresses.has(addr.toLowerCase())
      )

      const userReputations = getAllUserReputations()
      const extraUsers = await Promise.all(
        missingWallets.map(async (address) => {
          try {
            return await getReputation(address)
          } catch {
            // Use localStorage reputation if available
            const rep = userReputations[address.toLowerCase()]
            return {
              address,
              uploadBytes: rep ? String(rep.uploadBytes) : "0",
              downloadBytes: rep ? String(rep.downloadBytes) : "0",
              ratio: rep ? rep.ratio : null,
              lastUpdated: rep ? rep.timestamp : 0,
              isRegistered: true,
            } as ReputationResponse
          }
        })
      )

      setUsers([...backendUsers, ...extraUsers])
    } catch {
      // Backend offline — fall back to localStorage wallets and reputation data
      const localWallets = getRegisteredWallets()
      const userReputations = getAllUserReputations()
      const fallbackUsers: ReputationResponse[] = localWallets.map((address) => {
        const rep = userReputations[address.toLowerCase()]
        return {
          address,
          uploadBytes: rep ? String(rep.uploadBytes) : "0",
          downloadBytes: rep ? String(rep.downloadBytes) : "0",
          ratio: rep ? rep.ratio : null,
          lastUpdated: rep ? rep.timestamp : 0,
          isRegistered: true,
        }
      })
      setUsers(fallbackUsers)
    }
    setIsLoadingUsers(false)
  }

  const handleRefresh = useCallback(async () => {
    await loadUsers()
    const online = await checkHealth()
    setBackendOnline(online)
    toast.success("Refreshed")
  }, [])

  const handleDeployNewContract = useCallback(async () => {
    const adminSecret = import.meta.env.VITE_ADMIN_SECRET
    if (!adminSecret) {
      toast.error("Admin secret not configured", {
        description: "Set VITE_ADMIN_SECRET in .env.local to use this feature.",
      })
      return
    }

    setIsDeploying(true)
    toast.info("Deploying new ReputationTracker...", {
      description: "Calling RepFactory to create a new contract with referrer.",
    })

    try {
      const result = await migrateContract(MOCK_CONTRACT_ADDRESS, adminSecret)
      setNewContractAddress(result.newContract)
      toast.success("New contract deployed!", {
        description: `Address: ${result.newContract.slice(0, 16)}... Reputation data inherited.`,
      })
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err)
      toast.error("Deployment failed", { description: errMsg })
    }

    setIsDeploying(false)
  }, [])

  const registeredUsers = users.filter((u) => u.isRegistered)

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={onBack} className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
            <div className="h-8 w-8 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Shield className="h-4 w-4 text-primary" />
            </div>
            <span className="text-lg font-bold text-foreground tracking-tight">Neural Torrent</span>
            <Badge variant="outline" className="text-xs border-chart-4/30 text-chart-4 bg-chart-4/5">
              Tracker
            </Badge>
          </div>

          <div className="flex items-center gap-3">
            <Badge
              variant="outline"
              className={`text-xs font-mono hidden sm:flex ${
                backendOnline === null
                  ? "border-border text-muted-foreground"
                  : backendOnline
                    ? "border-success/30 text-success bg-success/5"
                    : "border-destructive/30 text-destructive bg-destructive/5"
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full mr-1.5 ${
                  backendOnline === null
                    ? "bg-muted-foreground animate-pulse"
                    : backendOnline
                      ? "bg-success"
                      : "bg-destructive"
                }`}
              />
              {backendOnline === null ? "checking..." : backendOnline ? "backend online" : "backend offline"}
            </Badge>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="text-muted-foreground hover:text-foreground"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-6 flex flex-col gap-6">
        {/* Deploy new contract */}
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Rocket className="h-4 w-4" />
              Deploy New Contract
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <p className="text-xs text-muted-foreground">
              Trigger the ReputationFactory smart contract to deploy a new ReputationTracker.
              The new contract can optionally inherit reputation data from the current one via
              the referrer mechanism.
            </p>
            {newContractAddress && (
              <div className="rounded-md border border-success/30 bg-success/5 p-3">
                <p className="text-xs text-muted-foreground mb-1">New contract deployed:</p>
                <p className="text-sm font-mono text-success break-all">{newContractAddress}</p>
              </div>
            )}
            <Button
              onClick={handleDeployNewContract}
              disabled={isDeploying}
              className="w-full gap-2"
            >
              {isDeploying ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Rocket className="h-4 w-4" />
              )}
              {isDeploying ? "Deploying..." : "Deploy New ReputationTracker"}
            </Button>
          </CardContent>
        </Card>

        {/* Registered users */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Users className="h-4 w-4" />
                Registered Users
                {registeredUsers.length > 0 && (
                  <Badge variant="secondary" className="text-[10px] ml-1">
                    {registeredUsers.length} user{registeredUsers.length !== 1 ? "s" : ""}
                  </Badge>
                )}
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRefresh}
                disabled={isLoadingUsers}
                className="h-7 px-2 text-xs text-muted-foreground"
              >
                <RefreshCw className={`h-3 w-3 mr-1 ${isLoadingUsers ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoadingUsers && users.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin mb-3" />
                <p className="text-sm">Loading users...</p>
              </div>
            ) : registeredUsers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <Users className="h-8 w-8 mb-3 opacity-40" />
                <p className="text-sm">No users registered yet</p>
                <p className="text-xs mt-1">
                  Users will appear here once they register via the User interface.
                </p>
              </div>
            ) : (
              <ScrollArea className="max-h-[500px]">
                <div className="space-y-2">
                  {registeredUsers.map((user) => (
                    <div
                      key={user.address}
                      className="rounded-lg border border-border p-4 space-y-3 hover:bg-secondary/30 transition-colors"
                    >
                      {/* Address row */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-mono text-foreground">
                            {shortenAddress(user.address)}
                          </span>
                          <Badge
                            variant="outline"
                            className="text-[10px] border-success/30 text-success"
                          >
                            Registered
                          </Badge>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          Last updated: {user.lastUpdated > 0
                            ? new Date(user.lastUpdated * 1000).toLocaleDateString()
                            : "N/A"}
                        </span>
                      </div>

                      {/* Stats row */}
                      <div className="grid grid-cols-3 gap-4">
                        <div className="flex items-center gap-2">
                          <ArrowUpCircle className="h-4 w-4 text-success shrink-0" />
                          <div>
                            <p className="text-[10px] text-muted-foreground">Uploaded</p>
                            <p className="text-sm font-medium font-mono">
                              {formatBytes(parseInt(user.uploadBytes, 10))}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <ArrowDownCircle className="h-4 w-4 text-chart-2 shrink-0" />
                          <div>
                            <p className="text-[10px] text-muted-foreground">Downloaded</p>
                            <p className="text-sm font-medium font-mono">
                              {formatBytes(parseInt(user.downloadBytes, 10))}
                            </p>
                          </div>
                        </div>

                        <div>
                          <p className="text-[10px] text-muted-foreground">Ratio</p>
                          <p className={`text-sm font-bold font-mono ${getRatioColor(user.ratio ?? Infinity)}`}>
                            {user.ratio !== null ? user.ratio.toFixed(2) : "INF"}
                          </p>
                          <p className={`text-[10px] ${getRatioColor(user.ratio ?? Infinity)}`}>
                            {getRatioLabel(user.ratio ?? Infinity)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
