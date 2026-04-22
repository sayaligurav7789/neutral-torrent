
import { useState, useCallback, useEffect } from "react"
import { toast } from "sonner"
import { DashboardHeader, type DashboardTab } from "./dashboard-header"
import { MigrationBanner } from "./migration-banner"
import { ReputationDisplay } from "./reputation-display"
import { ActionButtons } from "./action-buttons"
import { SimulateTransferModal } from "./simulate-transfer-modal"
import { AnnounceCard } from "./announce-card"
import { ActivityFeed } from "./activity-feed"
import { NetworkReputation } from "./network-reputation"
import { FilesBrowser } from "./files-browser"
import { AgentDemo } from "./agent/agent-demo"
import type { UserReputation, ActivityItem, AnnounceResult, ContractInfo, TorrentFile } from "@/lib/pbts-types"
import { formatBytes, shortenAddress, MOCK_CONTRACT_ADDRESS } from "@/lib/pbts-types"
import {
  createInitialReputation,
  simulateTransfer,
  createActivity,
  getContractInfo,
  generateMockInfohash,
  getMockTorrentFiles,
} from "@/lib/pbts-store"
import { announce as apiAnnounce, checkHealth, migrateContract } from "@/lib/api"
import { useWallet } from "@/hooks/useWallet"

interface DashboardProps {
  address: string
  onDisconnect: () => void
  onBack?: () => void
}

