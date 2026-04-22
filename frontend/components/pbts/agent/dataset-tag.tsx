import { motion } from "framer-motion"
import { Badge } from "@/components/ui/badge"
import { formatBytes } from "@/lib/pbts-types"
import type { DatasetInfo } from "@/lib/agent-demo-types"
import {
  Camera,
  HeartPulse,
  Globe,
  Languages,
} from "lucide-react"

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Camera,
  HeartPulse,
  Globe,
  Languages,
}

interface DatasetTagProps {
  dataset: DatasetInfo
  visible: boolean
}

export function DatasetTag({ dataset, visible }: DatasetTagProps) {
  const Icon = ICON_MAP[dataset.iconName]

  if (!visible) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 6, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      <Badge
        variant="outline"
        className="text-[9px] px-1.5 py-0.5 border-primary/20 bg-card/80 backdrop-blur-sm whitespace-nowrap"
      >
        {Icon && <Icon className="h-2.5 w-2.5 mr-1" />}
        {formatBytes(dataset.size)}
      </Badge>
    </motion.div>
  )
}
