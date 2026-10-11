"use client"
import type { AdapterArgs } from "@/components/artifact-types"
import { CodeView } from "@/components/ui/code/code-view"
import { trimExcerpt } from "@/lib/code-lines"
export function renderWalkthrough({ node }: AdapterArgs<"walkthrough">) {
  return <section aria-label={node.props.title ?? "Code walkthrough"}>{node.props.steps.map((step,i)=>{
    const file=node.props.files.find(file=>file.path===(step.file??node.props.files[0].path))!
    const [first,last=first]=step.lines.split("-").map(Number)
    const excerpt=trimExcerpt(file.code??file.after??"",file.startLine??1,first,last)
    return <section key={i}><h3>{i+1}. {step.title}</h3>{step.body && <p>{step.body}</p>}<CodeView {...excerpt} language={file.language} title={file.path} highlight={[step.lines]} /></section>
  })}</section>
}
