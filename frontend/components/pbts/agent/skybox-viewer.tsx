import { useRef, useState, useCallback, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Loader2, Move, Eye, MapPin } from "lucide-react"
import type { SkyboxRecord } from "@/lib/skybox-types"

interface SkyboxViewerProps {
  skybox: SkyboxRecord | null
  isGenerating: boolean
  className?: string
}

export function SkyboxViewer({
  skybox,
  isGenerating,
  className = "",
}: SkyboxViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [position, setPosition] = useState({ x: 50, y: 50 })
  const [hasInteracted, setHasInteracted] = useState(false)
  const dragStart = useRef({ x: 0, y: 0, posX: 0, posY: 0 })

  const SENSITIVITY = 0.15

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      setIsDragging(true)
      setHasInteracted(true)
      dragStart.current = {
        x: e.clientX,
        y: e.clientY,
        posX: position.x,
        posY: position.y,
      }
      ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    },
    [position],
  )

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging) return
      const dx = (e.clientX - dragStart.current.x) * SENSITIVITY
      const dy = (e.clientY - dragStart.current.y) * SENSITIVITY

      setPosition({
        x: ((dragStart.current.posX - dx) % 100 + 100) % 100,
        y: Math.max(10, Math.min(90, dragStart.current.posY - dy)),
      })
    },
    [isDragging],
  )

  const handlePointerUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  // Slow ambient auto-pan when not dragging
  useEffect(() => {
    if (isDragging || !skybox?.fileUrl) return
    const interval = setInterval(() => {
      setPosition((prev) => ({
        ...prev,
        x: (prev.x + 0.02) % 100,
      }))
    }, 50)
    return () => clearInterval(interval)
  }, [isDragging, skybox?.fileUrl])

  // Reset position when skybox changes
  useEffect(() => {
    setPosition({ x: 50, y: 50 })
    setHasInteracted(false)
  }, [skybox?.id])

  // Loading state
  if (isGenerating || (skybox && skybox.status !== "complete")) {
    const statusLabel =
      skybox?.status === "processing"
        ? "Rendering environment..."
        : skybox?.status === "dispatched"
          ? "Queued for generation..."
          : "Generating spatial environment..."

    return (
      <div
        className={`relative rounded-lg border border-border bg-card/30 overflow-hidden flex items-center justify-center ${className}`}
      >
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary/60" />
          <p className="text-xs text-muted-foreground">{statusLabel}</p>
          {skybox?.prompt && (
            <p className="text-[10px] text-muted-foreground/60 max-w-[200px] text-center italic">
              &quot;{skybox.prompt.slice(0, 80)}...&quot;
            </p>
          )}
        </div>
      </div>
    )
  }

  // Empty state
  if (!skybox?.fileUrl) {
    return (
      <div
        className={`relative rounded-lg border border-dashed border-border bg-card/10 overflow-hidden flex items-center justify-center ${className}`}
      >
        <div className="flex flex-col items-center gap-2 text-muted-foreground/40">
          <Eye className="h-6 w-6" />
          <p className="text-xs">No spatial environment loaded</p>
          <p className="text-[10px]">
            Select an agent and click &quot;Generate World&quot;
          </p>
        </div>
      </div>
    )
  }

  // 360-degree panorama viewer
  return (
    <div
      ref={containerRef}
      className={`relative rounded-lg border border-border overflow-hidden select-none ${className}`}
      style={{ cursor: isDragging ? "grabbing" : "grab" }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {/* The panoramic image */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `url(${skybox.fileUrl})`,
          backgroundSize: "400% 200%",
          backgroundPosition: `${position.x}% ${position.y}%`,
          backgroundRepeat: "repeat-x",
          transition: isDragging ? "none" : "background-position 0.05s linear",
        }}
      />

      {/* Vignette overlay for depth */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.3) 100%)",
        }}
      />

      {/* Drag hint — fades after first interaction */}
      <AnimatePresence>
        {!hasInteracted && !isDragging && (
          <motion.div
            className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.7 }}
            exit={{ opacity: 0 }}
          >
            <Move className="h-3 w-3 text-white/80" />
            <span className="text-[10px] text-white/80">
              Drag to look around
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Spatial context badge */}
      {skybox.spatialContext && (
        <div className="absolute top-2 left-2 flex items-center gap-1.5 px-2 py-1 rounded-md bg-black/40 backdrop-blur-sm">
          <MapPin className="h-3 w-3 text-primary" />
          <span className="text-[10px] text-white/90 font-medium">
            {skybox.spatialContext}
          </span>
        </div>
      )}
    </div>
  )
}
