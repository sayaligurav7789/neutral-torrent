import { useReducer, useEffect, useCallback, useRef } from "react"
import type {
  AgentId,
  AgentWithState,
  Connection,
  DemoState,
  DemoStep,
  NarrationEntry,
  Particle,
} from "@/lib/agent-demo-types"
import {
  DEMO_STEPS,
  createInitialAgents,
  getStepNarration,
} from "@/lib/agent-demo-data"

type Action =
  | { type: "ADVANCE_SUBSTEP" }
  | { type: "RESET" }
  | { type: "SET_SPEED"; speed: 1 | 2 | 4 }
  | { type: "SET_PLAYING"; playing: boolean }

function getInitialState(): DemoState {
  return {
    currentStep: "idle",
    stepIndex: -1,
    subStep: 0,
    agents: createInitialAgents(),
    connections: [],
    particles: [],
    narration: [],
    isAutoPlaying: false,
    playbackSpeed: 1,
    transferProgress: 0,
  }
}

function setAgentState(
  agents: Record<AgentId, AgentWithState>,
  id: AgentId,
  updates: Partial<AgentWithState>
): Record<AgentId, AgentWithState> {
  return {
    ...agents,
    [id]: { ...agents[id], ...updates },
  }
}

function setMultipleAgentStates(
  agents: Record<AgentId, AgentWithState>,
  ids: AgentId[],
  updates: Partial<AgentWithState>
): Record<AgentId, AgentWithState> {
  const result = { ...agents }
  for (const id of ids) {
    result[id] = { ...result[id], ...updates }
  }
  return result
}

function addNarration(
  existing: NarrationEntry[],
  step: DemoStep,
  subStep: number
): NarrationEntry[] {
  const entry = getStepNarration(step, subStep)
  if (!entry) return existing
  return [...existing, entry]
}

function applyRegistrationSubStep(state: DemoState, sub: number): DemoState {
  const agentOrder: AgentId[] = ["A", "B", "C", "D"]
  let agents = { ...state.agents }
  let connections = [...state.connections]

  if (sub < 4) {
    const id = agentOrder[sub]
    agents = setAgentState(agents, id, { state: "registering" })
    // Mark previous agents as idle
    for (let i = 0; i < sub; i++) {
      agents = setAgentState(agents, agentOrder[i], { state: "idle" })
    }
    connections.push({
      id: `hub-${id}`,
      from: id,
      to: "A", // placeholder, hub connection
      state: "drawing",
      color: agents[id].accentColor.replace("VAR", "0.4"),
    })
  } else {
    // All registered
    agents = setMultipleAgentStates(agents, agentOrder, { state: "idle" })
    connections = connections.map((c) => ({ ...c, state: "active" as const }))
  }

  return {
    ...state,
    agents,
    connections,
    narration: addNarration(state.narration, "registration", sub),
  }
}

function applyCatalogingSubStep(state: DemoState, sub: number): DemoState {
  const agentOrder: AgentId[] = ["A", "B", "C", "D"]
  let agents = { ...state.agents }

  if (sub < 4) {
    const id = agentOrder[sub]
    agents = setAgentState(agents, id, { state: "cataloging" })
    if (sub > 0) {
      agents = setAgentState(agents, agentOrder[sub - 1], { state: "idle" })
    }
  } else {
    agents = setMultipleAgentStates(agents, agentOrder, { state: "idle" })
  }

  return {
    ...state,
    agents,
    narration: addNarration(state.narration, "cataloging", sub),
  }
}

function applyDiscoverySubStep(state: DemoState, sub: number): DemoState {
  let agents = { ...state.agents }
  let connections = [...state.connections]

  if (sub === 0) {
    agents = setAgentState(agents, "A", { state: "discovering" })
  } else if (sub === 1 || sub === 2) {
    agents = setAgentState(agents, "A", { state: "discovering" })
  } else if (sub === 3) {
    agents = setAgentState(agents, "B", { state: "idle" })
    connections.push({
      id: "discovery-A-B",
      from: "A",
      to: "B",
      state: "drawing",
      label: "MATCH FOUND",
      color: "rgba(34, 197, 94, 0.6)",
    })
  } else {
    agents = setAgentState(agents, "A", { state: "idle" })
    connections = connections.map((c) =>
      c.id === "discovery-A-B" ? { ...c, state: "active" as const } : c
    )
  }

  return {
    ...state,
    agents,
    connections,
    narration: addNarration(state.narration, "discovery", sub),
  }
}

