import { motion } from "framer-motion"

interface DataParticleProps {
  fromX: number
  fromY: number
  toX: number
  toY: number
  hubX: number
  hubY: number
  color: string
  delay: number
  duration: number
}

function interpolateBezier(
  t: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  hx: number,
  hy: number
): { x: number; y: number } {
  const cpx = hx + (hx - (x1 + x2) / 2) * -0.3
  const cpy = hy + (hy - (y1 + y2) / 2) * -0.3
  // Quadratic bezier: B(t) = (1-t)^2*P0 + 2*(1-t)*t*CP + t^2*P1
  const mt = 1 - t
  return {
    x: mt * mt * x1 + 2 * mt * t * cpx + t * t * x2,
    y: mt * mt * y1 + 2 * mt * t * cpy + t * t * y2,
  }
}

export function DataParticle({
  fromX,
  fromY,
  toX,
  toY,
  hubX,
  hubY,
  color,
  delay,
  duration,
}: DataParticleProps) {
  // Generate waypoints along the bezier curve
  const steps = 20
  const xKeyframes: number[] = []
  const yKeyframes: number[] = []

  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const point = interpolateBezier(t, fromX, fromY, toX, toY, hubX, hubY)
    xKeyframes.push(point.x)
    yKeyframes.push(point.y)
  }

  return (
    <>
      {/* Main particle */}
      <motion.circle
        r={4}
        fill={color}
        filter="url(#particle-glow)"
        initial={{ opacity: 0, scale: 0 }}
        animate={{
          cx: xKeyframes,
          cy: yKeyframes,
          opacity: [0, 1, 1, 1, 0],
          scale: [0, 1, 1, 1, 0],
        }}
        transition={{
          duration,
          delay,
          ease: "linear",
          repeat: Infinity,
          repeatDelay: 0.2,
        }}
      />
      {/* Trail particle */}
      <motion.circle
        r={2.5}
        fill={color}
        opacity={0.4}
        initial={{ opacity: 0 }}
        animate={{
          cx: xKeyframes,
          cy: yKeyframes,
          opacity: [0, 0.4, 0.4, 0.4, 0],
        }}
        transition={{
          duration,
          delay: delay + 0.12,
          ease: "linear",
          repeat: Infinity,
          repeatDelay: 0.2,
        }}
      />
    </>
  )
}
