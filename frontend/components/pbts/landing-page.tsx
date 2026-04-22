import { Button } from "@/components/ui/button"
import {
  Shield,
  User,
  Server,
  Sun,
  Moon,
} from "lucide-react"
import { useTheme } from "next-themes"
import { useState } from "react"
import type { AppView } from "@/src/App"

interface LandingPageProps {
  onSelectRole: (role: AppView) => void
}

export function LandingPage({ onSelectRole }: LandingPageProps) {
  const { theme, setTheme } = useTheme()
  const [hoveredButton, setHoveredButton] = useState<'user' | 'tracker' | null>(null)

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 relative">
      <div className="fixed inset-0 bg-[linear-gradient(var(--border)_1px,transparent_1px),linear-gradient(to_right,var(--border)_1px,transparent_1px)] bg-[size:64px_64px] opacity-30" />

      <button
        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        className="fixed top-4 right-4 z-50 p-2 rounded-md border border-border bg-card text-muted-foreground hover:text-foreground transition-colors"
        aria-label="Toggle theme"
      >
        {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </button>

      <div className="relative z-10 flex flex-col items-center gap-12 max-w-3xl w-full">
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
        </div>

        <div className="flex flex-col items-center gap-4 w-full max-w-lg">
          <p className="text-sm text-muted-foreground text-center mb-2">
            Choose your role to continue
          </p>
          <div className="grid grid-cols-2 gap-4 w-full max-w-sm">
            <div className="relative h-32">
              <Button
                size="lg"
                onClick={() => onSelectRole('user')}
                onMouseEnter={() => setHoveredButton('user')}
                onMouseLeave={() => setHoveredButton(null)}
                className="h-full w-full flex-col gap-3 bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-300 p-4"
              >
                <User className="h-6 w-6" />
                <span className="text-sm font-semibold">User/Agent</span>
                <div
                  className={`overflow-hidden transition-all duration-300 ease-in-out ${
                    hoveredButton === 'user'
                      ? 'max-h-20 opacity-100 mt-2'
                      : 'max-h-0 opacity-0'
                  }`}
                >
                  <p className="text-xs text-primary-foreground/80 leading-relaxed text-center">
                    Announce torrents, trade data
                  </p>
                </div>
              </Button>
            </div>
            <div className="relative h-32">
              <Button
                size="lg"
                onClick={() => onSelectRole('tracker')}
                onMouseEnter={() => setHoveredButton('tracker')}
                onMouseLeave={() => setHoveredButton(null)}
                variant="outline"
                className="h-full w-full flex-col gap-3 border-border text-foreground hover:bg-secondary transition-all duration-300 p-4"
              >
                <Server className="h-6 w-6" />
                <span className="text-sm font-semibold">Tracker</span>
                <div
                  className={`overflow-hidden transition-all duration-300 ease-in-out ${
                    hoveredButton === 'tracker'
                      ? 'max-h-20 opacity-100 mt-2'
                      : 'max-h-0 opacity-0'
                  }`}
                >
                  <p className="text-xs text-muted-foreground leading-relaxed text-center">
                    Manage users, deploy contracts
                  </p>
                </div>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
