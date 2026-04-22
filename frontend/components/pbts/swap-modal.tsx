import { useState, useCallback } from "react"
import { toast } from "sonner"
import { ethers } from "ethers"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Loader2,
  ArrowRight,
  CheckCircle2,
  XCircle,
  ArrowDownUp,
  Zap,
} from "lucide-react"
import {
  getSwapQuote,
  checkTokenApproval,
  getSwapTransaction,
  confirmPayment,
  type ContentListing,
  type SwapQuoteResponse,
} from "@/lib/api"
import { shortenAddress } from "@/lib/pbts-types"

// Sepolia demo tokens
const DEMO_TOKENS = [
  { address: "0x0000000000000000000000000000000000000000", symbol: "ETH",  name: "Ether",         decimals: 18 },
  { address: "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14", symbol: "WETH", name: "Wrapped Ether",  decimals: 18 },
  { address: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238", symbol: "USDC", name: "USD Coin",       decimals: 6  },
  { address: "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984", symbol: "UNI",  name: "Uniswap",        decimals: 18 },
]

type SwapStep = "idle" | "quoting" | "quoted" | "approving" | "swapping" | "confirming" | "completed" | "error"

interface SwapModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  listing: ContentListing
  buyerAddress: string
  signMessage: (msg: string | Uint8Array) => Promise<string>
  provider: ethers.BrowserProvider | null
  onPurchaseComplete: (infohash: string) => void
}

function formatTokenAmount(amount: string, decimals: number): string {
  try {
    return ethers.formatUnits(amount, decimals)
  } catch {
    return amount
  }
}

function getTokenDecimals(address: string): number {
  const token = DEMO_TOKENS.find((t) => t.address.toLowerCase() === address.toLowerCase())
  return token?.decimals ?? 18
}

function getTokenSymbol(address: string): string {
  const token = DEMO_TOKENS.find((t) => t.address.toLowerCase() === address.toLowerCase())
  return token?.symbol ?? "TOKEN"
}

