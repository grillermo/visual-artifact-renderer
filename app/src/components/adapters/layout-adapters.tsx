"use client"

import type { CSSProperties } from "react"

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Figure, PanelCard, columnsClass, tonePanelClass } from "@/components/artifact-primitives"
import { cn } from "@/lib/utils"
import { StatusChip, statusIsVisible } from "@/lib/artifacts/status"

import type { AdapterArgs } from "@/components/artifact-types"
import type { ArtifactFlowItem } from "@/lib/contract/artifact-schema"

export function renderCard({ node, children }: AdapterArgs<"card">) {
  // Legacy: a card is a bare group with a hairline above it. No surface, no nested border.
  const props = node.props ?? {}

  return (
    <div className={cn("flex min-w-0 flex-col gap-4 border-t border-rule pt-5", tonePanelClass(props.tone))}>
      {(props.title || props.description) && (
        <div className="flex flex-col gap-1">
          {props.title && (
            <h3 className="break-words font-serif text-row-title font-medium text-ink">{props.title}</h3>
          )}
          {props.description && <p className="break-words text-small text-ink-muted">{props.description}</p>}
        </div>
      )}
      {children && <div className="flex flex-col gap-4 text-small">{children}</div>}
    </div>
  )
}

export function renderGrid({ node, children }: AdapterArgs<"grid">) {
  const columns = node.props?.columns ?? 2

  return <div className={cn("grid gap-x-8 gap-y-8", columnsClass(columns))}>{children}</div>
}

export function renderSection({ node, context, renderNodes, nodePath }: AdapterArgs<"section">) {
  const props = node.props ?? {}
  const sectionTitle = props.title?.trim()
  const childNodes = node.children ?? []

  // Drop a leading heading that just repeats the section title — the section
  // already renders its own h2, so the duplicated heading only adds noise.
  const firstChild = childNodes[0]
  const filteredChildren =
    sectionTitle &&
    firstChild?.type === "heading" &&
    firstChild.props.text.trim().toLowerCase() === sectionTitle.toLowerCase()
      ? childNodes.slice(1)
      : childNodes

  return (
    <section className="flex scroll-mt-8 flex-col gap-6 border-t border-rule-strong pt-10 first:border-t-0 first:pt-0">
      {(props.title || props.description) && (
        <div className="flex flex-col gap-3">
          {props.title && (
            <h2 className="max-w-[24ch] break-words font-serif text-chapter font-medium tracking-[-0.02em] text-ink [text-wrap:balance]">
              {props.title}
            </h2>
          )}
          {props.description && (
            <p className="max-w-[52ch] break-words text-deck text-ink-muted [text-wrap:pretty]">{props.description}</p>
          )}
        </div>
      )}
      <div className="flex flex-col gap-8">
        {renderNodes(filteredChildren, context, `${nodePath}.children`)}
      </div>
    </section>
  )
}

export function renderTabs({ node, context, renderNodes, nodePath }: AdapterArgs<"tabs">) {
  const defaultValue = node.props.defaultValue ?? node.props.items[0]?.value

  return (
    <Tabs defaultValue={defaultValue}>
      <TabsList>
        {node.props.items.map((item) => (
          <TabsTrigger key={item.value} value={item.value}>
            {item.label}
          </TabsTrigger>
        ))}
      </TabsList>
      {node.props.items.map((item, index) => (
        <TabsContent key={item.value} value={item.value} className="flex flex-col gap-5 pt-1">
          {renderNodes(item.nodes, context, `${nodePath}.props.items.${index}.nodes`)}
        </TabsContent>
      ))}
    </Tabs>
  )
}

export function renderAccordion({ node, context, renderNodes, nodePath }: AdapterArgs<"accordion">) {
  return (
    <Accordion>
      {node.props.items.map((item, index) => (
        <AccordionItem key={item.title} value={`item-${index}`}>
          <AccordionTrigger>{item.title}</AccordionTrigger>
          <AccordionContent>
            <div className="flex flex-col gap-4">{renderNodes(item.nodes, context, `${nodePath}.props.items.${index}.nodes`)}</div>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  )
}

export function renderFlow({ node }: AdapterArgs<"flow">) {
  const { title, caption, items } = node.props

  return (
    <Figure title={title} caption={caption}>
      <div
        className="grid gap-3 lg:grid-cols-[repeat(var(--flow-columns),minmax(0,1fr))]"
        style={{ "--flow-columns": items.length } as CSSProperties}
      >
        {items.map((item, index) => (
          <FlowStep key={`${item.title}-${index}`} item={item} index={index} />
        ))}
      </div>
    </Figure>
  )
}

function FlowStep({ item, index }: { item: ArtifactFlowItem; index: number }) {
  const description = item.description

  return (
    <div className="relative">
      <PanelCard tone={item.status}>
        <div className="flex items-start justify-between gap-3">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full border bg-card font-mono text-xs font-medium text-muted-foreground">
            {index + 1}
          </span>
          {statusIsVisible(item.status, description) && (
            <StatusChip value={item.status} className="max-w-[50%] justify-start" />
          )}
        </div>
        {item.label && (
          <p className="mt-3 break-words font-mono text-[10px] uppercase tracking-[0.14em] text-clay-dark">
            {item.label}
          </p>
        )}
        <p className="mt-1 break-words font-serif text-lg font-medium leading-snug tracking-[-0.015em] text-foreground">
          {item.title}
        </p>
        {description && (
          <p className="mt-2 break-words text-sm leading-6 text-muted-foreground">{description}</p>
        )}
      </PanelCard>
    </div>
  )
}