function applyProofSubStep(state: DemoState, sub: number): DemoState {
  let agents = { ...state.agents }
  let particles = [...state.particles]

  if (sub === 0) {
    agents = setAgentState(agents, "A", { state: "proving" })
    agents = setAgentState(agents, "B", { state: "proving" })
    // Challenge packet A -> B
    particles.push({
      id: "proof-challenge",
      connectionId: "discovery-A-B",
      progress: 0,
      color: "rgba(34, 197, 94, 0.8)",
    })
  } else if (sub === 1) {
    particles = particles.map((p) =>
      p.id === "proof-challenge" ? { ...p, progress: 0.5 } : p
    )
  } else if (sub === 2) {
    // Proof response B -> A
    particles = particles.filter((p) => p.id !== "proof-challenge")
    particles.push({
      id: "proof-response",
      connectionId: "discovery-A-B",
      progress: 1,
      color: "rgba(59, 130, 246, 0.8)",
    })
  } else if (sub === 3) {
    particles = particles.map((p) =>
      p.id === "proof-response" ? { ...p, progress: 0.5 } : p
    )
  } else {
    agents = setAgentState(agents, "A", { state: "idle" })
    agents = setAgentState(agents, "B", { state: "idle" })
    particles = []
  }

  return {
    ...state,
    agents,
    particles,
    narration: addNarration(state.narration, "proof", sub),
  }
}

function applyTransferSubStep(state: DemoState, sub: number): DemoState {
  let agents = { ...state.agents }
  let connections = [...state.connections]
  const particles: Particle[] = []
  let transferProgress = state.transferProgress

  if (sub === 0) {
    agents = setAgentState(agents, "B", { state: "transferring" })
    agents = setAgentState(agents, "A", { state: "receiving" })
    connections = connections.map((c) =>
      c.id === "discovery-A-B"
        ? { ...c, state: "transferring" as const }
        : c
    )
    transferProgress = 0
  } else if (sub >= 1 && sub <= 4) {
    // Pieces transferring: sub 1=piece1, 2=piece2, 3=piece3, 4=piece4
    transferProgress = sub * 25
    // Spawn particles for each piece
    for (let i = 0; i < 3; i++) {
      particles.push({
        id: `transfer-${sub}-${i}`,
        connectionId: "discovery-A-B",
        progress: 1 - i * 0.15,
        color: "rgba(59, 130, 246, 0.8)",
      })
    }
  } else if (sub === 5 || sub === 6) {
    transferProgress = 100
  } else {
    // Transfer complete
    agents = setAgentState(agents, "B", { state: "idle" })
    agents = setAgentState(agents, "A", { state: "idle" })
    connections = connections.map((c) =>
      c.id === "discovery-A-B" ? { ...c, state: "active" as const } : c
    )
    transferProgress = 100
  }

  return {
    ...state,
    agents,
    connections,
    particles,
    transferProgress,
    narration: addNarration(state.narration, "transfer", sub),
  }
}

function applyReputationSubStep(state: DemoState, sub: number): DemoState {
  let agents = { ...state.agents }

  if (sub === 0) {
    // Animating update
  } else if (sub === 1) {
    // MEDI ratio goes up
    agents = setAgentState(agents, "B", {
      uploadBytes: agents["B"].uploadBytes + 1_048_576,
      ratio: 1.5,
    })
  } else if (sub === 2) {
    // AURA ratio goes down
    agents = setAgentState(agents, "A", {
      downloadBytes: agents["A"].downloadBytes + 1_048_576,
      ratio: 0.95,
    })
  }
  // sub 3,4: confirmation narration

  return {
    ...state,
    agents,
    narration: addNarration(state.narration, "reputation", sub),
  }
}

function applyChokingSubStep(state: DemoState, sub: number): DemoState {
  let agents = { ...state.agents }
  let connections = [...state.connections]
  let particles = [...state.particles]

  if (sub === 0) {
    // VOXL requests data from SATO — draw connection
    agents = setAgentState(agents, "D", { state: "discovering" })
    connections.push({
      id: "choke-D-C",
      from: "D",
      to: "C",
      state: "drawing",
      color: "rgba(168, 85, 247, 0.4)",
    })
  } else if (sub === 1) {
    // Connection established, VOXL starts receiving
    agents = setAgentState(agents, "D", { state: "receiving" })
    agents = setAgentState(agents, "C", { state: "transferring" })
    connections = connections.map((c) =>
      c.id === "choke-D-C" ? { ...c, state: "transferring" as const } : c
    )
  } else if (sub === 2) {
    // Particles flow from SATO (C) to VOXL (D)
    particles = [
      { id: "choke-p-0", connectionId: "choke-D-C", progress: 0.8, color: "rgba(245, 158, 11, 0.8)" },
      { id: "choke-p-1", connectionId: "choke-D-C", progress: 0.5, color: "rgba(245, 158, 11, 0.8)" },
      { id: "choke-p-2", connectionId: "choke-D-C", progress: 0.2, color: "rgba(245, 158, 11, 0.8)" },
    ]
  } else if (sub === 3) {
    // VOXL downloaded but didn't seed back
    agents = setAgentState(agents, "C", { state: "idle" })
    agents = setAgentState(agents, "D", { state: "idle" })
    particles = []
    connections = connections.map((c) =>
      c.id === "choke-D-C" ? { ...c, state: "active" as const } : c
    )
  } else if (sub === 4) {
    // Ratio drops
    agents = setAgentState(agents, "D", {
      downloadBytes: agents["D"].downloadBytes + 2_147_483_648, // +2GB
      ratio: 0.04,
    })
  } else if (sub === 5) {
    // Tracker detects free-rider
  } else if (sub === 6) {
    // Connections turn red and retract
    connections = connections.map((c) =>
      c.from === "D" || c.to === "D"
        ? { ...c, state: "error" as const }
        : c
    )
  } else if (sub === 7) {
    // VOXL gets choked
    agents = setAgentState(agents, "D", { state: "choked", ratio: 0.04 })
    connections = connections.filter((c) => c.from !== "D" && c.to !== "D")
  } else {
    // Final narration — no state change
  }

  return {
    ...state,
    agents,
    connections,
    particles: sub >= 2 && sub <= 2 ? particles : sub > 2 ? [] : state.particles,
    narration: addNarration(state.narration, "choking", sub),
  }
}

