
import { useState, useMemo, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Search,
  Download,
  ArrowUpDown,
  Film,
  Music,
  Package,
  FileText,
  FileIcon,
  Users,
  ChevronUp,
  ChevronDown,
  X,
  HardDrive,
  Loader2,
  RefreshCw,
  Tag,
} from "lucide-react"
import type { TorrentInfo } from "@/lib/api"
import type { DemoTorrent } from "@/lib/pbts-store"
import { formatBytes } from "@/lib/pbts-types"

type SortKey = "name" | "size" | "peerCount"
type SortDir = "asc" | "desc"

type DisplayTorrent = TorrentInfo & Partial<DemoTorrent>

const CATEGORY_ICONS: Record<string, typeof Film> = {
  video: Film,
  audio: Music,
  software: Package,
  documents: FileText,
  other: FileIcon,
}

const TOKEN_DECIMALS: Record<string, number> = { ETH: 18, WETH: 18, USDC: 6, UNI: 18 }

function formatTokenAmount(amount: string, symbol: string) {
  const decimals = TOKEN_DECIMALS[symbol] ?? 18
  const human = Number(amount) / 10 ** decimals
  return human % 1 === 0 ? human.toString() : human.toFixed(decimals === 6 ? 2 : 4).replace(/0+$/, "").replace(/\.$/, "")
}

function isDemoTorrent(t: TorrentInfo): t is DemoTorrent {
  return "name" in t
}

interface TorrentsBrowserProps {
  torrents: TorrentInfo[]
  isLoading: boolean
  onRefresh: () => void
  onAnnounce: (infohash: string) => void
  isAnnouncing: boolean
  announcingHash: string | null
  walletConnected: boolean
  isRegistered: boolean
}

