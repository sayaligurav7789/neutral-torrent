import { motion } from "framer-motion"
import {
  Camera,
  HeartPulse,
  Globe,
  Languages,
} from "lucide-react"
import type { AgentState } from "@/lib/agent-demo-types"

const AVATAR_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  dashcam: Camera,
  medical: HeartPulse,
  satellite: Globe,
  speech: Languages,
}

interface AgentAvatarProps {
  avatarType: "dashcam" | "medical" | "satellite" | "speech"
  accentHsl: string
  state: AgentState
}

export function AgentAvatar({ avatarType, accentHsl, state }: AgentAvatarProps) {
  const Icon = AVATAR_ICONS[avatarType]
  const isActive = state !== "hidden" && state !== "idle"
  const isChoked = state === "choked"

  return (
    <div className="relative w-20 h-20 mx-auto">
      {/* Outer glow ring */}
      <motion.div
        className="absolute inset-[-6px] rounded-full"
        style={{
          background: `radial-gradient(circle, hsla(${accentHsl} / 0.15) 0%, transparent 70%)`,
        }}
        animate={
          isActive && !isChoked
            ? { scale: [1, 1.15, 1], opacity: [0.5, 1, 0.5] }
            : isChoked
              ? { scale: 1, opacity: 0.2 }
              : { scale: 1, opacity: 0.3 }
        }
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Main orb */}
      <motion.div
        className="relative w-20 h-20 rounded-full overflow-hidden"
        style={{
          background: `radial-gradient(circle at 30% 30%, hsla(${accentHsl} / 0.35), hsla(${accentHsl} / 0.08) 70%)`,
          border: `1px solid hsla(${accentHsl} / 0.2)`,
          boxShadow: isChoked
            ? `inset 0 0 20px rgba(239, 68, 68, 0.3), 0 0 20px rgba(239, 68, 68, 0.15)`
            : `inset 0 0 20px hsla(${accentHsl} / 0.12), 0 0 ${isActive ? "30px" : "15px"} hsla(${accentHsl} / ${isActive ? "0.25" : "0.1"}), 0 4px 16px rgba(0, 0, 0, 0.3)`,
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
        }}
        animate={
          isChoked
            ? { scale: 0.9, filter: "grayscale(0.7) brightness(0.6)" }
            : state === "idle"
              ? { scale: [1, 1.02, 1], filter: "grayscale(0) brightness(1)" }
              : { scale: 1, filter: "grayscale(0) brightness(1)" }
        }
        transition={
          state === "idle"
            ? { duration: 3, repeat: Infinity, ease: "easeInOut" }
            : { duration: 0.5 }
        }
      >
        {/* Light refraction spot */}
        <div
          className="absolute top-[15%] left-[25%] w-[40%] h-[35%] rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(255,255,255,0.25) 0%, transparent 70%)",
          }}
        />

        {/* Holographic shimmer */}
        <motion.div
          className="absolute inset-0"
          style={{
            background: "linear-gradient(135deg, transparent 20%, rgba(255,255,255,0.08) 45%, rgba(255,255,255,0.12) 50%, rgba(255,255,255,0.08) 55%, transparent 80%)",
          }}
          animate={{ x: ["-100%", "100%"] }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear", repeatDelay: 1 }}
        />

        {/* Icon */}
        <div className="absolute inset-0 flex items-center justify-center">
          {Icon && (
            <Icon
              className={`h-7 w-7 drop-shadow-md ${
                isChoked ? "text-red-400/60" : "text-white/80"
              }`}
            />
          )}
        </div>

        {/* Choked X overlay */}
        {isChoked && (
          <motion.div
            className="absolute inset-0 flex items-center justify-center"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
          >
            <div className="w-12 h-12 relative">
              <div className="absolute inset-0 rotate-45 flex items-center justify-center">
                <div className="w-full h-0.5 bg-red-500/80 rounded" />
              </div>
              <div className="absolute inset-0 -rotate-45 flex items-center justify-center">
                <div className="w-full h-0.5 bg-red-500/80 rounded" />
              </div>
            </div>
          </motion.div>
        )}
      </motion.div>

      {/* Radar sweep for discovering state */}
      {state === "discovering" && (
        <motion.div
          className="absolute inset-[-4px] rounded-full"
          style={{
            border: `2px solid hsla(${accentHsl} / 0.4)`,
          }}
          animate={{ scale: [1, 1.8], opacity: [0.6, 0] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut" }}
        />
      )}

      {/* Spinning ring for registering */}
      {state === "registering" && (
        <motion.div
          className="absolute inset-[-4px] rounded-full"
          style={{
            border: `2px dashed hsla(${accentHsl} / 0.4)`,
          }}
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        />
      )}
    </div>
  )
}
