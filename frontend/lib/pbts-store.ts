import type {
  UserReputation,
  ActivityItem,
  AnnounceResult,
  ContractInfo,
  TorrentFile,
} from "./pbts-types"
import type { TorrentInfo } from "./api"
import {
  MOCK_CONTRACT_ADDRESS,
  MOCK_MIGRATED_FROM,
} from "./pbts-types"

// Initial state for a fresh registered user (1 GB upload credit)
const INITIAL_UPLOAD_CREDIT = 1073741824 // 1 GB in bytes

export function createInitialReputation(address: string): UserReputation {
  return {
    address,
    uploadBytes: INITIAL_UPLOAD_CREDIT,
    downloadBytes: 0,
    ratio: Infinity,
    timestamp: Date.now(),
    isRegistered: true,
  }
}

export function calculateRatio(upload: number, download: number): number {
  if (download === 0) return upload > 0 ? Infinity : 0
  return upload / download
}

export function simulateTransfer(
  reputation: UserReputation,
  pieceSize: number,
  isSender: boolean
): UserReputation {
  const newUpload = isSender
    ? reputation.uploadBytes + pieceSize
    : reputation.uploadBytes
  const newDownload = isSender
    ? reputation.downloadBytes
    : reputation.downloadBytes + pieceSize

  return {
    ...reputation,
    uploadBytes: newUpload,
    downloadBytes: newDownload,
    ratio: calculateRatio(newUpload, newDownload),
    timestamp: Date.now(),
  }
}

export function simulateAnnounce(reputation: UserReputation): AnnounceResult {
  const ratio = calculateRatio(reputation.uploadBytes, reputation.downloadBytes)
  const minRatio = 0.5

  if (ratio >= minRatio) {
    return {
      status: "allowed",
      peers: [
        { ip: "192.168.1.101", port: 6881 },
        { ip: "10.0.0.42", port: 6882 },
        { ip: "172.16.0.15", port: 6883 },
        { ip: "192.168.2.200", port: 6884 },
        { ip: "10.1.1.99", port: 6885 },
      ],
      ratio,
      message: "Access granted. Happy seeding!",
    }
  }

  const deficit = (minRatio * reputation.downloadBytes) - reputation.uploadBytes
  return {
    status: "blocked",
    peers: [],
    ratio,
    message: `Insufficient ratio. You need to upload ${Math.ceil(deficit / 1048576)} MB more to regain access.`,
  }
}

export function generateMockTxHash(): string {
  const chars = "0123456789abcdef"
  let hash = "0x"
  for (let i = 0; i < 64; i++) {
    hash += chars[Math.floor(Math.random() * chars.length)]
  }
  return hash
}

export function generateMockInfohash(): string {
  const chars = "0123456789abcdef"
  let hash = "0x"
  for (let i = 0; i < 40; i++) {
    hash += chars[Math.floor(Math.random() * chars.length)]
  }
  return hash
}

export function createActivity(
  type: ActivityItem["type"],
  description: string,
  status: ActivityItem["status"] = "success"
): ActivityItem {
  return {
    id: crypto.randomUUID(),
    type,
    description,
    timestamp: Date.now(),
    txHash: generateMockTxHash(),
    status,
  }
}

