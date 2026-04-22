
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Shield,
  LogOut,
  Copy,
  Check,
  Sun,
  Moon,
  ArrowLeft,
} from "lucide-react"
import { shortenAddress } from "@/lib/pbts-types"
import { useState } from "react"
import { useTheme } from "next-themes"

export type DashboardTab = "dashboard" | "files" | "agent"

interface DashboardHeaderProps {
  address: string
  network: string
  activeTab: DashboardTab
  onTabChange: (tab: DashboardTab) => void
  onDisconnect: () => void
  onBack?: () => void
  backendOnline: boolean | null
}

export function DashboardHeader({
  address,
  network,
  activeTab,
  onTabChange,
  onDisconnect,
  onBack,
  backendOnline,
}: DashboardHeaderProps) {
  const [copied, setCopied] = useState(false)
  const { theme, setTheme } = useTheme()

  const handleCopy = async () => {
    await navigator.clipboard.writeText(address)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark")
  }

  return (
    <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {onBack && (
            <Button variant="ghost" size="sm" onClick={onBack} className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
          )}
          <div className="h-8 w-8 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Shield className="h-4 w-4 text-primary" />
          </div>
          <span className="text-lg font-bold text-foreground tracking-tight">
            Neural Torrent
          </span>
          {onBack && (
            <Badge variant="outline" className="text-xs border-primary/30 text-primary bg-primary/5">
              User
            </Badge>
          )}

          {/* Navigation tabs */}
          <nav className="hidden sm:flex items-center gap-1 ml-6" aria-label="Main navigation">
            <button
              onClick={() => onTabChange("dashboard")}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                activeTab === "dashboard"
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              }`}
              aria-current={activeTab === "dashboard" ? "page" : undefined}
            >
              Dashboard
            </button>
            <button
              onClick={() => onTabChange("files")}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                activeTab === "files"
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              }`}
              aria-current={activeTab === "files" ? "page" : undefined}
            >
              Files
            </button>
            <button
              onClick={() => onTabChange("agent")}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                activeTab === "agent"
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              }`}
              aria-current={activeTab === "agent" ? "page" : undefined}
            >
              Agent
            </button>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <Badge
            variant="outline"
            className="border-primary/30 text-primary bg-primary/5 text-xs font-mono hidden sm:flex"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-primary mr-1.5 animate-pulse" />
            {network}
          </Badge>

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

          <button
            onClick={handleCopy}
            className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-secondary border border-border hover:border-primary/30 transition-colors"
          >
            <span className="text-sm font-mono text-foreground">
              {shortenAddress(address)}
            </span>
            {copied ? (
              <Check className="h-3.5 w-3.5 text-primary" />
            ) : (
              <Copy className="h-3.5 w-3.5 text-muted-foreground" />
            )}
          </button>

          <Button
            variant="ghost"
            size="sm"
            onClick={toggleTheme}
            className="text-muted-foreground hover:text-foreground"
            aria-label="Toggle theme"
          >
            {theme === "dark" ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={onDisconnect}
            className="text-muted-foreground hover:text-foreground"
          >
            <LogOut className="h-4 w-4" />
            <span className="sr-only">Disconnect</span>
          </Button>
        </div>
      </div>
    </header>
  )
}