export function Dashboard({ address, onDisconnect, onBack }: DashboardProps) {
  const wallet = useWallet()
  const [activeTab, setActiveTab] = useState<DashboardTab>("dashboard")
  const [files] = useState<TorrentFile[]>(getMockTorrentFiles)
  const [reputation, setReputation] = useState<UserReputation>(
    createInitialReputation(address)
  )
  const [activities, setActivities] = useState<ActivityItem[]>([
    createActivity("register", `Account registered with 1 GB initial credit`),
  ])
  const [contractInfo, setContractInfo] = useState<ContractInfo>(
    getContractInfo(false)
  )
  const [announceResult, setAnnounceResult] = useState<AnnounceResult | null>(null)
  const [transferModalOpen, setTransferModalOpen] = useState(false)
  const [isRestarting, setIsRestarting] = useState(false)
  const [isAnnouncing, setIsAnnouncing] = useState(false)
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null)

  // Check backend health on mount
  useEffect(() => {
    checkHealth().then(setBackendOnline)
  }, [])

  const handleTransferComplete = useCallback(
    (receiverAddress: string, pieceSize: number) => {
      const newRep = simulateTransfer(reputation, pieceSize, true)
      setReputation(newRep)

      const activity = createActivity(
        "transfer",
        `Transferred ${formatBytes(pieceSize)} to ${shortenAddress(receiverAddress)}`
      )
      setActivities((prev) => [activity, ...prev])

      toast.success("Transfer recorded on-chain!", {
        description: `New ratio: ${newRep.ratio === Infinity ? "INF" : newRep.ratio.toFixed(2)}`,
      })
    },
    [reputation]
  )

  const handleAnnounce = useCallback(async () => {
    setIsAnnouncing(true)
    setAnnounceResult(null)

    const infohash = generateMockInfohash()
    const message = `Neural Torrent announce ${infohash} started by ${address} at ${Date.now()}`

    try {
      const signature = await wallet.signMessage(message)
      const result = await apiAnnounce(address, infohash, "started", message, signature)

      const announceDisplay: AnnounceResult = {
        status: result.status,
        peers:
          result.status === "allowed"
            ? result.peers.map((p) => ({
                ip: p.peerId ?? p.address.slice(0, 10),
                port: 6881,
              }))
            : [],
        ratio:
          result.ratio !== null
            ? result.ratio
            : Infinity,
        message: result.message,
      }

      setAnnounceResult(announceDisplay)

      const activity = createActivity(
        "announce",
        result.status === "allowed"
          ? `Announce succeeded — ${result.peerCount} peers returned`
          : `Announce blocked — insufficient ratio`,
        result.status === "allowed" ? "success" : "error"
      )
      setActivities((prev) => [activity, ...prev])

      if (result.status === "allowed") {
        // Update local reputation from backend data
        setReputation((prev) => ({
          ...prev,
          uploadBytes: parseInt(result.uploadBytes, 10),
          downloadBytes: parseInt(result.downloadBytes, 10),
          ratio:
            result.ratio !== null
              ? result.ratio
              : Infinity,
        }))
        toast.success("Access Granted!", {
          description: `${result.peerCount} peers available for download`,
        })
      } else {
        toast.error("Access Denied", {
          description: result.message,
        })
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err)
      // If backend is unavailable, fall back to local simulation
      if (errMsg.includes("Failed to fetch") || errMsg.includes("fetch")) {
        toast.warning("Backend unavailable — showing demo result", {
          description: "Start the backend server to use live data.",
        })
        const { simulateAnnounce } = await import("@/lib/pbts-store")
        const result = simulateAnnounce(reputation)
        setAnnounceResult(result)
        const activity = createActivity(
          "announce",
          result.status === "allowed"
            ? `Announce succeeded (demo) — ${result.peers.length} peers`
            : `Announce blocked (demo)`,
          result.status === "allowed" ? "success" : "error"
        )
        setActivities((prev) => [activity, ...prev])
      } else {
        toast.error("Announce failed", { description: errMsg })
      }
    }

    setIsAnnouncing(false)
  }, [address, reputation, wallet])

  const handleServerRestart = useCallback(async () => {
    setIsRestarting(true)
    setBackendOnline(null)

    toast.info("Server shutting down...", {
      description: "Simulating tracker restart",
    })

    await new Promise((resolve) => setTimeout(resolve, 2000))

    toast.info("Server offline", {
      description: "All local state wiped",
    })

    await new Promise((resolve) => setTimeout(resolve, 1500))

    // Server comes back — reputation unchanged (from blockchain)
    const online = await checkHealth()
    setBackendOnline(online)

    toast.success("Server restarted!", {
      description: "Reputation restored from blockchain - no data loss!",
    })

    const activity = createActivity(
      "register",
      `Server restarted — reputation persisted via blockchain`
    )
    setActivities((prev) => [activity, ...prev])
    setIsRestarting(false)
  }, [])

  const handleFileTransfer = useCallback(
    (fileName: string, size: number) => {
      const newRep = simulateTransfer(reputation, size, false)
      setReputation(newRep)

      const activity = createActivity(
        "transfer",
        `Downloaded ${formatBytes(size)} — ${fileName}`
      )
      setActivities((prev) => [activity, ...prev])
    },
    [reputation]
  )

  const handleMigrate = useCallback(async () => {
    const adminSecret = import.meta.env.VITE_ADMIN_SECRET
    if (!adminSecret) {
      toast.error("Admin secret not configured", {
        description: "Set VITE_ADMIN_SECRET in .env.local to use this feature.",
      })
      return
    }

    toast.info("Initiating contract migration...", {
      description: "Deploying new contract via RepFactory",
    })

    try {
      const result = await migrateContract(MOCK_CONTRACT_ADDRESS, adminSecret)
      const newInfo: ContractInfo = {
        address: result.newContract,
        migratedFrom: result.oldContract,
        network: contractInfo.network,
        blockNumber: contractInfo.blockNumber,
      }
      setContractInfo(newInfo)

      const activity = createActivity(
        "migration",
        `Migrated to ${result.newContract.slice(0, 10)}... — reputation preserved`
      )
      setActivities((prev) => [activity, ...prev])

      toast.success("Migration complete!", {
        description: "Reputation carried over to new contract",
      })
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err)
      toast.error("Migration failed", { description: errMsg })
    }
  }, [contractInfo])

  const signMessage = useCallback(
    (message: string | Uint8Array): Promise<string> => wallet.signMessage(message),
    [wallet]
  )

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <DashboardHeader
        address={address}
        network={contractInfo.network}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onDisconnect={onDisconnect}
        onBack={onBack}
        backendOnline={backendOnline}
      />

      {/* Mobile tab switcher */}
      <div className="sm:hidden flex border-b border-border bg-card/50">
        <button
          onClick={() => setActiveTab("dashboard")}
          className={`flex-1 py-2.5 text-sm font-medium text-center transition-colors ${
            activeTab === "dashboard"
              ? "text-primary border-b-2 border-primary"
              : "text-muted-foreground"
          }`}
        >
          Dashboard
        </button>
        <button
          onClick={() => setActiveTab("files")}
          className={`flex-1 py-2.5 text-sm font-medium text-center transition-colors ${
            activeTab === "files"
              ? "text-primary border-b-2 border-primary"
              : "text-muted-foreground"
          }`}
        >
          Files
        </button>
        <button
          onClick={() => setActiveTab("agent")}
          className={`flex-1 py-2.5 text-sm font-medium text-center transition-colors ${
            activeTab === "agent"
              ? "text-primary border-b-2 border-primary"
              : "text-muted-foreground"
          }`}
        >
          Agent
        </button>
      </div>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-6 flex flex-col gap-6">
        {activeTab === "dashboard" ? (
          <>
            {/* Migration banner */}
            <MigrationBanner contractInfo={contractInfo} />

            {/* Reputation stats */}
            <ReputationDisplay reputation={reputation} />

            {/* Action buttons */}
            <ActionButtons
              onSimulateTransfer={() => setTransferModalOpen(true)}
              onAnnounce={handleAnnounce}
              onMigrate={handleMigrate}
              onServerRestart={handleServerRestart}
              isMigrated={!!contractInfo.migratedFrom}
              isRestarting={isRestarting}
              isAnnouncing={isAnnouncing}
            />

            {/* Announce result */}
            {announceResult && <AnnounceCard result={announceResult} />}

            {/* Network reputation viewer */}
            <NetworkReputation currentAddress={address} />

            {/* Activity feed */}
            <ActivityFeed activities={activities} />
          </>
        ) : activeTab === "files" ? (
          <FilesBrowser
            files={files}
            address={address}
            onTransferTriggered={handleFileTransfer}
          />
        ) : (
          <AgentDemo />
        )}
      </main>

      {/* Transfer modal */}
      <SimulateTransferModal
        open={transferModalOpen}
        onOpenChange={setTransferModalOpen}
        senderAddress={address}
        signMessage={signMessage}
        onTransferComplete={handleTransferComplete}
      />
    </div>
  )
}