export function getMockTorrentFiles(): TorrentFile[] {
  return [
    {
      id: "1",
      name: "Big Buck Bunny [1080p].mkv",
      size: 4831838208,
      infohash: "dd8255ecdc7ca55fb0bbf81323d87062db1f6d1c",
      seeders: 42,
      leechers: 8,
      uploaded: Date.now() - 86400000 * 3,
      category: "video",
      addedAt: Date.now() - 86400000 * 3,
      isSeeding: true,
    },
    {
      id: "2",
      name: "Sintel [4K HDR].mkv",
      size: 8589934592,
      infohash: "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0",
      seeders: 127,
      leechers: 23,
      uploaded: Date.now() - 86400000 * 7,
      category: "video",
      addedAt: Date.now() - 86400000 * 7,
      isSeeding: true,
    },
    {
      id: "3",
      name: "LibreOffice-7.6.4-Linux-x86_64.tar.gz",
      size: 314572800,
      infohash: "b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1",
      seeders: 89,
      leechers: 5,
      uploaded: Date.now() - 86400000 * 1,
      category: "software",
      addedAt: Date.now() - 86400000 * 1,
      isSeeding: false,
    },
    {
      id: "4",
      name: "Creative Commons Best of 2025.zip",
      size: 1073741824,
      infohash: "c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2",
      seeders: 15,
      leechers: 34,
      uploaded: Date.now() - 86400000 * 14,
      category: "audio",
      addedAt: Date.now() - 86400000 * 14,
      isSeeding: true,
    },
    {
      id: "5",
      name: "Solidity Smart Contract Patterns.pdf",
      size: 52428800,
      infohash: "d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3",
      seeders: 203,
      leechers: 2,
      uploaded: Date.now() - 86400000 * 5,
      category: "documents",
      addedAt: Date.now() - 86400000 * 5,
      isSeeding: false,
    },
    {
      id: "6",
      name: "Ubuntu 24.04 LTS Desktop.iso",
      size: 5368709120,
      infohash: "e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4",
      seeders: 543,
      leechers: 67,
      uploaded: Date.now() - 86400000 * 2,
      category: "software",
      addedAt: Date.now() - 86400000 * 2,
      isSeeding: true,
    },
    {
      id: "7",
      name: "Avalanche Whitepaper & Docs Collection.tar.gz",
      size: 157286400,
      infohash: "f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5",
      seeders: 78,
      leechers: 11,
      uploaded: Date.now() - 86400000 * 10,
      category: "documents",
      addedAt: Date.now() - 86400000 * 10,
      isSeeding: false,
    },
    {
      id: "8",
      name: "Blender 4.0 Portable [Win64].zip",
      size: 419430400,
      infohash: "a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6",
      seeders: 34,
      leechers: 19,
      uploaded: Date.now() - 86400000 * 6,
      category: "software",
      addedAt: Date.now() - 86400000 * 6,
      isSeeding: true,
    },
    {
      id: "9",
      name: "Tears of Steel [Open Movie].mp4",
      size: 2147483648,
      infohash: "b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7",
      seeders: 61,
      leechers: 4,
      uploaded: Date.now() - 86400000 * 20,
      category: "video",
      addedAt: Date.now() - 86400000 * 20,
      isSeeding: false,
    },
    {
      id: "10",
      name: "ETH Denver 2026 Workshop Materials.zip",
      size: 209715200,
      infohash: "c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8",
      seeders: 17,
      leechers: 42,
      uploaded: Date.now() - 3600000,
      category: "other",
      addedAt: Date.now() - 3600000,
      isSeeding: true,
    },
  ]
}

export interface DemoTorrent extends TorrentInfo {
  name: string
  size: number
  category: "video" | "audio" | "software" | "documents" | "other"
}

export function getDemoTorrents(): DemoTorrent[] {
  return [
    {
      infohash: "dd8255ecdc7ca55fb0bbf81323d87062db1f6d1c",
      peerCount: 42,
      peers: ["0xd8dA6BF2...6045", "0xBE0eB53F...33E8", "0x742d35Cc...2bD18"],
      name: "Big Buck Bunny [1080p].mkv",
      size: 4831838208,
      category: "video",
    },
    {
      infohash: "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0",
      peerCount: 127,
      peers: ["0xd8dA6BF2...6045", "0x1f9840a8...F984"],
      name: "Sintel [4K HDR].mkv",
      size: 8589934592,
      category: "video",
    },
    {
      infohash: "b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1",
      peerCount: 89,
      peers: ["0xBE0eB53F...33E8"],
      name: "LibreOffice-7.6.4-Linux-x86_64.tar.gz",
      size: 314572800,
      category: "software",
    },
    {
      infohash: "c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2",
      peerCount: 15,
      peers: ["0x742d35Cc...2bD18", "0xd8dA6BF2...6045"],
      name: "Creative Commons Best of 2025.zip",
      size: 1073741824,
      category: "audio",
    },
    {
      infohash: "d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3",
      peerCount: 203,
      peers: ["0xBE0eB53F...33E8", "0x742d35Cc...2bD18", "0x1f9840a8...F984", "0xd8dA6BF2...6045"],
      name: "Solidity Smart Contract Patterns.pdf",
      size: 52428800,
      category: "documents",
    },
    {
      infohash: "e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4",
      peerCount: 543,
      peers: ["0xd8dA6BF2...6045", "0xBE0eB53F...33E8"],
      name: "Ubuntu 24.04 LTS Desktop.iso",
      size: 5368709120,
      category: "software",
    },
  ]
}

export function getContractInfo(migrated: boolean): ContractInfo {
  return {
    address: MOCK_CONTRACT_ADDRESS,
    migratedFrom: migrated ? MOCK_MIGRATED_FROM : null,
    network: "Avalanche Fuji",
    blockNumber: 28_459_123 + Math.floor(Math.random() * 1000),
  }
}