function applySubStep(state: DemoState): DemoState {
  const { currentStep, subStep } = state

  switch (currentStep) {
    case "registration":
      return applyRegistrationSubStep(state, subStep)
    case "cataloging":
      return applyCatalogingSubStep(state, subStep)
    case "discovery":
      return applyDiscoverySubStep(state, subStep)
    case "proof":
      return applyProofSubStep(state, subStep)
    case "transfer":
      return applyTransferSubStep(state, subStep)
    case "reputation":
      return applyReputationSubStep(state, subStep)
    case "choking":
      return applyChokingSubStep(state, subStep)
    default:
      return state
  }
}

function reducer(state: DemoState, action: Action): DemoState {
  switch (action.type) {
    case "ADVANCE_SUBSTEP": {
      const currentStepDef = DEMO_STEPS[state.stepIndex]
      if (!currentStepDef) {
        // Start first step
        const firstStep = DEMO_STEPS[0]
        const newState: DemoState = {
          ...state,
          stepIndex: 0,
          subStep: 0,
          currentStep: firstStep.step,
        }
        return applySubStep(newState)
      }

      const nextSubStep = state.subStep + 1
      if (nextSubStep < currentStepDef.subStepCount) {
        // Advance within current step
        const newState = { ...state, subStep: nextSubStep }
        return applySubStep(newState)
      }

      // Move to next step
      const nextStepIndex = state.stepIndex + 1
      if (nextStepIndex >= DEMO_STEPS.length) {
        // Demo complete - stop auto-play
        return { ...state, isAutoPlaying: false }
      }

      const nextStepDef = DEMO_STEPS[nextStepIndex]
      const newState: DemoState = {
        ...state,
        stepIndex: nextStepIndex,
        subStep: 0,
        currentStep: nextStepDef.step,
      }
      return applySubStep(newState)
    }

    case "RESET":
      return { ...getInitialState(), playbackSpeed: state.playbackSpeed }

    case "SET_SPEED":
      return { ...state, playbackSpeed: action.speed }

    case "SET_PLAYING":
      return { ...state, isAutoPlaying: action.playing }

    default:
      return state
  }
}

export function useDemoTimeline() {
  const [state, dispatch] = useReducer(reducer, undefined, getInitialState)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  const getIntervalMs = useCallback(() => {
    const currentStepDef = DEMO_STEPS[state.stepIndex]
    if (!currentStepDef) return 800 / state.playbackSpeed
    return (currentStepDef.durationMs / currentStepDef.subStepCount) / state.playbackSpeed
  }, [state.stepIndex, state.playbackSpeed])

  // Auto-play timer
  useEffect(() => {
    if (!state.isAutoPlaying) {
      clearTimer()
      return
    }

    const ms = getIntervalMs()
    intervalRef.current = setInterval(() => {
      dispatch({ type: "ADVANCE_SUBSTEP" })
    }, ms)

    return clearTimer
  }, [state.isAutoPlaying, state.stepIndex, state.playbackSpeed, clearTimer, getIntervalMs])

  const play = useCallback(() => {
    if (state.stepIndex === -1 || (state.stepIndex >= DEMO_STEPS.length - 1 && state.subStep >= DEMO_STEPS[DEMO_STEPS.length - 1].subStepCount - 1)) {
      // Reset if at beginning or end
      dispatch({ type: "RESET" })
    }
    dispatch({ type: "SET_PLAYING", playing: true })
  }, [state.stepIndex, state.subStep])

  const pause = useCallback(() => {
    dispatch({ type: "SET_PLAYING", playing: false })
  }, [])

  const reset = useCallback(() => {
    clearTimer()
    dispatch({ type: "RESET" })
  }, [clearTimer])

  const setSpeed = useCallback((speed: 1 | 2 | 4) => {
    dispatch({ type: "SET_SPEED", speed })
  }, [])

  const isComplete = state.stepIndex >= DEMO_STEPS.length - 1 &&
    state.subStep >= (DEMO_STEPS[DEMO_STEPS.length - 1]?.subStepCount ?? 0) - 1

  return {
    state,
    play,
    pause,
    reset,
    setSpeed,
    isComplete,
  }
}
