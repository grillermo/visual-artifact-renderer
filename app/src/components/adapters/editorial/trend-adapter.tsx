"use client"

import { Bar, BarChart, CartesianGrid, Line, LineChart, ReferenceLine, XAxis, YAxis } from "recharts"

import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { formatCell, getRows, MissingData } from "@/lib/artifacts/data"
import type { AdapterArgs } from "@/components/artifact-types"

const SERIES_COLOURS = ["var(--ink)", "var(--brand)", "var(--signal-wait)"] as const

type EndLabelProps = { x?: number | string; y?: number | string; index?: number }

export function renderTrend({ node, context }: AdapterArgs<"trend">) {
  const { dataKey, x, y, kind = "line", caption, mark } = node.props
  const rows = getRows(context.data, dataKey)
  if (!rows.length) return <MissingData dataKey={dataKey} />

  const series = Array.isArray(y) ? y : [y]
  const data = rows.map((row) => ({ ...row, [x]: formatCell(row[x]) }))
  const config = Object.fromEntries(
    series.map((key, index) => [key, { label: key, color: SERIES_COLOURS[index] }])
  ) satisfies ChartConfig
  const lastIndex = data.length - 1
  const axis = { tickLine: false, axisLine: false, fontSize: 13, stroke: "var(--ink-muted)" } as const
  const right = kind === "line" ? 110 : 8
  const common = { accessibilityLayer: true, data, margin: { top: 16, right, bottom: 0, left: 0 } }
  const grid = <CartesianGrid vertical={false} stroke="var(--rule)" />
  const marks = (mark ?? []).map((m, index) => (
    <ReferenceLine
      key={index}
      x={formatCell(m.x)}
      stroke="var(--ink-muted)"
      strokeDasharray="2 3"
      label={{ value: m.label, position: "insideTopLeft", fontSize: 12, fill: "var(--ink-muted)" }}
    />
  ))

  return (
    <figure className="flex flex-col gap-3" data-trend>
      <ChartContainer config={config} className="aspect-auto h-[300px] w-full">
        {kind === "bar" ? (
          <BarChart {...common}>
            {grid}
            <XAxis dataKey={x} {...axis} tickMargin={10} />
            <YAxis {...axis} width={44} />
            <ChartTooltip content={<ChartTooltipContent />} />
            {marks}
            {series.map((key, index) => (
              <Bar key={key} dataKey={key} fill={SERIES_COLOURS[index]} radius={0} isAnimationActive={false} />
            ))}
          </BarChart>
        ) : (
          <LineChart {...common}>
            {grid}
            <XAxis dataKey={x} {...axis} tickMargin={10} />
            <YAxis {...axis} width={44} />
            <ChartTooltip content={<ChartTooltipContent />} />
            {marks}
            {series.map((key, index) => (
              <Line
                key={key}
                dataKey={key}
                type="monotone"
                stroke={SERIES_COLOURS[index]}
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
                label={(props: EndLabelProps) =>
                  props.index === lastIndex ? (
                    <text
                      key={`${key}-end`}
                      x={Number(props.x ?? 0) + 8}
                      y={Number(props.y ?? 0) + 4}
                      fontSize={13}
                      fill={SERIES_COLOURS[index]}
                    >
                      {key}
                    </text>
                  ) : (
                    <g key={`${key}-${props.index}`} />
                  )
                }
              />
            ))}
          </LineChart>
        )}
      </ChartContainer>
      <figcaption className="max-w-[66ch] text-meta text-ink-muted">{caption}</figcaption>
    </figure>
  )
}
