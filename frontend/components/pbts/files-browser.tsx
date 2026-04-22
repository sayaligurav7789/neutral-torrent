
import { useState, useMemo, useCallback } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
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
  CheckCircle2,
} from "lucide-react"
import type { TorrentFile, FileCategory } from "@/lib/pbts-types"
import { formatBytes, FILE_CATEGORIES } from "@/lib/pbts-types"

type SortKey = "name" | "size" | "seeders" | "addedAt"
type SortDir = "asc" | "desc"

const CATEGORY_ICONS: Record<FileCategory, typeof Film> = {
  video: Film,
  audio: Music,
  software: Package,
  documents: FileText,
  other: FileIcon,
}

interface FilesBrowserProps {
  files: TorrentFile[]
  address: string
  onTransferTriggered?: (fileName: string, size: number) => void
}

export function FilesBrowser({ files, address, onTransferTriggered }: FilesBrowserProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [activeCategory, setActiveCategory] = useState<FileCategory | "all">("all")
  const [sortKey, setSortKey] = useState<SortKey>("addedAt")
  const [sortDir, setSortDir] = useState<SortDir>("desc")
  const [downloadingIds, setDownloadingIds] = useState<Set<string>>(new Set())
  const [downloadProgress, setDownloadProgress] = useState<Record<string, number>>({})

  const filteredFiles = useMemo(() => {
    let result = files

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(
        (f) =>
          f.name.toLowerCase().includes(q) ||
          f.infohash.toLowerCase().includes(q)
      )
    }

    if (activeCategory !== "all") {
      result = result.filter((f) => f.category === activeCategory)
    }

    result.sort((a, b) => {
      let cmp = 0
      switch (sortKey) {
        case "name":
          cmp = a.name.localeCompare(b.name)
          break
        case "size":
          cmp = a.size - b.size
          break
        case "seeders":
          cmp = a.seeders - b.seeders
          break
        case "addedAt":
          cmp = a.addedAt - b.addedAt
          break
      }
      return sortDir === "asc" ? cmp : -cmp
    })

    return result
  }, [files, searchQuery, activeCategory, sortKey, sortDir])

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

  const handleDownload = useCallback(
    async (file: TorrentFile) => {
      if (downloadingIds.has(file.id)) return

      setDownloadingIds((prev) => new Set(prev).add(file.id))
      setDownloadProgress((prev) => ({ ...prev, [file.id]: 0 }))

      toast.info(`Starting download: ${file.name}`, {
        description: `Connecting to ${file.seeders} seeders...`,
      })

      // Simulate download progress
      for (let i = 0; i <= 100; i += Math.floor(Math.random() * 15) + 5) {
        const progress = Math.min(i, 100)
        await new Promise((resolve) => setTimeout(resolve, 300 + Math.random() * 400))
        setDownloadProgress((prev) => ({ ...prev, [file.id]: progress }))
      }

      setDownloadProgress((prev) => ({ ...prev, [file.id]: 100 }))

      await new Promise((resolve) => setTimeout(resolve, 500))

      setDownloadingIds((prev) => {
        const next = new Set(prev)
        next.delete(file.id)
        return next
      })
      setDownloadProgress((prev) => {
        const next = { ...prev }
        delete next[file.id]
        return next
      })

      onTransferTriggered?.(file.name, file.size)

      toast.success(`Download complete: ${file.name}`, {
        description: `${formatBytes(file.size)} downloaded. Receipt signed and recorded on-chain.`,
      })
    },
    [downloadingIds, onTransferTriggered]
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

  const totalSeeding = files.filter((f) => f.isSeeding).length
  const totalSize = files.reduce((acc, f) => acc + f.size, 0)

  return (
    <div className="flex flex-col gap-5">
      {/* Stats bar */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2 px-3 py-2 rounded-md border border-border bg-card">
          <HardDrive className="h-4 w-4 text-primary" />
          <span className="text-xs text-muted-foreground">Total Files:</span>
          <span className="text-xs font-semibold text-foreground">{files.length}</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 rounded-md border border-border bg-card">
          <Users className="h-4 w-4 text-success" />
          <span className="text-xs text-muted-foreground">Seeding:</span>
          <span className="text-xs font-semibold text-foreground">{totalSeeding}</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 rounded-md border border-border bg-card">
          <FileIcon className="h-4 w-4 text-chart-4" />
          <span className="text-xs text-muted-foreground">Total Size:</span>
          <span className="text-xs font-semibold text-foreground">{formatBytes(totalSize)}</span>
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

      {/* Category tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {FILE_CATEGORIES.map((cat) => (
          <button
            key={cat.value}
            onClick={() => setActiveCategory(cat.value)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
              activeCategory === cat.value
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground hover:bg-accent hover:text-accent-foreground"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* File table */}
      <div className="rounded-lg border border-border overflow-hidden">
        {/* Table header */}
        <div className="bg-secondary/50 border-b border-border">
          <div className="grid grid-cols-[1fr_100px_90px_90px_100px] lg:grid-cols-[1fr_120px_100px_100px_130px] items-center px-4 py-2.5">
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
              onClick={() => handleSort("seeders")}
              className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
            >
              Peers <SortIcon column="seeders" />
            </button>
            <button
              onClick={() => handleSort("addedAt")}
              className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
            >
              Added <SortIcon column="addedAt" />
            </button>
            <span className="text-xs font-semibold text-muted-foreground text-right">
              Actions
            </span>
          </div>
        </div>

        {/* Table body */}
        <div className="divide-y divide-border">
          {filteredFiles.length === 0 ? (
            <div className="px-4 py-12 flex flex-col items-center gap-3">
              <Search className="h-8 w-8 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">
                No files found matching your search.
              </p>
            </div>
          ) : (
            filteredFiles.map((file) => {
              const Icon = CATEGORY_ICONS[file.category]
              const isDownloading = downloadingIds.has(file.id)
              const progress = downloadProgress[file.id]
              const daysAgo = Math.floor(
                (Date.now() - file.addedAt) / 86400000
              )
              const addedLabel =
                daysAgo === 0
                  ? "Today"
                  : daysAgo === 1
                    ? "1 day ago"
                    : `${daysAgo}d ago`

              return (
                <div key={file.id} className="relative">
                  <div className="grid grid-cols-[1fr_100px_90px_90px_100px] lg:grid-cols-[1fr_120px_100px_100px_130px] items-center px-4 py-3 hover:bg-secondary/30 transition-colors">
                    {/* Name + category */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-8 w-8 rounded-md bg-secondary border border-border flex items-center justify-center shrink-0">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-sm font-medium text-foreground truncate">
                          {file.name}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono text-muted-foreground truncate max-w-[120px]">
                            {file.infohash.slice(0, 12)}...
                          </span>
                          {file.isSeeding && (
                            <Badge
                              variant="outline"
                              className="text-[10px] border-success/30 text-success bg-success/5 px-1.5 py-0"
                            >
                              Seeding
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Size */}
                    <span className="text-xs font-mono text-muted-foreground">
                      {formatBytes(file.size)}
                    </span>

                    {/* Seeders / Leechers */}
                    <div className="flex items-center gap-1.5">
                      <Users className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs text-success">{file.seeders}</span>
                      <span className="text-xs text-muted-foreground">/</span>
                      <span className="text-xs text-danger">{file.leechers}</span>
                    </div>

                    {/* Added date */}
                    <span className="text-xs text-muted-foreground">
                      {addedLabel}
                    </span>

                    {/* Actions */}
                    <div className="flex items-center gap-2 justify-end">
                      {isDownloading ? (
                        <div className="flex items-center gap-2 w-full max-w-[120px]">
                          <Progress
                            value={progress}
                            className="h-1.5 flex-1 bg-secondary [&>div]:bg-primary"
                          />
                          <span className="text-[10px] font-mono text-primary w-8 text-right">
                            {progress}%
                          </span>
                        </div>
                      ) : progress === undefined ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDownload(file)}
                          className="h-7 px-2.5 text-xs text-muted-foreground hover:text-foreground hover:bg-secondary gap-1.5"
                        >
                          <Download className="h-3.5 w-3.5" />
                          <span className="hidden lg:inline">Download</span>
                        </Button>
                      ) : (
                        <div className="flex items-center gap-1.5 text-success">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span className="text-xs">Done</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Download progress bar overlay */}
                  {isDownloading && (
                    <div
                      className="absolute bottom-0 left-0 h-0.5 bg-primary/30 transition-all duration-300"
                      style={{ width: `${progress || 0}%` }}
                    />
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Summary footer */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          Showing {filteredFiles.length} of {files.length} files
        </span>
        <span className="font-mono">
          Connected: {address.slice(0, 6)}...{address.slice(-4)}
        </span>
      </div>
    </div>
  )
}
