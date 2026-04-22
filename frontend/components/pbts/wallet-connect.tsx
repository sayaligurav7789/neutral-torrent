
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Wallet,
  Shield,
  ArrowUpDown,
  Globe,
  Loader2,
  ChevronRight,
  Sun,
  Moon,
  ArrowLeft,
} from "lucide-react"
import { useWallet } from "@/hooks/useWallet"
import { registerUser } from "@/lib/api"
import { useState } from "react"
import { toast } from "sonner"

const CHAIN_ID = parseInt(import.meta.env.VITE_CHAIN_ID ?? "43113", 10)
const CHAIN_HEX = `0x${CHAIN_ID.toString(16)}`
const IS_FUJI = CHAIN_ID === 43113

interface WalletConnectProps {
  onConnect: (address: string) => void
  onBack?: () => void
}

export function WalletConnect({ onConnect, onBack }: WalletConnectProps) {
  const wallet = useWallet()
  const [step, setStep] = useState<"idle" | "connecting" | "switching" | "registering">("idle")
  const { theme, setTheme } = useTheme()

  const handleConnect = async () => {
    if (!window.ethereum) {
      toast.error("MetaMask not found", {
        description: "Please install the MetaMask browser extension.",
      })
      return
    }

    setStep("connecting")

    try {
      await wallet.connect()

      // After connect, wallet.address may not be updated yet (state is async),
      // so we read the address directly from ethereum.
      const accounts = (await window.ethereum.request({
        method: "eth_accounts",
      })) as string[]
      const address = accounts[0]
      if (!address) {
        setStep("idle")
        return
      }

      // Switch network if needed
      const currentChainId = (await window.ethereum.request({
        method: "eth_chainId",
      })) as string
      if (currentChainId.toLowerCase() !== CHAIN_HEX.toLowerCase()) {
        setStep("switching")
        if (IS_FUJI) {
          await wallet.switchToFuji()
        } else {
          try {
            await window.ethereum.request({
              method: "wallet_switchEthereumChain",
              params: [{ chainId: CHAIN_HEX }],
            })
          } catch {
            toast.error("Please switch to the correct network in MetaMask.")
            setStep("idle")
            return
          }
        }
      }

      // Register on backend
      setStep("registering")
      const message = `Register Neural Torrent account for ${address} at ${Date.now()}`

      try {
        const signature = await wallet.signMessage(message)
        await registerUser(address, message, signature)
        toast.success("Registered on-chain!", {
          description: "1 GB initial credit granted.",
        })
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : String(err)
        // "already registered" is not an error from the user's perspective
        if (!errMsg.toLowerCase().includes("already registered")) {
          toast.error("Registration failed", { description: errMsg })
          setStep("idle")
          return
        }
      }

      onConnect(address)
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err)
      toast.error("Connection failed", { description: errMsg })
      setStep("idle")
    }
  }

  const features = [
    {
      icon: Shield,
      title: "Cryptographic Attestation",
      description: "AI agents sign receipts for received data pieces. Verifiable and tamper-proof.",
    },
    {
      icon: ArrowUpDown,
      title: "Persistent Reputation",
      description: "Agent reputation stored on-chain. Survives across networks and tracker shutdowns.",
    },
    {
      icon: Globe,
      title: "Censorship Resistant",
      description: "Decentralized agent coordination. No single point of failure or control.",
    },
  ]

  const stepLabels: Record<string, string> = {
    connecting: "Connecting to MetaMask...",
    switching: "Switching network...",
    registering: "Registering on-chain...",
  }
  const stepDescriptions: Record<string, string> = {
    connecting: "Please approve the connection in your wallet",
    switching: "Approve the network switch in MetaMask",
    registering: "Creating your account with 1 GB initial credit",
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 relative">
      {/* Background grid effect */}
      <div className="fixed inset-0 bg-[linear-gradient(var(--border)_1px,transparent_1px),linear-gradient(to_right,var(--border)_1px,transparent_1px)] bg-[size:64px_64px] opacity-30" />

      {/* Top bar — back + theme toggle */}
      <div className="fixed top-4 left-4 right-4 z-50 flex justify-between">
        {onBack ? (
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 px-3 py-2 rounded-md border border-border bg-card text-muted-foreground hover:text-foreground transition-colors text-sm"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
        ) : (
          <div />
        )}
        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="p-2 rounded-md border border-border bg-card text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Toggle theme"
        >
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
      </div>

      <div className="relative z-10 flex flex-col items-center gap-12 max-w-2xl w-full">
        {/* Logo / Brand */}
        <div className="flex flex-col items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-foreground">
              Neural Torrent
            </h1>
          </div>
          <p className="text-lg text-muted-foreground text-center text-balance leading-relaxed">
            Web3-Enhanced BitTorrent Network for Self-Evolving AI Agents
          </p>
          <Badge
            variant="outline"
            className="text-xs font-mono border-primary/30 text-primary bg-primary/5"
          >
            Chain ID: {CHAIN_ID}
          </Badge>
        </div>

        {/* Feature cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="rounded-lg border border-border bg-card p-4 flex flex-col gap-3"
            >
              <feature.icon className="h-5 w-5 text-primary" />
              <h3 className="text-sm font-semibold text-card-foreground">
                {feature.title}
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>

        {/* Connect button area */}
        <div className="flex flex-col items-center gap-4 w-full max-w-sm">
          {step === "idle" && (
            <Button
              size="lg"
              onClick={handleConnect}
              disabled={wallet.isConnecting}
              className="w-full h-14 text-base font-semibold bg-primary text-primary-foreground hover:bg-primary/90 gap-3"
            >
              <Wallet className="h-5 w-5" />
              Connect MetaMask
              <ChevronRight className="h-4 w-4 ml-auto" />
            </Button>
          )}

          {step !== "idle" && (
            <div className={`flex flex-col items-center gap-3 p-6 rounded-lg border w-full ${
              step === "registering"
                ? "border-primary/30 bg-primary/5"
                : "border-border bg-card"
            }`}>
              <Loader2 className="h-6 w-6 text-primary animate-spin" />
              <p className="text-sm text-foreground font-medium">
                {stepLabels[step]}
              </p>
              <p className="text-xs text-muted-foreground">
                {stepDescriptions[step]}
              </p>
            </div>
          )}

          {step === "idle" && (
            <p className="text-xs text-muted-foreground text-center">
              Connect your wallet to register and start building reputation.
              <br />
              Server pays gas fees — no native tokens required.
            </p>
          )}
        </div>

        {/* Network info */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
          <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
          <span>Chain ID: {CHAIN_ID}</span>
        </div>
      </div>
    </div>
  )
}
