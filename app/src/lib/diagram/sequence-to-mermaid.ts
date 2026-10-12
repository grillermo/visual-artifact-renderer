// Pure compiler: sequence steps -> Mermaid sequenceDiagram text. Mermaid does the layout.
// Participant ids become p<i>; user text goes through escapeStateText.
import { escapeStateText } from "./state-machine-to-mermaid"

export type SeqMark = "added" | "removed" | "changed" | "proposed" | "context"
export type SeqParticipant = { id: string; label?: string; kind?: "actor" | "service" | "store" | "external"; mark?: SeqMark }
export type SeqStep =
  | { kind: "message"; from: string; to: string; text: string; style?: "call" | "reply" | "lost"; mark?: SeqMark }
  | { kind: "note"; over: string[]; text: string }
  | { kind: "divider"; text: string }
export type SeqInput = { participants: readonly SeqParticipant[]; steps: readonly SeqStep[] }

export type CompiledSequence = {
  code: string
  participantIds: ReadonlyMap<string, string>
  /** Message index (messages only, in order) -> index into `steps`. */
  messageSteps: readonly number[]
}

export function messageArrow(style: "call" | "reply" | "lost" | undefined): string {
  return style === "reply" ? "-->>" : style === "lost" ? "-x" : "->>"
}

export function compileSequence(input: SeqInput): CompiledSequence {
  const ids = new Map(input.participants.map((p, i) => [p.id, `p${i}`]))
  const lines = ["sequenceDiagram", "  autonumber"]
  for (const p of input.participants) {
    const kw = p.kind === "actor" ? "actor" : "participant"
    lines.push(`  ${kw} ${ids.get(p.id)} as ${escapeStateText(p.label ?? p.id) || p.id}`)
  }
  const first = ids.get(input.participants[0].id)!
  const last = ids.get(input.participants[input.participants.length - 1].id)!
  const messageSteps: number[] = []
  input.steps.forEach((step, index) => {
    if (step.kind === "divider") {
      lines.push(`  Note over ${first},${last}: ${escapeStateText(step.text).toUpperCase()}`)
      return
    }
    if (step.kind === "note") {
      const over = step.over.map((id) => ids.get(id)).filter((v): v is string => !!v)
      if (over.length) lines.push(`  Note over ${over.join(",")}: ${escapeStateText(step.text)}`)
      return
    }
    const a = ids.get(step.from)
    const b = ids.get(step.to)
    if (!a || !b) return
    lines.push(`  ${a}${messageArrow(step.style)}${b}: ${escapeStateText(step.text)}`)
    messageSteps.push(index)
  })
  return { code: lines.join("\n"), participantIds: ids, messageSteps }
}
