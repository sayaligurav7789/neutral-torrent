import { motion, AnimatePresence } from "framer-motion"
import type { ConnectionState } from "@/lib/agent-demo-types"

interface ConnectionLineProps {
  fromX: number
  fromY: number
  toX: number
  toY: number
  hubX: number
  hubY: number
  state: ConnectionState
  color: string
  label?: string
}

function buildCurvePath(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  hx: number,
  hy: number
): string {
  // Quadratic bezier through a control point near the hub
  const cpx = hx + (hx - (x1 + x2) / 2) * -0.3
  const cpy = hy + (hy - (y1 + y2) / 2) * -0.3
  return `M ${x1} ${y1} Q ${cpx} ${cpy} ${x2} ${y2}`
}

export function ConnectionLine({
  fromX,
  fromY,
  toX,
  toY,
  hubX,
  hubY,
  state,
  color,
  label,
}: ConnectionLineProps) {
  const path = buildCurvePath(fromX, fromY, toX, toY, hubX, hubY)
  const midX = (fromX + toX) / 2
  const midY = (fromY + toY) / 2

  const strokeColor =
    state === "error"
      ? "rgba(239, 68, 68, 0.6)"
      : state === "transferring"
        ? "rgba(34, 197, 94, 0.6)"
        : color

  const strokeWidth = state === "transferring" ? 2.5 : 1.5

  return (
    <AnimatePresence>
      {state !== "retracting" ? (
        <g>
          <motion.path
            d={path}
            fill="none"
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            strokeDasharray={state === "error" ? "6 4" : state === "active" || state === "transferring" ? "8 4" : "none"}
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{
              pathLength: state === "drawing" ? 1 : 1,
              opacity: 1,
            }}
            exit={{ pathLength: 0, opacity: 0 }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
          />

          {/* Glow for transferring state */}
          {state === "transferring" && (
            <motion.path
              d={path}
              fill="none"
              stroke="rgba(34, 197, 94, 0.2)"
              strokeWidth={8}
              strokeDasharray="8 4"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0.3, 0.6, 0.3] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
          )}

          {/* Label rendered separately via onLabelPosition */}
        </g>
      ) : null}
    </AnimatePresence>
  )
}
