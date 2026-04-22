
import { useState, useCallback } from "react"
import { ethers } from "ethers"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ArrowUpDown,
  PenTool,
  CheckCircle2,
  Loader2,
  FileCode,
  ExternalLink,
} from "lucide-react"
import type { TransferStep } from "@/lib/pbts-types"
import {
  TEST_WALLETS,
  PIECE_SIZES,
  formatBytes,
  shortenAddress,
  FUJI_EXPLORER,
} from "@/lib/pbts-types"
import { generateMockInfohash } from "@/lib/pbts-store"
import { reportTransfer } from "@/lib/api"
import { toast } from "sonner"

interface SimulateTransferModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  senderAddress: string
  /** Sign a message hash with the connected wallet (MetaMask). */
  signMessage: (message: string | Uint8Array) => Promise<string>
  onTransferComplete: (receiverAddress: string, pieceSize: number) => void
}

export function SimulateTransferModal({
  open,
  onOpenChange,
  senderAddress,
  signMessage,
  onTransferComplete,
}: SimulateTransferModalProps) {
  const [receiver, setReceiver] = useState(TEST_WALLETS[0].address)
  const [pieceSize, setPieceSize] = useState(PIECE_SIZES[2].value) // Default 1MB
  const [step, setStep] = useState<TransferStep>("idle")
  const [infohash] = useState(generateMockInfohash)
  const [txHash, setTxHash] = useState("")
  const [signature, setSignature] = useState("")

  const handleSimulate = useCallback(async () => {
    setStep("signing")

    try {
      // Build the receipt fields
      const pieceHash = ethers.keccak256(
        ethers.toUtf8Bytes(`piece-${infohash}-0`)
      )
      const pieceIndex = 0
      const timestamp = Math.floor(Date.now() / 1000)

      // Compute the receipt hash (must match backend/utils/signatures.ts)
      const hash = ethers.solidityPackedKeccak256(
        ["bytes32", "address", "address", "bytes32", "uint256", "uint256", "uint256"],
        [infohash, senderAddress, receiver, pieceHash, pieceIndex, pieceSize, timestamp]
      )

      // Ask the connected wallet to sign the receipt hash
      const sig = await signMessage(ethers.getBytes(hash))
      setSignature(sig)
      setStep("submitting")

      // Submit to backend
      const result = await reportTransfer({
        infohash,
        sender: senderAddress,
        receiver,
        pieceHash,
        pieceIndex,
        pieceSize,
        timestamp,
        signature: sig,
      })

      setTxHash(result.senderTxHash)
      setStep("confirmed")
      onTransferComplete(receiver, pieceSize)
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err)
      toast.error("Transfer failed", { description: errMsg })
      setStep("idle")
    }
  }, [receiver, pieceSize, infohash, senderAddress, signMessage, onTransferComplete])

  const handleClose = () => {
    setStep("idle")
    setSignature("")
    setTxHash("")
    onOpenChange(false)
  }

  const stepIndicators: { key: TransferStep; label: string }[] = [
    { key: "signing", label: "Signing" },
    { key: "submitting", label: "Submitting" },
    { key: "confirmed", label: "Confirmed" },
  ]

  const stepOrder: TransferStep[] = ["signing", "submitting", "confirmed"]
  const currentStepIndex = stepOrder.indexOf(step)

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg bg-card border-border text-card-foreground">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <ArrowUpDown className="h-5 w-5 text-primary" />
            Simulate Transfer
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Create a cryptographic receipt and update on-chain reputation
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-5 mt-2">
          {/* Step Progress */}
          {step !== "idle" && (
            <div className="flex items-center gap-2">
              {stepIndicators.map((s, i) => {
                const isActive = stepOrder.indexOf(s.key) <= currentStepIndex
                const isCurrent = s.key === step
                return (
                  <div key={s.key} className="flex items-center gap-2 flex-1">
                    <div className="flex flex-col items-center gap-1 flex-1">
                      <div
                        className={`h-1.5 w-full rounded-full transition-colors duration-500 ${
                          isActive ? "bg-primary" : "bg-secondary"
                        }`}
                      />
                      <span
                        className={`text-[10px] font-medium transition-colors ${
                          isCurrent
                            ? "text-primary"
                            : isActive
                              ? "text-foreground"
                              : "text-muted-foreground"
                        }`}
                      >
                        {s.label}
                        {isCurrent && step !== "confirmed" && "..."}
                      </span>
                    </div>
                    {i < stepIndicators.length - 1 && (
                      <div className="h-px w-2 bg-border mt-[-12px]" />
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* Form */}
          {step === "idle" && (
            <>
              <div className="flex flex-col gap-2">
                <Label className="text-xs text-muted-foreground">Sender (You)</Label>
                <Input
                  value={shortenAddress(senderAddress)}
                  disabled
                  className="font-mono text-sm bg-secondary border-border text-foreground"
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label className="text-xs text-muted-foreground">Receiver Address</Label>
                <Select value={receiver} onValueChange={setReceiver}>
                  <SelectTrigger className="font-mono text-sm bg-secondary border-border text-foreground">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    {TEST_WALLETS.map((w) => (
                      <SelectItem
                        key={w.address}
                        value={w.address}
                        className="font-mono text-sm text-popover-foreground"
                      >
                        {w.label} ({shortenAddress(w.address)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-2">
                <Label className="text-xs text-muted-foreground">Piece Size</Label>
                <div className="grid grid-cols-4 gap-2">
                  {PIECE_SIZES.map((size) => (
                    <button
                      key={size.value}
                      onClick={() => setPieceSize(size.value)}
                      className={`px-3 py-2 rounded-md border text-sm font-mono transition-colors ${
                        pieceSize === size.value
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-secondary text-muted-foreground hover:text-foreground hover:border-border"
                      }`}
                    >
                      {size.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Label className="text-xs text-muted-foreground">Infohash</Label>
                <Input
                  value={infohash}
                  disabled
                  className="font-mono text-xs bg-secondary border-border text-muted-foreground"
                />
              </div>

              <Button
                onClick={handleSimulate}
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90 gap-2"
              >
                <PenTool className="h-4 w-4" />
                Sign & Submit Receipt
              </Button>
            </>
          )}

          {/* Signing */}
          {step === "signing" && (
            <div className="flex flex-col items-center gap-4 py-6">
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
              <div className="text-center">
                <p className="text-sm font-medium text-foreground">
                  Waiting for MetaMask signature...
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Transfer: {formatBytes(pieceSize)} to{" "}
                  {shortenAddress(receiver)}
                </p>
              </div>
            </div>
          )}

          {/* Submitting */}
          {step === "submitting" && (
            <div className="flex flex-col items-center gap-4 py-6">
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
              <div className="text-center">
                <p className="text-sm font-medium text-foreground">
                  Submitting to tracker...
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Updating on-chain reputation
                </p>
              </div>
              {signature && (
                <div className="w-full rounded-md bg-secondary border border-border p-3">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">
                    Signature
                  </p>
                  <p className="text-xs font-mono text-foreground break-all">
                    {signature.slice(0, 40)}...
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Confirmed */}
          {step === "confirmed" && (
            <div className="flex flex-col gap-4 py-4">
              <div className="flex flex-col items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-success/10 border border-success/20 flex items-center justify-center">
                  <CheckCircle2 className="h-6 w-6 text-success" />
                </div>
                <p className="text-sm font-medium text-foreground">
                  Transfer Recorded!
                </p>
              </div>

              {/* Receipt preview */}
              <div className="rounded-md bg-secondary border border-border p-4 flex flex-col gap-2">
                <div className="flex items-center gap-2 mb-1">
                  <FileCode className="h-3.5 w-3.5 text-primary" />
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Receipt
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-muted-foreground">Sender</span>
                    <p className="font-mono text-foreground">
                      {shortenAddress(senderAddress)}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Receiver</span>
                    <p className="font-mono text-foreground">
                      {shortenAddress(receiver)}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Size</span>
                    <p className="font-mono text-foreground">
                      {formatBytes(pieceSize)}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Status</span>
                    <Badge className="bg-success/10 text-success border-success/20 text-[10px]">
                      Confirmed
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Tx link */}
              {txHash && (
                <a
                  href={`${FUJI_EXPLORER}/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 text-xs text-primary hover:text-primary/80 transition-colors"
                >
                  <span className="font-mono">{shortenAddress(txHash)}</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}

              <Button
                onClick={handleClose}
                variant="outline"
                className="w-full border-border text-foreground hover:bg-secondary"
              >
                Close
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
