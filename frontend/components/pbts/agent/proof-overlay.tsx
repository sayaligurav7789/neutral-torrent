import { motion, AnimatePresence } from "framer-motion"
import { Check, Lock, Send } from "lucide-react"

interface ProofOverlayProps {
  visible: boolean
  subStep: number
}

export function ProofOverlay({ visible, subStep }: ProofOverlayProps) {
  const phase =
    subStep <= 1 ? "challenge" : subStep <= 2 ? "response" : "verified"

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[30%] z-30"
          initial={{ opacity: 0, scale: 0.9, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 10 }}
          transition={{ duration: 0.3 }}
        >
          <div className="rounded-xl border border-primary/20 bg-card/90 backdrop-blur-md px-4 py-3 shadow-xl min-w-[240px]">
            <div className="flex items-center gap-2 mb-2">
              <Lock className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs font-semibold text-foreground">
                Proof of Data Possession
              </span>
            </div>

            <div className="space-y-2">
              {/* Challenge */}
              <div className="flex items-center gap-2">
                <motion.div
                  className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] ${
                    phase === "challenge"
                      ? "bg-primary/20 text-primary"
                      : "bg-green-500/20 text-green-400"
                  }`}
                  animate={
                    phase === "challenge"
                      ? { scale: [1, 1.15, 1] }
                      : {}
                  }
                  transition={{ duration: 1, repeat: Infinity }}
                >
                  {phase !== "challenge" ? (
                    <Check className="h-3 w-3" />
                  ) : (
                    <Send className="h-3 w-3" />
                  )}
                </motion.div>
                <div className="flex-1">
                  <p className="text-[10px] text-foreground">
                    Merkle root challenge
                  </p>
                  <p className="text-[8px] font-mono text-muted-foreground">
                    AURA → MEDI
                  </p>
                </div>
              </div>

              {/* Response */}
              {(phase === "response" || phase === "verified") && (
                <motion.div
                  className="flex items-center gap-2"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                >
                  <motion.div
                    className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] ${
                      phase === "response"
                        ? "bg-blue-500/20 text-blue-400"
                        : "bg-green-500/20 text-green-400"
                    }`}
                    animate={
                      phase === "response"
                        ? { scale: [1, 1.15, 1] }
                        : {}
                    }
                    transition={{ duration: 1, repeat: Infinity }}
                  >
                    {phase === "verified" ? (
                      <Check className="h-3 w-3" />
                    ) : (
                      <Send className="h-3 w-3 rotate-180" />
                    )}
                  </motion.div>
                  <div className="flex-1">
                    <p className="text-[10px] text-foreground">
                      Merkle proof + piece hash
                    </p>
                    <p className="text-[8px] font-mono text-muted-foreground">
                      MEDI → AURA · 0x7f3a...b2c1
                    </p>
                  </div>
                </motion.div>
              )}

              {/* Verified */}
              {phase === "verified" && (
                <motion.div
                  className="mt-1 pt-1.5 border-t border-border"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <div className="flex items-center gap-1.5">
                    <div className="h-4 w-4 rounded-full bg-green-500/20 flex items-center justify-center">
                      <Check className="h-3 w-3 text-green-400" />
                    </div>
                    <span className="text-[10px] text-green-400 font-medium">
                      Verification PASSED
                    </span>
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
