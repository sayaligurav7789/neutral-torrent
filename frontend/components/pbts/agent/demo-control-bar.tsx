import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Play, Pause, RotateCcw } from "lucide-react"
import { DEMO_STEPS } from "@/lib/agent-demo-data"

interface DemoControlBarProps {
  stepIndex: number
  isAutoPlaying: boolean
  playbackSpeed: 1 | 2 | 4
  isComplete: boolean
  onPlay: () => void
  onPause: () => void
  onReset: () => void
  onSpeedChange: (speed: 1 | 2 | 4) => void
}

export function DemoControlBar({
  stepIndex,
  isAutoPlaying,
  playbackSpeed,
  isComplete,
  onPlay,
  onPause,
  onReset,
  onSpeedChange,
}: DemoControlBarProps) {
  const currentStepDef = DEMO_STEPS[stepIndex]

  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-border bg-card/50 backdrop-blur-sm px-4 py-2.5">
      {/* Step progress */}
      <div className="flex items-center gap-3">
        {/* Step pills */}
        <div className="flex items-center gap-1">
          {DEMO_STEPS.map((s, i) => (
            <div
              key={s.step}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i < stepIndex
                  ? "w-5 bg-green-500"
                  : i === stepIndex
                    ? "w-7 bg-primary"
                    : "w-3 bg-secondary"
              }`}
            />
          ))}
        </div>

        {/* Step label */}
        <div className="hidden sm:block">
          {stepIndex >= 0 && currentStepDef ? (
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-[10px] px-2 py-0">
                {stepIndex + 1}/{DEMO_STEPS.length}
              </Badge>
              <span className="text-xs text-foreground font-medium">
                {currentStepDef.label}
              </span>
              <span className="text-[10px] text-muted-foreground hidden md:inline">
                — {currentStepDef.description}
              </span>
            </div>
          ) : isComplete ? (
            <span className="text-xs text-green-400 font-medium">
              Demo complete
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">
              Ready to play
            </span>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2">
        {/* Speed buttons */}
        <div className="flex items-center gap-0.5 rounded-md border border-border p-0.5">
          {([1, 2, 4] as const).map((speed) => (
            <button
              key={speed}
              onClick={() => onSpeedChange(speed)}
              className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                playbackSpeed === speed
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {speed}x
            </button>
          ))}
        </div>

        {/* Play/Pause */}
        <Button
          variant="outline"
          size="sm"
          onClick={isAutoPlaying ? onPause : onPlay}
          className="h-8 w-8 p-0"
        >
          {isAutoPlaying ? (
            <Pause className="h-3.5 w-3.5" />
          ) : (
            <Play className="h-3.5 w-3.5" />
          )}
        </Button>

        {/* Reset */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onReset}
          className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  )
}
