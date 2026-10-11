import { test } from "node:test"
import assert from "node:assert/strict"
import { compareLines, expandHighlight, layoutNotes, pairLines, parseUnifiedDiff, sliceTokens, splitFits, splitLines, trimExcerpt, wordRanges } from "./code-lines"

test("hunks carry actual old/new line numbers", () => {
  const rows = parseUnifiedDiff("@@ -40,2 +51,2 @@\n old\n-old()\n+new()").hunks[0].lines
  assert.deepEqual(rows.map(r=>[r.oldLine,r.newLine]), [[40,51],[41,undefined],[undefined,52]])
})
test("CRLF and trailing newline produce no phantom row", () => { assert.deepEqual(splitLines("a\r\nb\r\n"),["a","b"]); assert.equal(compareLines("a\n","b\n").length,2) })
test("equal change runs pair by index", () => { const rows=pairLines(compareLines("a\nb","c\nd")); assert.equal(rows.length,2); assert.ok(rows.every(r=>r.paired)) })
test("unequal runs pair similar lines and leave unrelated lines alone", () => {
  const rows=pairLines(compareLines("const port = 80;", "new thing\nconst port = 81;")); assert.equal(rows.filter(r=>r.paired).length,1)
  assert.equal(pairLines(compareLines("abc", "xyz\nuvw")).filter(r=>r.paired).length,0)
})
test("word ranges split across tokens without changing text", () => {
  assert.deepEqual(wordRanges("const a=1", "const a=2").new,[[8,9]])
  const result=sliceTokens([{content:"ab"},{content:"cde"}],[[1,4]])
  assert.equal(result.map(t=>t.content).join(""),"abcde"); assert.equal(result.filter(t=>t.emphasized).map(t=>t.content).join(""),"bcd")
})
test("collisions preserve anchor and push later notes with connectors", () => {
  assert.deepEqual(layoutNotes([{anchor:0,height:40},{anchor:24,height:30}]),[{anchor:0,height:40,top:0,displaced:0},{anchor:24,height:30,top:52,displaced:28}])
})
test("excerpts clamp context at both file edges", () => {
  assert.deepEqual(trimExcerpt("a\nb\nc",40,40,40),{code:"a\nb\nc",startLine:40,total:3}); assert.equal(trimExcerpt("a\nb\nc",40,42,42).startLine,40)
})
test("split fallback uses container and p90 line length", () => {
  const lines=compareLines("a","b"); assert.equal(splitFits(lines,719),false); assert.equal(splitFits(lines,720),true); assert.equal(splitFits(compareLines("a".repeat(141),"b"),1440),false)
  assert.deepEqual([...expandHighlight(["3-5"])],[3,4,5])
})
