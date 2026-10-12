import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { normalizeSequenceSteps } from "@/lib/contract/artifact-manifest"
import { compileSequence } from "@/lib/diagram/sequence-to-mermaid"

const participants = [{ id: "u", label: "User", kind: "actor" as const }, { id: "api" }, { id: "db", kind: "store" as const }]

describe("compileSequence", () => {
  it("emits participants, arrows by style, notes and dividers", () => {
    const { steps } = normalizeSequenceSteps(["u -> api : call", "api --> u : reply", "api -x-> db : lost", "note over u, api: hi", "--- phase two ---"])
    const out = compileSequence({ participants, steps })
    assert.match(out.code, /^sequenceDiagram\n {2}autonumber\n {2}actor p0 as User\n {2}participant p1 as api/)
    assert.match(out.code, /p0->>p1: call/)
    assert.match(out.code, /p1-->>p0: reply/)
    assert.match(out.code, /p1-xp2: lost/)
    assert.match(out.code, /Note over p0,p1: hi/)
    assert.match(out.code, /Note over p0,p2: PHASE TWO/)
  })

  it("counts messages only for messageSteps", () => {
    const { steps } = normalizeSequenceSteps(["--- a", "u -> api : x", "note over u: n", "api -> db : y"])
    assert.deepEqual(compileSequence({ participants, steps }).messageSteps, [1, 3])
  })

  it("keeps user text out of Mermaid syntax", () => {
    const out = compileSequence({ participants, steps: [{ kind: "message", from: "u", to: "api", text: "a; b <i>c</i> #d" }] })
    const text = out.code.split("\n").at(-1)!.split(": ")[1]
    assert.ok(!/[<>#;]/.test(text))
  })

  it("emits a note and a divider that Mermaid can parse", () => {
    const { steps } = normalizeSequenceSteps(["u -> api : a", "--- phase two ---", "note over u, api: waits", "api --> u : b"])
    const { code } = compileSequence({ participants, steps })
    assert.ok(code.includes("Note over p0,p2: PHASE TWO"))
    assert.ok(code.includes("Note over p0,p1: waits"))
  })
})
