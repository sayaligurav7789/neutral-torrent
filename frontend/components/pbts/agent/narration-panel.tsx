import { useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"

import type { NarrationEntry } from "@/lib/agent-demo-types"

const TYPE_COLORS: Record<NarrationEntry["type"], string> = {
  info: "bg-blue-400",
  success: "bg-green-400",
  warning: "bg-amber-400",
  error: "bg-red-400",
  highlight: "bg-purple-400",
}

interface NarrationPanelProps {
  entries: NarrationEntry[]
}

export function NarrationPanel({ entries }: NarrationPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  return (
    <div className="border border-border rounded-lg bg-card/50 backdrop-blur-sm h-full flex flex-col overflow-hidden">
      <div className="px-4 py-2 border-b border-border shrink-0">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Activity Log
        </p>
      </div>
      <div className="flex-1 overflow-y-auto min-h-0" ref={scrollRef}>
        <div className="px-4 py-2 space-y-1.5">
          <AnimatePresence mode="popLayout">
            {entries.map((entry) => (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="flex items-start gap-2 text-xs"
              >
                <span
                  className={`mt-1.5 h-1.5 w-1.5 rounded-full shrink-0 ${TYPE_COLORS[entry.type]}`}
                />
                <span
                  className={`leading-relaxed ${
                    entry.type === "highlight"
                      ? "text-foreground font-medium"
                      : entry.type === "error"
                        ? "text-red-400"
                        : entry.type === "warning"
                          ? "text-amber-400"
                          : entry.type === "success"
                            ? "text-green-400"
                            : "text-muted-foreground"
                  }`}
                >
                  {entry.text}
                </span>
              </motion.div>
            ))}
          </AnimatePresence>
          {entries.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-6">
              Press Play to start the demo
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
