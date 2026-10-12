import type { AdapterArgs } from "@/components/artifact-types"

export function renderLinks({ node }: AdapterArgs<"links">) {
  return (
    <p data-links className="m-0 flex flex-wrap gap-x-5 gap-y-1 text-small">
      {node.props.items.map((item, index) => (
        <a key={index} href={item.href} rel="noreferrer noopener" className="break-words text-ink underline decoration-rule-strong/30 underline-offset-4 transition-colors duration-[120ms] ease-out hover:text-brand hover:decoration-current">
          {item.label}
        </a>
      ))}
    </p>
  )
}
