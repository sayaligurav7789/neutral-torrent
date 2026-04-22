import { useState, useCallback, useEffect } from "react"
import { toast } from "sonner"
import { ethers } from "ethers"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Shield,
  ArrowLeft,
  Loader2,
  Wallet,
  Sun,
  Moon,
  Copy,
  Check,
  RefreshCw,
  ShoppingCart,
  Tag,
  ArrowDownUp,
  CheckCircle2,
  Store,
} from "lucide-react"
import { useTheme } from "next-themes"
import { useWallet } from "@/hooks/useWallet"
import {
  checkHealth,
  getMarketplaceListings,
  setContentPrice as apiSetContentPrice,
  type ContentListing,
} from "@/lib/api"
import { shortenAddress } from "@/lib/pbts-types"
import { SwapModal } from "./swap-modal"

// Sepolia demo tokens for pricing
const PRICE_TOKENS = [
  { address: "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14", symbol: "WETH", name: "Wrapped Ether",  decimals: 18 },
  { address: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238", symbol: "USDC", name: "USD Coin",       decimals: 6  },
  { address: "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984", symbol: "UNI",  name: "Uniswap",        decimals: 18 },
]

function formatTokenAmount(amount: string, decimals: number): string {
  try {
    return ethers.formatUnits(amount, decimals)
  } catch {
    return amount
  }
}

function getTokenDecimals(address: string): number {
  const token = PRICE_TOKENS.find((t) => t.address.toLowerCase() === address.toLowerCase())
  return token?.decimals ?? 18
}

interface MarketplaceDashboardProps {
  onBack: () => void
  embedded?: boolean
}

export function MarketplaceDashboard({ onBack, embedded }: MarketplaceDashboardProps) {
  const wallet = useWallet()
  const { theme, setTheme } = useTheme()
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null)
  const [copied, setCopied] = useState(false)

  // Listings
  const [listings, setListings] = useState<ContentListing[]>([])
  const [isLoadingListings, setIsLoadingListings] = useState(false)

  // Set price form
  const [priceInfohash, setPriceInfohash] = useState("")
  const [priceToken, setPriceToken] = useState("")
  const [priceAmount, setPriceAmount] = useState("")
  const [priceDescription, setPriceDescription] = useState("")
  const [isSettingPrice, setIsSettingPrice] = useState(false)

  // Swap modal
  const [swapModalOpen, setSwapModalOpen] = useState(false)
  const [selectedListing, setSelectedListing] = useState<ContentListing | null>(null)

  // Purchased content
  const [purchasedHashes, setPurchasedHashes] = useState<Set<string>>(new Set())

  useEffect(() => {
    checkHealth().then(setBackendOnline)
    loadListings()
  }, [])

  async function loadListings() {
    setIsLoadingListings(true)
    const data = await getMarketplaceListings()
    setListings(data)
    setIsLoadingListings(false)
  }

  const handleConnect = useCallback(async () => {
    await wallet.connect()
  }, [wallet])

  const handleCopy = useCallback(async () => {
    if (!wallet.address) return
    await navigator.clipboard.writeText(wallet.address)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [wallet.address])

  // Set content price
  const handleSetPrice = useCallback(async () => {
    if (!wallet.address) {
      toast.error("Connect your wallet first")
      return
    }
    if (!priceInfohash.trim()) {
      toast.error("Enter an infohash")
      return
    }
    if (!priceToken) {
      toast.error("Select a token")
      return
    }
    if (!priceAmount || parseFloat(priceAmount) <= 0) {
      toast.error("Enter a valid price")
      return
    }

    setIsSettingPrice(true)

    const token = PRICE_TOKENS.find((t) => t.address === priceToken)
    if (!token) {
      toast.error("Invalid token selected")
      setIsSettingPrice(false)
      return
    }

    // Convert human-readable amount to base units
    const amountInBaseUnits = ethers.parseUnits(priceAmount, token.decimals).toString()

    const message = `Neural Torrent set price for ${priceInfohash.trim()} at ${Date.now()}`

    try {
      const signature = await wallet.signMessage(message)
      await apiSetContentPrice(
        priceInfohash.trim(),
        priceToken,
        token.symbol,
        amountInBaseUnits,
        priceDescription.trim(),
        wallet.address,
        message,
        signature
      )
      toast.success("Price set!", { description: `${priceAmount} ${token.symbol} for ${priceInfohash.trim().slice(0, 12)}...` })
      setPriceInfohash("")
      setPriceAmount("")
      setPriceDescription("")
      setPriceToken("")
      await loadListings()
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      toast.error("Failed to set price", { description: msg })
    }

    setIsSettingPrice(false)
  }, [wallet, priceInfohash, priceToken, priceAmount, priceDescription])

  // Open swap modal for a listing
  const handleBuy = useCallback((listing: ContentListing) => {
    if (!wallet.address) {
      toast.error("Connect your wallet first")
      return
    }
    if (listing.sellerAddress.toLowerCase() === wallet.address.toLowerCase()) {
      toast.error("You can't buy your own content")
      return
    }
    setSelectedListing(listing)
    setSwapModalOpen(true)
  }, [wallet.address])

  const handlePurchaseComplete = useCallback((infohash: string) => {
    setPurchasedHashes((prev) => new Set(prev).add(infohash))
  }, [])

  const marketplaceContent = (
    <>
        {/* Intro banner */}
        <Card className="border-chart-4/20 bg-chart-4/5">
          <CardContent className="pt-6 flex flex-col sm:flex-row items-center gap-4">
            <div className="h-12 w-12 rounded-lg bg-chart-4/10 border border-chart-4/20 flex items-center justify-center shrink-0">
              <ArrowDownUp className="h-6 w-6 text-chart-4" />
            </div>
            <div className="flex flex-col gap-1 text-center sm:text-left">
              <h2 className="text-lg font-semibold text-foreground">Agent-to-Agent Data Marketplace</h2>
              <p className="text-sm text-muted-foreground">
                Seeders set prices for their content. Downloaders pay with any token.
                Uniswap handles cross-token swaps automatically.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Connect wallet */}
        {!wallet.address && (
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="pt-6 flex flex-col items-center gap-4">
              <Wallet className="h-8 w-8 text-primary" />
              <p className="text-sm text-foreground font-medium">Connect your wallet to buy or sell content</p>
              <Button onClick={handleConnect} disabled={wallet.isConnecting} className="gap-2">
                {wallet.isConnecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wallet className="h-4 w-4" />}
                Connect MetaMask
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Set Price card (for seeders) */}
        {wallet.address && (
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Tag className="h-4 w-4" />
                List Content for Sale
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <p className="text-xs text-muted-foreground">
                Set a price for your content. Other agents can buy access using any token.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs text-muted-foreground">Infohash</Label>
                  <Input
                    placeholder="0x... torrent infohash"
                    value={priceInfohash}
                    onChange={(e) => setPriceInfohash(e.target.value)}
                    className="font-mono text-xs"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs text-muted-foreground">Description</Label>
                  <Input
                    placeholder="e.g., ETH Denver workshop dataset"
                    value={priceDescription}
                    onChange={(e) => setPriceDescription(e.target.value)}
                    className="text-xs"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs text-muted-foreground">Token</Label>
                  <Select value={priceToken} onValueChange={setPriceToken}>
                    <SelectTrigger className="w-full text-xs">
                      <SelectValue placeholder="Select token" />
                    </SelectTrigger>
                    <SelectContent>
                      {PRICE_TOKENS.map((token) => (
                        <SelectItem key={token.address} value={token.address}>
                          {token.symbol} — {token.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs text-muted-foreground">Price</Label>
                  <Input
                    type="number"
                    step="0.001"
                    min="0"
                    placeholder="0.001"
                    value={priceAmount}
                    onChange={(e) => setPriceAmount(e.target.value)}
                    className="font-mono text-xs"
                  />
                </div>
              </div>

              <Button
                onClick={handleSetPrice}
                disabled={isSettingPrice || !priceInfohash.trim() || !priceToken || !priceAmount}
                className="w-full sm:w-auto gap-2"
              >
                {isSettingPrice ? <Loader2 className="h-4 w-4 animate-spin" /> : <Tag className="h-4 w-4" />}
                {isSettingPrice ? "Setting Price..." : "Set Price & List"}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Marketplace listings */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Store className="h-4 w-4" />
                Available Content
                {listings.length > 0 && (
                  <Badge variant="secondary" className="text-[10px] ml-1">
                    {listings.length} listing{listings.length !== 1 ? "s" : ""}
                  </Badge>
                )}
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={loadListings}
                disabled={isLoadingListings}
                className="h-7 px-2 text-xs text-muted-foreground"
              >
                <RefreshCw className={`h-3 w-3 mr-1 ${isLoadingListings ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoadingListings && listings.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin mb-3" />
                <p className="text-sm">Loading marketplace...</p>
              </div>
            ) : listings.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <ShoppingCart className="h-8 w-8 mb-3 opacity-40" />
                <p className="text-sm">No content listed yet</p>
                <p className="text-xs mt-1">
                  Be the first to list content for sale using the form above.
                </p>
              </div>
            ) : (
              <ScrollArea className="max-h-[500px]">
                <div className="space-y-2">
                  {listings.map((listing) => {
                    const decimals = getTokenDecimals(listing.tokenAddress)
                    const formattedPrice = formatTokenAmount(listing.amount, decimals)
                    const isMine = wallet.address?.toLowerCase() === listing.sellerAddress.toLowerCase()
                    const isPurchased = purchasedHashes.has(listing.infohash)

                    return (
                      <div
                        key={listing.infohash}
                        className="rounded-lg border border-border p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:bg-secondary/30 transition-colors"
                      >
                        <div className="flex flex-col gap-1 min-w-0 flex-1">
                          {listing.description && (
                            <span className="text-sm font-medium text-foreground">{listing.description}</span>
                          )}
                          <span className="text-xs font-mono text-muted-foreground truncate">
                            {listing.infohash}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            Seller: {shortenAddress(listing.sellerAddress)}
                            {isMine && (
                              <Badge variant="outline" className="ml-2 text-[10px] border-primary/30 text-primary">
                                You
                              </Badge>
                            )}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <Badge variant="outline" className="text-xs font-mono border-chart-4/30 text-chart-4 bg-chart-4/5">
                            {formattedPrice} {listing.tokenSymbol}
                          </Badge>

                          {isPurchased ? (
                            <Badge variant="outline" className="gap-1 border-success/30 text-success bg-success/5">
                              <CheckCircle2 className="h-3 w-3" />
                              Purchased
                            </Badge>
                          ) : (
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => handleBuy(listing)}
                              disabled={!wallet.address || isMine}
                              className="gap-1.5"
                            >
                              <ShoppingCart className="h-3.5 w-3.5" />
                              Buy
                            </Button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        {/* How it works */}
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <ArrowDownUp className="h-4 w-4" />
              How It Works
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="flex flex-col gap-2 p-3 rounded-lg bg-secondary/30 border border-border">
                <div className="flex items-center gap-2">
                  <Badge className="h-6 w-6 flex items-center justify-center rounded-full p-0 text-xs">1</Badge>
                  <span className="text-sm font-medium text-foreground">Seeder Lists</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Seeder sets a price for their dataset in any ERC-20 token (WETH, USDC, UNI).
                </p>
              </div>
              <div className="flex flex-col gap-2 p-3 rounded-lg bg-secondary/30 border border-border">
                <div className="flex items-center gap-2">
                  <Badge className="h-6 w-6 flex items-center justify-center rounded-full p-0 text-xs">2</Badge>
                  <span className="text-sm font-medium text-foreground">Uniswap Swaps</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Buyer pays with a different token. Uniswap automatically handles the cross-token swap.
                </p>
              </div>
              <div className="flex flex-col gap-2 p-3 rounded-lg bg-secondary/30 border border-border">
                <div className="flex items-center gap-2">
                  <Badge className="h-6 w-6 flex items-center justify-center rounded-full p-0 text-xs">3</Badge>
                  <span className="text-sm font-medium text-foreground">Access Granted</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  After payment, buyer gets access to the content. Reputation updates on-chain.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      {/* Swap Modal */}
      {selectedListing && (
        <SwapModal
          open={swapModalOpen}
          onOpenChange={setSwapModalOpen}
          listing={selectedListing}
          buyerAddress={wallet.address ?? ""}
          signMessage={wallet.signMessage}
          provider={wallet.provider}
          onPurchaseComplete={handlePurchaseComplete}
        />
      )}
    </>
  )

  if (embedded) {
    return marketplaceContent
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={onBack} className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
            <div className="h-8 w-8 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Shield className="h-4 w-4 text-primary" />
            </div>
            <span className="text-lg font-bold text-foreground tracking-tight">Neural Torrent</span>
            <Badge variant="outline" className="text-xs border-chart-4/30 text-chart-4 bg-chart-4/5">
              Marketplace
            </Badge>
          </div>

          <div className="flex items-center gap-3">
            <Badge
              variant="outline"
              className={`text-xs font-mono hidden sm:flex ${
                backendOnline === null
                  ? "border-border text-muted-foreground"
                  : backendOnline
                    ? "border-success/30 text-success bg-success/5"
                    : "border-destructive/30 text-destructive bg-destructive/5"
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full mr-1.5 ${
                  backendOnline === null
                    ? "bg-muted-foreground animate-pulse"
                    : backendOnline
                      ? "bg-success"
                      : "bg-destructive"
                }`}
              />
              {backendOnline === null ? "checking..." : backendOnline ? "backend online" : "backend offline"}
            </Badge>

            {wallet.address && (
              <button
                onClick={handleCopy}
                className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-secondary border border-border hover:border-primary/30 transition-colors"
              >
                <span className="text-sm font-mono text-foreground">
                  {shortenAddress(wallet.address)}
                </span>
                {copied ? (
                  <Check className="h-3.5 w-3.5 text-primary" />
                ) : (
                  <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                )}
              </button>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="text-muted-foreground hover:text-foreground"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-6 flex flex-col gap-6">
        {marketplaceContent}
      </main>
    </div>
  )
}