export function SwapModal({
  open,
  onOpenChange,
  listing,
  buyerAddress,
  signMessage,
  provider,
  onPurchaseComplete,
}: SwapModalProps) {
  const [step, setStep] = useState<SwapStep>("idle")
  const [selectedToken, setSelectedToken] = useState<string>("")
  const [quote, setQuote] = useState<SwapQuoteResponse | null>(null)
  const [errorMsg, setErrorMsg] = useState("")
  const [txHash, setTxHash] = useState("")

  // Filter out the seller's token from payment options (can't pay with same token)
  const paymentTokens = DEMO_TOKENS.filter(
    (t) => t.address.toLowerCase() !== listing.tokenAddress.toLowerCase()
  )

  const reset = useCallback(() => {
    setStep("idle")
    setSelectedToken("")
    setQuote(null)
    setErrorMsg("")
    setTxHash("")
  }, [])

  const handleClose = useCallback((open: boolean) => {
    if (!open) reset()
    onOpenChange(open)
  }, [onOpenChange, reset])

  // Step 1: Get quote
  const handleGetQuote = useCallback(async () => {
    if (!selectedToken) {
      toast.error("Select a payment token")
      return
    }

    setStep("quoting")
    setErrorMsg("")

    try {
      const q = await getSwapQuote(listing.infohash, buyerAddress, selectedToken)
      setQuote(q)
      setStep("quoted")
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setErrorMsg(msg)
      setStep("error")
    }
  }, [selectedToken, listing.infohash, buyerAddress])

  // Step 2 + 3: Approve (if needed) + Execute swap
  const handleExecuteSwap = useCallback(async () => {
    if (!quote || !provider) return

    try {
      // Step 2: Check approval
      setStep("approving")

      if (!quote.noSwapNeeded) {
        const approval = await checkTokenApproval(
          buyerAddress,
          selectedToken,
          quote.inputAmount
        )

        if (!approval.isApproved && approval.approvalTx) {
          const signer = await provider.getSigner()
          const approveTx = await signer.sendTransaction({
            to: approval.approvalTx.to,
            data: approval.approvalTx.data,
            value: approval.approvalTx.value,
          })
          await approveTx.wait()
          toast.success("Token approved!")
        }

        // Step 3: Execute swap
        setStep("swapping")

        const swapTx = await getSwapTransaction(quote.rawQuote)

        if (swapTx.data && swapTx.data !== "0x") {
          const signer = await provider.getSigner()
          const tx = await signer.sendTransaction({
            to: swapTx.to,
            data: swapTx.data,
            value: swapTx.value,
            gasLimit: swapTx.gasLimit,
          })
          const receipt = await tx.wait()
          setTxHash(receipt?.hash ?? tx.hash)
        } else {
          // Mock mode — simulate a tx hash
          setTxHash(`0xmock_${Date.now().toString(16)}`)
        }
      } else {
        // Direct payment (same token) — skip swap
        setTxHash(`0xdirect_${Date.now().toString(16)}`)
      }

      // Step 4: Confirm payment with backend
      setStep("confirming")

      const confirmMsg = `Confirm Neural Torrent marketplace payment for ${listing.infohash} by ${buyerAddress} at ${Date.now()}`
      const sig = await signMessage(confirmMsg)
      const finalTxHash = txHash || `0xconfirm_${Date.now().toString(16)}`

      await confirmPayment(
        listing.infohash,
        buyerAddress,
        finalTxHash,
        confirmMsg,
        sig
      )

      setStep("completed")
      toast.success("Payment confirmed! Access granted.")
      onPurchaseComplete(listing.infohash)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setErrorMsg(msg)
      setStep("error")
    }
  }, [quote, provider, buyerAddress, selectedToken, listing, signMessage, onPurchaseComplete, txHash])

  const sellerTokenDecimals = getTokenDecimals(listing.tokenAddress)
  const formattedPrice = formatTokenAmount(listing.amount, sellerTokenDecimals)

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowDownUp className="h-5 w-5 text-primary" />
            Buy Content
          </DialogTitle>
          <DialogDescription>
            Pay for access with any token — Uniswap handles the swap.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {/* Listing info */}
          <div className="rounded-lg border border-border p-3 flex flex-col gap-2 bg-secondary/30">
            {listing.description && (
              <p className="text-sm font-medium text-foreground">{listing.description}</p>
            )}
            <p className="text-xs font-mono text-muted-foreground truncate">{listing.infohash}</p>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                Seller: {shortenAddress(listing.sellerAddress)}
              </span>
              <Badge variant="outline" className="text-xs font-mono border-primary/30 text-primary">
                {formattedPrice} {listing.tokenSymbol}
              </Badge>
            </div>
          </div>

          {/* Token selection */}
          {(step === "idle" || step === "quoting") && (
            <div className="flex flex-col gap-3">
              <label className="text-sm font-medium text-foreground">Pay with</label>
              <Select value={selectedToken} onValueChange={setSelectedToken}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a token" />
                </SelectTrigger>
                <SelectContent>
                  {paymentTokens.map((token) => (
                    <SelectItem key={token.address} value={token.address}>
                      {token.symbol} — {token.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                onClick={handleGetQuote}
                disabled={!selectedToken || step === "quoting"}
                className="w-full gap-2"
              >
                {step === "quoting" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Zap className="h-4 w-4" />
                )}
                {step === "quoting" ? "Getting Quote..." : "Get Quote"}
              </Button>
            </div>
          )}

          {/* Quote display */}
          {step === "quoted" && quote && (
            <div className="flex flex-col gap-3">
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">You pay</span>
                  <span className="text-lg font-bold font-mono text-foreground">
                    {formatTokenAmount(quote.inputAmount, getTokenDecimals(selectedToken))}{" "}
                    {getTokenSymbol(selectedToken)}
                  </span>
                </div>

                <div className="flex justify-center">
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Seller gets</span>
                  <span className="text-lg font-bold font-mono text-foreground">
                    {formattedPrice} {listing.tokenSymbol}
                  </span>
                </div>

                <div className="border-t border-border pt-2 flex flex-col gap-1 text-xs text-muted-foreground">
                  <div className="flex justify-between">
                    <span>Route</span>
                    <span>{quote.routeDescription}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Gas Estimate</span>
                    <span>{quote.gasEstimate}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Price Impact</span>
                    <span>{quote.priceImpact}%</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={reset} className="flex-1">
                  Cancel
                </Button>
                <Button onClick={handleExecuteSwap} className="flex-1 gap-2">
                  <ArrowDownUp className="h-4 w-4" />
                  Approve & Swap
                </Button>
              </div>
            </div>
          )}

          {/* Progress indicators */}
          {(step === "approving" || step === "swapping" || step === "confirming") && (
            <div className="flex flex-col items-center gap-4 py-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <div className="flex flex-col items-center gap-1">
                <p className="text-sm font-medium text-foreground">
                  {step === "approving" && "Approving token..."}
                  {step === "swapping" && "Executing swap..."}
                  {step === "confirming" && "Confirming payment..."}
                </p>
                <p className="text-xs text-muted-foreground">
                  {step === "approving" && "Check MetaMask for the approval transaction"}
                  {step === "swapping" && "Check MetaMask for the swap transaction"}
                  {step === "confirming" && "Signing confirmation message..."}
                </p>
              </div>

              {/* Step indicators */}
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Badge variant={step === "approving" ? "default" : "outline"} className="text-[10px]">
                  1. Approve
                </Badge>
                <ArrowRight className="h-3 w-3" />
                <Badge variant={step === "swapping" ? "default" : "outline"} className="text-[10px]">
                  2. Swap
                </Badge>
                <ArrowRight className="h-3 w-3" />
                <Badge variant={step === "confirming" ? "default" : "outline"} className="text-[10px]">
                  3. Confirm
                </Badge>
              </div>
            </div>
          )}

          {/* Success */}
          {step === "completed" && (
            <div className="flex flex-col items-center gap-4 py-4">
              <div className="h-12 w-12 rounded-full bg-success/10 border border-success/20 flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6 text-success" />
              </div>
              <div className="flex flex-col items-center gap-1">
                <p className="text-lg font-semibold text-success">Access Granted!</p>
                <p className="text-sm text-muted-foreground">
                  You can now download this content from the swarm.
                </p>
                {txHash && (
                  <p className="text-xs font-mono text-muted-foreground mt-2 truncate max-w-full">
                    TX: {txHash}
                  </p>
                )}
              </div>
              <Button onClick={() => handleClose(false)} className="w-full">
                Done
              </Button>
            </div>
          )}

          {/* Error */}
          {step === "error" && (
            <div className="flex flex-col items-center gap-4 py-4">
              <div className="h-12 w-12 rounded-full bg-destructive/10 border border-destructive/20 flex items-center justify-center">
                <XCircle className="h-6 w-6 text-destructive" />
              </div>
              <div className="flex flex-col items-center gap-1">
                <p className="text-lg font-semibold text-destructive">Error</p>
                <p className="text-sm text-muted-foreground text-center">{errorMsg}</p>
              </div>
              <Button variant="outline" onClick={reset} className="w-full">
                Try Again
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
