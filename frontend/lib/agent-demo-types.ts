export type AgentId = "A" | "B" | "C" | "D"

export type AgentState =
  | "hidden"
  | "idle"
  | "registering"
  | "cataloging"
  | "discovering"
  | "proving"
  | "transferring"
  | "receiving"
  | "choked"

export type DemoStep =
  | "idle"
  | "registration"
  | "cataloging"
  | "discovery"
  | "proof"
  | "transfer"
  | "reputation"
  | "choking"

export interface DatasetInfo {
  name: string
  size: number
  description: string
  iconName: string
}

export interface AgentDefinition {
  id: AgentId
  name: string
  fullName: string
  specialty: string
  address: string
  accentColor: string
  accentHsl: string
  avatarType: "dashcam" | "medical" | "satellite" | "speech"
  datasets: DatasetInfo[]
  initialRatio: number
  initialUpload: number
  initialDownload: number
}

export interface AgentWithState extends AgentDefinition {
  state: AgentState
  ratio: number
  uploadBytes: number
  downloadBytes: number
}

export type ConnectionState =
  | "drawing"
  | "active"
  | "transferring"
  | "retracting"
  | "error"

export interface Connection {
  id: string
  from: AgentId
  to: AgentId
  state: ConnectionState
  label?: string
  color: string
}

export interface Particle {
  id: string
  connectionId: string
  progress: number
  color: string
}

export type NarrationType = "info" | "success" | "warning" | "error" | "highlight"

export interface NarrationEntry {
  id: string
  timestamp: number
  text: string
  type: NarrationType
  step: DemoStep
}

export interface StepDefinition {
  step: DemoStep
  label: string
  description: string
  durationMs: number
  subStepCount: number
}

export interface DemoState {
  currentStep: DemoStep
  stepIndex: number
  subStep: number
  agents: Record<AgentId, AgentWithState>
  connections: Connection[]
  particles: Particle[]
  narration: NarrationEntry[]
  isAutoPlaying: boolean
  playbackSpeed: 1 | 2 | 4
  transferProgress: number
}

export interface AgentPosition {
  x: string
  y: string
}
