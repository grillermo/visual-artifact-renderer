import type { AdapterArgs } from "@/components/artifact-types"

export function renderQuote({ node }: AdapterArgs<"quote">) {
  const { text, from, via, date, href } = node.props
  const source = [from, via, date].filter(Boolean).join(" · ")
  return (
    <blockquote data-quote className="m-0 max-w-[52ch] border-l-[3px] border-rule-strong pl-5">
      <p className="m-0 break-words font-serif text-pull italic text-ink [text-wrap:pretty]">{text}</p>
      {source && (
        <footer className="mt-2 font-mono text-label uppercase tracking-[0.14em] text-ink-muted">
          {href ? <a href={href} rel="noreferrer noopener" className="underline underline-offset-4 hover:text-ink">{source}</a> : source}
        </footer>
      )}
    </blockquote>
  )
}
