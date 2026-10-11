import { SvgDiagram } from "@/components/svg-diagram"
import { MermaidDiagram } from "@/components/mermaid/mermaid-diagram"

import { createAdapter } from "@/components/adapters/create-adapter"
import * as adapters from "@/components/adapters"

import type { ArtifactNode } from "@/lib/contract/artifact-schema"
import type { AdapterArgs, RegistryAdapter } from "@/components/artifact-types"

export type { ArtifactRenderContext, RenderNodes, AdapterArgs } from "@/components/artifact-types"

function renderSvgDiagram({ node }: AdapterArgs<"svg-diagram">) {
  return <SvgDiagram {...node.props} />
}

function renderMermaid({ node }: AdapterArgs<"mermaid">) {
  return <MermaidDiagram {...node.props} />
}

export const componentRegistry = {
  "file-tree": createAdapter(adapters.renderFileTree),
  image: createAdapter(adapters.renderImage),
  table: createAdapter(adapters.renderEditorialTable),
  mermaid: createAdapter(renderMermaid),
  "svg-diagram": createAdapter(renderSvgDiagram),
  timeline: createAdapter(adapters.renderEditorialTimeline),
  "execution-trace": createAdapter(adapters.renderExecutionTrace),
  prose: createAdapter(adapters.renderProse),
  "claim-tree": createAdapter(adapters.renderClaimTree),
  claim: createAdapter(adapters.renderClaim),
  walkthrough: createAdapter(adapters.renderWalkthrough),
  "state-machine": createAdapter(adapters.renderStateMachine),
  mockup: createAdapter(adapters.renderMockup),
  wireframe: createAdapter(adapters.renderWireframe),
  decision: createAdapter(adapters.renderDecision),
  code: createAdapter(adapters.renderCode),
  sequence: createAdapter(adapters.renderSequence),
  chapter: createAdapter(adapters.renderChapter),
  columns: createAdapter(adapters.renderColumns),
  callout: createAdapter(adapters.renderCallout),
  details: createAdapter(adapters.renderDetails),
  ledger: createAdapter(adapters.renderLedger),
  checklist: createAdapter(adapters.renderChecklist),
  figures: createAdapter(adapters.renderFigures),
  steps: createAdapter(adapters.renderSteps),
  map: createAdapter(adapters.renderMap),
  story: createAdapter(adapters.renderStory),
  compare: createAdapter(adapters.renderCompare),
  trend: createAdapter(adapters.renderTrend),
  links: createAdapter(adapters.renderLinks),
  quote: createAdapter(adapters.renderQuote),
} satisfies Record<ArtifactNode["type"], RegistryAdapter>
