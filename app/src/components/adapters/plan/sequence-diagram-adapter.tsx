// sequence-diagram: participants as lifelines, steps top to bottom.
import { useId } from "react"

import type { AdapterArgs } from "@/components/artifact-types"
import { normalizeSequenceSteps } from "@/lib/contract/artifact-manifest"

import { ArrowDefs, markerFor, SVG_TEXT } from "./diagram-svg"
import { estimateTextWidth } from "@/lib/diagram/label-placement"

const COL = 176
const PAD = 16
const HEAD = 52
const ROW = 42

export function renderSequenceDiagram({ node }: AdapterArgs<"sequence-diagram"> | AdapterArgs<"sequence">) {
  return <SequenceDiagram node={node} />
}

function SequenceDiagram({ node }: Pick<AdapterArgs<"sequence-diagram"> | AdapterArgs<"sequence">, "node">) {
  const { title, caption, participants } = node.props
  const keyedMessages = new Set((node.props as { key?: number[] }).key ?? [])
  const markerId = useId().replace(/:/g, "")
  const { steps } = normalizeSequenceSteps(node.props.steps)
  // Sans 15px bold heads. Lifelines sit at cumulative centres so long labels don't widen every column.
  const headW = new Map(participants.map((p) => [p.id, Math.ceil(estimateTextWidth(p.label ?? p.id, 16, { bold: true })) + (p.kind ? 22 : 0) + 8]))
  const x = new Map<string, number>()
  let cursor = PAD
  participants.forEach((p, i) => {
    const w = Math.max(headW.get(p.id)!, i === 0 ? 0 : COL - 40)
    x.set(p.id, cursor + w / 2)
    cursor += w + 40
  })
  const width = cursor - 40 + PAD
  const height = HEAD + steps.length * ROW + 16
  // `key` counts messages only, so dividers and notes never shift the numbers.
  const messageIndex = new Map<number, number>()
  steps.forEach((st, i) => {
    if (st.kind === "message") messageIndex.set(i, messageIndex.size)
  })
  const anyProposed = participants.some((p) => p.mark === "proposed" || p.mark === "added") || steps.some((s) => s.kind === "message" && (s.mark === "proposed" || s.mark === "added"))
  const label = title ?? caption

  return (
    <figure className="m-0" data-sequence-diagram="">
      {title && <div className="mb-3 font-mono text-label uppercase tracking-[0.14em] text-ink-muted">{title}</div>}
      <div className="va-scroll-fade" tabIndex={0} role="region" aria-label={`${label} (scrolls horizontally)`}>
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="block max-w-none" role="img" aria-label={caption} style={{ fontFamily: "var(--font-sans)" }}>
          <ArrowDefs id={markerId} />
          {participants.map((p) => {
            const cx = x.get(p.id)!
            const w = headW.get(p.id)!
            const proposed = p.mark === "proposed" || p.mark === "added"
            const color = proposed ? "var(--signal-new)" : "var(--ink)"
            return (
              <g key={p.id} data-participant={p.id}>
                <line x1={cx} y1={HEAD} x2={cx} y2={height - 4} stroke="var(--ink)" strokeOpacity={0.25} strokeWidth={1} strokeDasharray="2 5" />
                <g transform={`translate(${cx - w / 2} 10)`}>
                  {p.kind && (
                    <g transform="translate(0 3)" fill="none" stroke={color} strokeWidth={1.4} strokeLinecap="round">
                      {p.kind === "actor" ? <circle cx={6} cy={6} r={4.5} /> : p.kind === "store" ? <ellipse cx={6} cy={6} rx={5} ry={4} /> : p.kind === "external" ? <circle cx={6} cy={6} r={5} strokeDasharray="2.4 2.2" /> : <rect x={1} y={1} width={10} height={10} rx={2.5} />}
                    </g>
                  )}
                  <text x={p.kind ? 18 : 0} y={15} style={{ fontSize: SVG_TEXT.label }} fontWeight={600} fill={color}>
                    {p.label ?? p.id}
                  </text>
                  <line x1={0} y1={26} x2={w} y2={26} stroke={color} strokeOpacity={0.4} />
                </g>
              </g>
            )
          })}
          {steps.map((step, index) => {
            const y = HEAD + index * ROW + ROW / 2 + 6
            const key = step.kind === "message" && keyedMessages.has(messageIndex.get(index) ?? -1)
            if (step.kind === "divider") {
              return (
                <g key={index}>
                  <text x={PAD} y={y + 4} fill="var(--ink-muted)" style={{ fontSize: SVG_TEXT.tiny, textTransform: "uppercase", letterSpacing: "0.14em", fontFamily: "var(--font-mono)" }}>
                    {step.text}
                  </text>
                  <line x1={PAD + estimateTextWidth(step.text, 12, { mono: true }) + step.text.length * 1.5 + 12} y1={y} x2={width - PAD} y2={y} stroke="var(--rule)" />
                </g>
              )
            }
            if (step.kind === "note") {
              const xs = step.over.map((id) => x.get(id) ?? PAD)
              const mid = (Math.min(...xs) + Math.max(...xs)) / 2
              return (
                <g key={index}>
                  <text x={mid} y={y + 4} textAnchor="middle" style={{ fontSize: SVG_TEXT.meta }} fontStyle="italic" fill="var(--ink-muted)" stroke="var(--background)" strokeWidth={4} paintOrder="stroke" strokeLinejoin="round">
                    {step.text}
                  </text>
                </g>
              )
            }
            const x1 = x.get(step.from) ?? PAD
            const x2 = x.get(step.to) ?? PAD
            const self = step.from === step.to
            const proposed = step.mark === "proposed" || step.mark === "added"
            const stroke = key || proposed ? "var(--signal-new)" : "var(--ink)"
            const dash = proposed ? "7 5" : step.style === "reply" ? "3 4" : undefined
            const end = step.style === "lost" ? x1 + (x2 - x1) * 0.7 : x2 + (x2 > x1 ? -4 : 4)
            const path = self ? `M${x1},${y - 8} h30 v16 h-28` : `M${x1},${y} L${end},${y}`
            const tx = self ? x1 + 38 : (x1 + x2) / 2
            return (
              <g key={index} data-step={index} data-key={key ? "true" : undefined}>
                <path d={path} fill="none" stroke={stroke} strokeOpacity={key || proposed ? 1 : 0.6} strokeWidth={key ? 2 : 1.3} strokeDasharray={dash} markerEnd={step.style === "lost" ? undefined : markerFor(markerId, key ? "added" : step.mark)} />
                {step.style === "lost" && <text x={end + 2} y={y + 4} style={{ fontSize: SVG_TEXT.meta }} fill="var(--signal-risk)">✕</text>}
                <text x={tx} y={self ? y + 4 : y - 7} textAnchor={self ? "start" : "middle"} style={{ fontSize: SVG_TEXT.meta }} fontWeight={key ? 600 : 400} fill="var(--ink)" fillOpacity={0.85} stroke="var(--background)" strokeWidth={4} paintOrder="stroke" strokeLinejoin="round">
                  {key && <tspan className="sr-only">Key step: </tspan>}
                  {step.text}
                </text>
              </g>
            )
          })}
        </svg>
      </div>
      {anyProposed && (
        <ul className="mt-3 flex gap-4 text-meta text-ink-muted" aria-label="Legend">
          <li className="flex items-center gap-2">
            <svg width="26" height="8" aria-hidden="true"><line x1="0" y1="4" x2="26" y2="4" stroke="var(--signal-new)" strokeWidth="1.3" strokeDasharray="7 5" /></svg>
            proposed
          </li>
        </ul>
      )}
      <figcaption className="mt-3 max-w-[66ch] text-meta text-ink-muted">{caption}</figcaption>
    </figure>
  )
}
