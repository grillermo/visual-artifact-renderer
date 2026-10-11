// Pure compiler: `state-machine` JSON -> Mermaid stateDiagram-v2 text. Mermaid does layout and routing.
// User text is escaped here. State ids become s<index>, so ids never reach Mermaid syntax.
import { wrapLabel } from "./map-to-mermaid"

export type MachineMark = "added" | "removed" | "changed" | "proposed" | "context"
export type MachineStateSpec = { id: string; label?: string; final?: boolean; mark?: MachineMark }
export type MachineEventSpec = { from: string; event: string; to: string; label?: string; mark?: MachineMark }
export type MachineInput = {
  initial: string
  states: readonly MachineStateSpec[]
  events: readonly MachineEventSpec[]
}

export type CompiledMachine = {
  code: string
  direction: "LR" | "TB"
  /** Original state id -> Mermaid id. */
  stateIds: ReadonlyMap<string, string>
  /** Transition order in the Mermaid text: index into `events`, or null for [*] markers. */
  transitions: readonly (number | null)[]
}

/** State and transition labels are plain text in Mermaid. Drop characters that are syntax there. */
export function escapeStateText(text: string): string {
  return text
    .replace(/[\r\n]+/g, " ")
    .replace(/"/g, "'")
    .replace(/[:;{}<>#]/g, (c) => ({ ":": "∶", ";": ",", "{": "(", "}": ")", "<": "‹", ">": "›", "#": "№" })[c] ?? c)
    .trim()
}

export function isProposed(mark: MachineMark | undefined): boolean {
  return mark === "proposed" || mark === "added"
}

export function eventText(e: MachineEventSpec): string {
  return e.label ?? e.event
}

export function pickMachineDirection(input: MachineInput): "LR" | "TB" {
  // Rank depth along the main chain decides it: long chains read better top to bottom.
  const out = new Map<string, string[]>()
  for (const e of input.events) if (e.from !== e.to) out.set(e.from, [...(out.get(e.from) ?? []), e.to])
  const depth = new Map<string, number>([[input.initial, 0]])
  const queue = [input.initial]
  while (queue.length) {
    const u = queue.shift()!
    for (const v of out.get(u) ?? []) {
      if (!depth.has(v)) {
        depth.set(v, depth.get(u)! + 1)
        queue.push(v)
      }
    }
  }
  const ranks = Math.max(...depth.values()) + 1
  return ranks > 4 ? "TB" : "LR"
}

export function compileMachine(input: MachineInput): CompiledMachine {
  const stateIds = new Map(input.states.map((s, i) => [s.id, `s${i}`]))
  const direction = pickMachineDirection(input)
  const lines = ["stateDiagram-v2", `  direction ${direction}`]
  const transitions: (number | null)[] = []
  for (const s of input.states) {
    lines.push(`  state "${escapeStateText(s.label ?? s.id)}" as ${stateIds.get(s.id)}`)
  }
  const initial = stateIds.get(input.initial)
  if (initial) {
    lines.push(`  [*] --> ${initial}`)
    transitions.push(null)
  }
  input.events.forEach((e, index) => {
    const a = stateIds.get(e.from)
    const b = stateIds.get(e.to)
    if (!a || !b) return
    lines.push(`  ${a} --> ${b}: ${wrapLabel(escapeStateText(eventText(e)), 16).join("<br/>")}`)
    transitions.push(index)
  })
  for (const s of input.states) {
    if (!s.final) continue
    lines.push(`  ${stateIds.get(s.id)} --> [*]`)
    transitions.push(null)
  }
  return { code: lines.join("\n"), direction, stateIds, transitions }
}
