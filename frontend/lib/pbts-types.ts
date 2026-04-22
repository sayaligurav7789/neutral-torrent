export interface UserReputation {
  address: string
  uploadBytes: number
  downloadBytes: number
  ratio: number
  timestamp: number
  isRegistered: boolean
}

export interface TransferReceipt {
  infohash: string
  sender: string
  receiver: string
  pieceHash: string
  pieceIndex: number
  pieceSize: number
  timestamp: number
  signature: string
}

export interface AnnounceResult {
  status: "allowed" | "blocked"
  peers: { ip: string; port: number }[]
  ratio: number
  message: string
}

export interface ActivityItem {
  id: string
  type: "register" | "transfer" | "announce" | "migration"
  description: string
  timestamp: number
  txHash: string
  status: "success" | "error" | "pending"
}

export type TransferStep = "idle" | "signing" | "submitting" | "confirmed" | "error"

export interface ContractInfo {
  address: string
  migratedFrom: string | null
  network: string
  blockNumber: number
}

export interface TorrentFile {
  id: string
  name: string
  size: number
  infohash: string
  seeders: number
  leechers: number
  uploaded: number
  category: "video" | "audio" | "software" | "documents" | "other"
  addedAt: number
  isSeeding: boolean
}

export type FileCategory = TorrentFile["category"]

export const FILE_CATEGORIES: { label: string; value: FileCategory | "all" }[] = [
  { label: "All Torrents", value: "all" },
  { label: "Video", value: "video" },
  { label: "Audio", value: "audio" },
  { label: "Software", value: "software" },
  { label: "Documents", value: "documents" },
  { label: "Other", value: "other" },
]

// Demo mock data
export const MOCK_CONTRACT_ADDRESS = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D"
export const MOCK_MIGRATED_FROM = "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984"
export const FUJI_CHAIN_ID = 43113
export const FUJI_EXPLORER = "https://testnet.snowtrace.io"

export const TEST_WALLETS = [
  { label: "Test Wallet A", address: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045" },
  { label: "Test Wallet B", address: "0xBE0eB53F46cd790Cd13851d5EFf43D12404d33E8" },
  { label: "Test Wallet C", address: "0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18" },
]

export const PIECE_SIZES = [
  { label: "256 KB", value: 262144 },
  { label: "512 KB", value: 524288 },
  { label: "1 MB", value: 1048576 },
  { label: "2 MB", value: 2097152 },
]

export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B"
  const units = ["B", "KB", "MB", "GB", "TB"]
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${units[i]}`
}

export function shortenAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

export function getRatioColor(ratio: number): string {
  if (ratio >= 0.5) return "text-success"
  if (ratio >= 0.1) return "text-warning"
  return "text-danger"
}

export function getRatioBgColor(ratio: number): string {
  if (ratio >= 0.5) return "bg-success"
  if (ratio >= 0.1) return "bg-warning"
  return "bg-danger"
}

export function getRatioLabel(ratio: number): string {
  if (ratio >= 2.0) return "Excellent"
  if (ratio >= 1.0) return "Good"
  if (ratio >= 0.5) return "Acceptable"
  if (ratio >= 0.1) return "Low"
  return "Critical"
}

export function getCategoryLabel(category: FileCategory): string {
  const map: Record<FileCategory, string> = {
    video: "Video",
    audio: "Audio",
    software: "Software",
    documents: "Documents",
    other: "Other",
  }
  return map[category]
}
