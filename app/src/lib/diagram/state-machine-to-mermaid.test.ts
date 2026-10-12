import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { normalizeMachineEvents } from "@/lib/contract/artifact-manifest"
import { compileMachine, escapeStateText, pickMachineDirection } from "@/lib/diagram/state-machine-to-mermaid"

const events = (lines: string[]) => normalizeMachineEvents(lines).events
const states = [{ id: "a" }, { id: "b" }, { id: "c", final: true }]

describe("compileMachine", () => {
  it("emits initial marker, transitions with labels, and final markers", () => {
    const out = compileMachine({ initial: "a", states, events: events(["a -go-> b : start it", "b -end-> c"]) })
    assert.match(out.code, /^stateDiagram-v2\n {2}direction (LR|TB)\n/)
    assert.match(out.code, /\[\*\] --> s0/)
    assert.match(out.code, /s0 --> s1: start it/)
    assert.match(out.code, /s1 --> s2: end/)
    assert.match(out.code, /s2 --> \[\*\]/)
  })

  it("records which event each transition belongs to, in text order", () => {
    const out = compileMachine({ initial: "a", states, events: events(["a -go-> b", "b -end-> c"]) })
    assert.deepEqual(out.transitions, [null, 0, 1, null])
  })

  it("keeps parallel opposite edges as two separate transitions", () => {
    const out = compileMachine({ initial: "a", states, events: events(["a -go-> b", "b -back-> a", "b -end-> c"]) })
    assert.equal(out.code.match(/-->/g)?.length, 5)
  })

  it("keeps user text out of Mermaid syntax", () => {
    const out = compileMachine({
      initial: "a",
      states: [{ id: "a", label: 'x"; click a' }, { id: "b" }],
      events: events(["a -go-> b : a: <b>b</b> {c}"]),
    })
    assert.ok(!out.code.includes("<b>"))
    assert.ok(!out.code.includes('x";'))
    assert.equal(escapeStateText("a:b;c"), "a∶b,c")
  })
})

describe("pickMachineDirection", () => {
  it("is LR for short flows and TB for long chains", () => {
    assert.equal(pickMachineDirection({ initial: "a", states, events: events(["a -go-> b"]) }), "LR")
    const ids = ["a", "b", "c", "d", "e", "f"].map((id) => ({ id }))
    const chain = events(["a -x1-> b", "b -x2-> c", "c -x3-> d", "d -x4-> e", "e -x5-> f"])
    assert.equal(pickMachineDirection({ initial: "a", states: ids, events: chain }), "TB")
  })
})
