import { diffLines, diffWordsWithSpace } from "diff"

export type DiffLineType = "context" | "remove" | "add"
export type DiffLine = { type: "context" | "remove" | "add"; value: string; oldLine?: number; newLine?: number; words?: Range[] }
export type Range = readonly [number, number]
export type Hunk = { oldStart: number; oldLines: number; newStart: number; newLines: number; header?: string; lines: DiffLine[] }
export type DiffFile = { oldPath: string; newPath: string; hunks: Hunk[] }
export type Token = { content: string; color?: string; fontStyle?: number }
export const splitLines = (text: string) => text.replace(/\r\n/g, "\n").replace(/\n$/, "").split("\n")
export function parseUnifiedDiff(content: string): DiffFile {
  let oldPath = "", newPath = "", oldLine = 1, newLine = 1
  const hunks: Hunk[] = []
  let hunk: Hunk | undefined
  for (const raw of splitLines(content)) {
    const match = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@(.*)$/.exec(raw)
    if (match) {
      oldLine = Number(match[1]); newLine = Number(match[3])
      hunk = { oldStart: oldLine, oldLines: Number(match[2] ?? 1), newStart: newLine, newLines: Number(match[4] ?? 1), header: match[5].trim(), lines: [] }
      hunks.push(hunk); continue
    }
    if (raw.startsWith("--- ")) { oldPath = raw.slice(4).split("\t")[0]; continue }
    if (raw.startsWith("+++ ")) { newPath = raw.slice(4).split("\t")[0]; continue }
    if (raw.startsWith("diff --git") || raw.startsWith("index ") || raw.startsWith("\\ No newline")) continue
    if (!hunk) { hunk = { oldStart: 1, oldLines: 0, newStart: 1, newLines: 0, lines: [] }; hunks.push(hunk) }
    const type = raw.startsWith("+") ? "add" : raw.startsWith("-") ? "remove" : "context"
    hunk.lines.push({ type, value: /^[+ -]/.test(raw) ? raw.slice(1) : raw, oldLine: type === "add" ? undefined : oldLine++, newLine: type === "remove" ? undefined : newLine++ })
  }
  return { oldPath, newPath, hunks }
}
export function compareLines(before: string, after: string, start = 1): DiffLine[] {
  let oldLine = start, newLine = start
  return diffLines(before.replace(/\r\n/g, "\n"), after.replace(/\r\n/g, "\n")).flatMap(part => splitLines(part.value).map(value => ({
    type: part.added ? "add" as const : part.removed ? "remove" as const : "context" as const,
    value, oldLine: part.added ? undefined : oldLine++, newLine: part.removed ? undefined : newLine++,
  })))
}
export function wordRanges(old: string, next: string): { old: Range[]; new: Range[] } {
  const ranges: { old: Range[]; new: Range[] } = { old: [], new: [] }
  let a = 0, b = 0
  for (const part of diffWordsWithSpace(old, next)) {
    const length = part.value.length
    if (part.removed) { ranges.old.push([a, a + length]); a += length }
    else if (part.added) { ranges.new.push([b, b + length]); b += length }
    else { a += length; b += length }
  }
  return ranges
}
export function sliceTokens(tokens: readonly Token[], ranges: readonly Range[]) {
  let offset = 0
  return tokens.flatMap(token => {
    const start = offset, end = start + token.content.length
    offset = end
    const cuts = [...new Set([start, end, ...ranges.flatMap(([a, b]) => [a, b]).filter(n => n > start && n < end)])].sort((a,b) => a-b)
    return cuts.slice(0,-1).map((n,i) => ({ ...token, content: token.content.slice(n-start, cuts[i+1]-start), emphasized: ranges.some(([a,b]) => n >= a && n < b) }))
  })
}
function similarity(a: string, b: string) {
  const shared = diffWordsWithSpace(a,b).filter(p => !p.added && !p.removed).reduce((n,p) => n+p.value.length,0)
  return 2*shared/Math.max(1,a.length+b.length)
}
export type SplitRow = { old?: DiffLine; new?: DiffLine; paired?: boolean }
export function pairLines(input: readonly DiffLine[]): SplitRow[] {
  const out: SplitRow[] = []
  let i = 0
  while (i < input.length) {
    if (input[i].type === "context") { out.push({ old: input[i], new: input[i] }); i++; continue }
    const old: DiffLine[] = [], next: DiffLine[] = []
    while (i < input.length && input[i].type !== "context") {
      const row = { ...input[i++] }
      if (row.type === "remove") old.push(row); else next.push(row)
    }
    const matches = new Map<number,number>(), used = new Set<number>()
    old.forEach((row,a) => {
      if (old.length === next.length) { matches.set(a,a); used.add(a); return }
      let best = -1, score = .4
      next.forEach((candidate,b) => { const s = similarity(row.value,candidate.value); if (!used.has(b) && s >= score) { score=s; best=b } })
      if (best >= 0) { matches.set(a,best); used.add(best) }
    })
    let cursor = 0
    old.forEach((row,a) => {
      const b = matches.get(a)
      if (b === undefined || b < cursor) { out.push({ old: row }); return }
      while (cursor < b) { if (!used.has(cursor)) out.push({ new: next[cursor] }); cursor++ }
      const added = next[b], words = wordRanges(row.value,added.value)
      out.push({ old: { ...row, words: words.old }, new: { ...added, words: words.new }, paired: true }); cursor=b+1
    })
    while (cursor < next.length) out.push({ new: next[cursor++] })
  }
  return out
}
export function layoutNotes(notes: readonly { anchor: number; height: number }[], gap = 12) {
  let bottom = -gap
  return notes.map(note => { const top = Math.max(note.anchor,bottom+gap); bottom=top+note.height; return { ...note, top, displaced: top-note.anchor } })
}
export function trimExcerpt(code: string, startLine: number, first: number, last: number, context = 3) {
  const lines = splitLines(code), from = Math.max(0,first-startLine-context), to = Math.min(lines.length,last-startLine+context+1)
  return { code: lines.slice(from,to).join("\n"), startLine: startLine+from, total: lines.length }
}
export function splitFits(lines: readonly DiffLine[], width: number) {
  const lengths = lines.map(l => l.value.length).sort((a,b) => a-b)
  return width >= 720 && (lengths[Math.max(0,Math.ceil(lengths.length*.9)-1)] ?? 0) <= 70
}
export function expandHighlight(entries: readonly (number | string)[] = []) {
  const out = new Set<number>()
  for (const entry of entries) { const [a,b] = typeof entry === "number" ? [entry,entry] : entry.split("-").map(Number); for (let n=a;n<=b;n++) out.add(n) }
  return out
}