export function TorrentsBrowser({
  torrents,
  isLoading,
  onRefresh,
  onAnnounce,
  isAnnouncing,
  announcingHash,
  walletConnected,
  isRegistered,
}: TorrentsBrowserProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [sortKey, setSortKey] = useState<SortKey>("peerCount")
  const [sortDir, setSortDir] = useState<SortDir>("desc")

  const filteredTorrents = useMemo(() => {
    let result: DisplayTorrent[] = torrents

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(
        (t) =>
          t.infohash.toLowerCase().includes(q) ||
          (t.description && t.description.toLowerCase().includes(q)) ||
          (isDemoTorrent(t) && t.name.toLowerCase().includes(q))
      )
    }

    result = [...result].sort((a, b) => {
      let cmp = 0
      switch (sortKey) {
        case "name": {
          const nameA = a.description || (a as DisplayTorrent).name || a.infohash
          const nameB = b.description || (b as DisplayTorrent).name || b.infohash
          cmp = nameA.localeCompare(nameB)
          break
        }
        case "size":
          cmp = ((a as DisplayTorrent).size ?? 0) - ((b as DisplayTorrent).size ?? 0)
          break
        case "peerCount":
          cmp = a.peerCount - b.peerCount
          break
      }
      return sortDir === "asc" ? cmp : -cmp
    })

    return result
  }, [torrents, searchQuery, sortKey, sortDir])

  const handleSort = useCallback(
    (key: SortKey) => {
      if (sortKey === key) {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"))
      } else {
        setSortKey(key)
        setSortDir("desc")
      }
    },
    [sortKey]
  )

  const SortIcon = ({ column }: { column: SortKey }) => {
    if (sortKey !== column)
      return <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
    return sortDir === "asc" ? (
      <ChevronUp className="h-3 w-3 text-primary" />
    ) : (
      <ChevronDown className="h-3 w-3 text-primary" />
    )
  }

  const totalPeers = torrents.reduce((acc, t) => acc + t.peerCount, 0)

  return (
    <div className="flex flex-col gap-5">
      {/* Stats bar */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2 px-3 py-2 rounded-md border border-border bg-card">
          <HardDrive className="h-4 w-4 text-primary" />
          <span className="text-xs text-muted-foreground">Total Torrents:</span>
          <span className="text-xs font-semibold text-foreground">{torrents.length}</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 rounded-md border border-border bg-card">
          <Users className="h-4 w-4 text-success" />
          <span className="text-xs text-muted-foreground">Total Peers:</span>
          <span className="text-xs font-semibold text-foreground">{totalPeers}</span>
        </div>
        <div className="ml-auto">
          <Button
            variant="ghost"
            size="sm"
            onClick={onRefresh}
            disabled={isLoading}
            className="h-7 px-2 text-xs text-muted-foreground"
          >
            <RefreshCw className={`h-3 w-3 mr-1 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name or infohash..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 bg-card border-border text-foreground placeholder:text-muted-foreground focus-visible:ring-primary"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Clear search</span>
          </button>
        )}
      </div>

      {/* Torrent table */}
      <div className="rounded-lg border border-border overflow-hidden">
        {/* Table header */}
        <div className="bg-secondary/50 border-b border-border">
          <div className="grid grid-cols-[1fr_100px_90px_100px] lg:grid-cols-[1fr_120px_100px_130px] items-center px-4 py-2.5">
            <button
              onClick={() => handleSort("name")}
              className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors text-left"
            >
              Name <SortIcon column="name" />
            </button>
            <button
              onClick={() => handleSort("size")}
              className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
            >
              Size <SortIcon column="size" />
            </button>
            <button
              onClick={() => handleSort("peerCount")}
              className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
            >
              Peers <SortIcon column="peerCount" />
            </button>
            <span className="text-xs font-semibold text-muted-foreground text-right">
              Actions
            </span>
          </div>
        </div>

        {/* Table body */}
        <div className="divide-y divide-border">
          {isLoading && torrents.length === 0 ? (
            <div className="px-4 py-12 flex flex-col items-center gap-3">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Loading torrents...</p>
            </div>
          ) : filteredTorrents.length === 0 ? (
            <div className="px-4 py-12 flex flex-col items-center gap-3">
              {torrents.length === 0 ? (
                <>
                  <Download className="h-8 w-8 text-muted-foreground/50" />
                  <p className="text-sm text-muted-foreground">
                    No torrents in the swarm yet
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Register content on the Dashboard tab to add torrents.
                  </p>
                </>
              ) : (
                <>
                  <Search className="h-8 w-8 text-muted-foreground/50" />
                  <p className="text-sm text-muted-foreground">
                    No torrents found matching your search.
                  </p>
                </>
              )}
            </div>
          ) : (
            filteredTorrents.map((torrent) => {
              const isThisAnnouncing =
                isAnnouncing && announcingHash === torrent.infohash
              const hasMetadata = isDemoTorrent(torrent)
              const Icon = hasMetadata && torrent.category
                ? CATEGORY_ICONS[torrent.category] ?? FileIcon
                : FileIcon

              return (
                <div
                  key={torrent.infohash}
                  className="grid grid-cols-[1fr_100px_90px_100px] lg:grid-cols-[1fr_120px_100px_130px] items-center px-4 py-3 hover:bg-secondary/30 transition-colors"
                >
                  {/* Name + infohash + marketplace badges */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-8 w-8 rounded-md bg-secondary border border-border flex items-center justify-center shrink-0">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm font-medium text-foreground truncate">
                        {torrent.description || (hasMetadata ? torrent.name : `Torrent ${torrent.infohash.slice(0, 8)}...`)}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-muted-foreground truncate max-w-[120px]">
                          {torrent.infohash.slice(0, 12)}...
                        </span>
                        {torrent.listed && torrent.tokenSymbol && torrent.tokenAmount && (
                          <Badge variant="outline" className="text-[10px] gap-1 font-normal border-chart-4/50 text-chart-4 px-1.5 py-0">
                            <Tag className="h-2.5 w-2.5" />
                            {formatTokenAmount(torrent.tokenAmount, torrent.tokenSymbol)} {torrent.tokenSymbol}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Size */}
                  <span className="text-xs font-mono text-muted-foreground">
                    {hasMetadata && torrent.size ? formatBytes(torrent.size) : "—"}
                  </span>

                  {/* Peers */}
                  <div className="flex items-center gap-1.5">
                    <Users className="h-3 w-3 text-muted-foreground" />
                    <span className="text-xs text-success font-medium">
                      {torrent.peerCount}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onAnnounce(torrent.infohash)}
                      disabled={isAnnouncing || !walletConnected || !isRegistered}
                      className="h-7 px-2.5 text-xs text-muted-foreground hover:text-foreground hover:bg-secondary gap-1.5"
                    >
                      {isThisAnnouncing ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Download className="h-3.5 w-3.5" />
                      )}
                      <span className="hidden lg:inline">Announce</span>
                    </Button>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Summary footer */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          Showing {filteredTorrents.length} of {torrents.length} torrents
        </span>
      </div>
    </div>
  )
}
