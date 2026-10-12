// Resolves design tokens (CSS vars) to real colour strings Mermaid can parse, at render time.

function resolve(prop: "color" | "fontFamily", value: string): string {
  const probe = document.createElement("span")
  probe.style.position = "absolute"
  probe.style.visibility = "hidden"
  probe.style[prop] = value
  document.documentElement.appendChild(probe)
  const out = getComputedStyle(probe)[prop]
  probe.remove()
  return out
}

const color = (token: string) => resolve("color", `var(${token})`)

export function mermaidThemeVariables(): Record<string, string> {
  const paper = color("--paper")
  const ink = color("--ink")
  const muted = color("--ink-muted")
  const rule = color("--rule")
  const strong = color("--rule-strong")
  const fontFamily = resolve("fontFamily", "var(--font-sans)")
  return {
    background: "transparent",
    fontFamily,
    primaryColor: paper,
    primaryBorderColor: strong,
    primaryTextColor: ink,
    secondaryColor: paper,
    secondaryBorderColor: rule,
    secondaryTextColor: ink,
    tertiaryColor: paper,
    tertiaryBorderColor: rule,
    tertiaryTextColor: ink,
    mainBkg: paper,
    nodeBorder: strong,
    nodeTextColor: ink,
    textColor: ink,
    titleColor: ink,
    lineColor: muted,
    arrowheadColor: muted,
    defaultLinkColor: muted,
    edgeLabelBackground: paper,
    clusterBkg: "transparent",
    clusterBorder: rule,
    noteBkgColor: paper,
    noteBorderColor: color("--signal-wait"),
    noteTextColor: ink,
    actorBkg: paper,
    actorBorder: strong,
    actorTextColor: ink,
    actorLineColor: muted,
    signalColor: muted,
    signalTextColor: ink,
    labelBoxBkgColor: paper,
    labelBoxBorderColor: rule,
    labelTextColor: ink,
    loopTextColor: ink,
    activationBkgColor: paper,
    activationBorderColor: color("--signal-new"),
    sequenceNumberColor: paper,
    errorBkgColor: paper,
    errorTextColor: color("--signal-risk"),
  }
}

/** Natural width/height of a rendered Mermaid SVG, from its viewBox. */
export function svgNaturalSize(svg: string): { width: number; height: number } | null {
  const m = /viewBox="([-\d.\s]+)"/.exec(svg)
  if (!m) return null
  const [, , w, h] = m[1].trim().split(/\s+/).map(Number)
  return w > 0 && h > 0 ? { width: w, height: h } : null
}
