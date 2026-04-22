import { motion } from "framer-motion"
import { Shield } from "lucide-react"
import type { DemoStep } from "@/lib/agent-demo-types"

interface CentralHubProps {
  currentStep: DemoStep
}

export function CentralHub({ currentStep }: CentralHubProps) {
  const isActive =
    currentStep === "transfer" ||
    currentStep === "reputation" ||
    currentStep === "proof"

  return (
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-0">
      {/* Outer rotating ring — blockchain visual */}
      <motion.div
        className="absolute inset-[-24px] rounded-full border border-dashed border-primary/15"
        animate={{ rotate: 360 }}
        transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
      />
      <motion.div
        className="absolute inset-[-16px] rounded-full border border-dashed border-primary/10"
        animate={{ rotate: -360 }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
      />

      {/* Main hub orb */}
      <motion.div
        className="w-[100px] h-[100px] rounded-full flex flex-col items-center justify-center relative overflow-hidden"
        style={{
          background: "radial-gradient(circle at 30% 30%, rgba(255,255,255,0.06), rgba(255,255,255,0.01) 70%)",
          border: "1px solid rgba(255,255,255,0.08)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          boxShadow: isActive
            ? "inset 0 0 30px rgba(34, 197, 94, 0.1), 0 0 40px rgba(34, 197, 94, 0.15), 0 4px 20px rgba(0,0,0,0.3)"
            : "inset 0 0 20px rgba(255,255,255,0.03), 0 0 15px rgba(255,255,255,0.03), 0 4px 20px rgba(0,0,0,0.3)",
        }}
        animate={
          isActive
            ? { scale: [1, 1.04, 1] }
            : { scale: 1 }
        }
        transition={
          isActive
            ? { duration: 2, repeat: Infinity, ease: "easeInOut" }
            : { duration: 0.5 }
        }
      >
        {/* Light refraction */}
        <div
          className="absolute top-[12%] left-[22%] w-[35%] h-[30%] rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(255,255,255,0.15) 0%, transparent 70%)",
          }}
        />

        {/* Shimmer */}
        <motion.div
          className="absolute inset-0"
          style={{
            background: "linear-gradient(135deg, transparent 20%, rgba(255,255,255,0.05) 45%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.05) 55%, transparent 80%)",
          }}
          animate={{ x: ["-100%", "100%"] }}
          transition={{ duration: 4, repeat: Infinity, ease: "linear", repeatDelay: 2 }}
        />

        <Shield className="h-7 w-7 text-primary/70 drop-shadow-sm" />
        <span className="text-[10px] font-bold text-foreground/80 mt-0.5">
          NT
        </span>
        <span className="text-[7px] text-muted-foreground">
          Tracker
        </span>
      </motion.div>

      {/* Active glow pulse */}
      {isActive && (
        <motion.div
          className="absolute inset-[-8px] rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(34, 197, 94, 0.08) 0%, transparent 70%)",
          }}
          animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0.8, 0.5] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        />
      )}
    </div>
  )
}
