/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_BACKEND_URL: string
  readonly VITE_CHAIN_ID: string
  readonly VITE_REPUTATION_TRACKER_ADDRESS: string | undefined
  readonly VITE_ADMIN_SECRET: string | undefined
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

interface EthereumProvider {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>
  on: (event: string, handler: (...args: unknown[]) => void) => void
  removeListener: (event: string, handler: (...args: unknown[]) => void) => void
}

interface Window {
  ethereum?: EthereumProvider
}
