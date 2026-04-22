import { useState, useEffect, useCallback } from 'react'
import { ethers } from 'ethers'
import { toast } from 'sonner'

const FUJI_CHAIN_ID = '0xa869' // 43113 in hex
const FUJI_NETWORK = {
  chainId: FUJI_CHAIN_ID,
  chainName: 'Avalanche Fuji Testnet',
  nativeCurrency: { name: 'AVAX', symbol: 'AVAX', decimals: 18 },
  rpcUrls: ['https://api.avax-test.network/ext/bc/C/rpc'],
  blockExplorerUrls: ['https://testnet.snowtrace.io/'],
}

export interface WalletState {
  address: string | null
  chainId: string | null
  isConnecting: boolean
  isCorrectNetwork: boolean
  provider: ethers.BrowserProvider | null
  connect: () => Promise<void>
  disconnect: () => void
  switchToFuji: () => Promise<void>
  signMessage: (message: string | Uint8Array) => Promise<string>
}

export function useWallet(): WalletState {
  const [address, setAddress] = useState<string | null>(null)
  const [chainId, setChainId] = useState<string | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null)

  const isCorrectNetwork = chainId === FUJI_CHAIN_ID

  const updateChainId = useCallback(async (eth: Window['ethereum']) => {
    if (!eth) return
    const id = (await eth.request({ method: 'eth_chainId' })) as string
    setChainId(id)
  }, [])

  useEffect(() => {
    const eth = window.ethereum
    if (!eth) return

    if (!sessionStorage.getItem('wallet-disconnected')) {
      eth.request({ method: 'eth_accounts' }).then((accounts) => {
        const accs = accounts as string[]
        if (accs.length > 0) {
          setAddress(accs[0])
          setProvider(new ethers.BrowserProvider(eth))
          updateChainId(eth)
        }
      })
    }

    const handleAccountsChanged = (accounts: unknown) => {
      const accs = accounts as string[]
      if (accs.length === 0) {
        setAddress(null)
        setProvider(null)
      } else {
        setAddress(accs[0])
        setProvider(new ethers.BrowserProvider(eth))
      }
    }
    const handleChainChanged = (id: unknown) => setChainId(id as string)

    eth.on('accountsChanged', handleAccountsChanged)
    eth.on('chainChanged', handleChainChanged)
    return () => {
      eth.removeListener('accountsChanged', handleAccountsChanged)
      eth.removeListener('chainChanged', handleChainChanged)
    }
  }, [updateChainId])

  const connect = useCallback(async () => {
    const eth = window.ethereum
    if (!eth) {
      toast.error('MetaMask not found. Please install the MetaMask browser extension.')
      return
    }
    setIsConnecting(true)
    try {
      sessionStorage.removeItem('wallet-disconnected')
      const accounts = (await eth.request({ method: 'eth_requestAccounts' })) as string[]
      setAddress(accounts[0])
      setProvider(new ethers.BrowserProvider(eth))
      await updateChainId(eth)
    } catch {
      toast.error('Failed to connect wallet')
    } finally {
      setIsConnecting(false)
    }
  }, [updateChainId])

  const disconnect = useCallback(() => {
    setAddress(null)
    setProvider(null)
    setChainId(null)
    sessionStorage.setItem('wallet-disconnected', '1')
  }, [])

  const switchToFuji = useCallback(async () => {
    const eth = window.ethereum
    if (!eth) return
    try {
      await eth.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: FUJI_CHAIN_ID }] })
    } catch (err: unknown) {
      const e = err as { code?: number }
      if (e.code === 4902) {
        try {
          await eth.request({ method: 'wallet_addEthereumChain', params: [FUJI_NETWORK] })
        } catch {
          toast.error('Failed to add Fuji network')
        }
      } else {
        toast.error('Failed to switch to Fuji network')
      }
    }
  }, [])

  const signMessage = useCallback(
    async (message: string | Uint8Array): Promise<string> => {
      if (!provider || !address) throw new Error('Wallet not connected')
      const signer = await provider.getSigner()
      return signer.signMessage(message)
    },
    [provider, address]
  )

  return { address, chainId, isConnecting, isCorrectNetwork, provider, connect, disconnect, switchToFuji, signMessage }
}
