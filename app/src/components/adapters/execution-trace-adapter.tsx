"use client"
import { useMemo, useState } from "react"
import { ArrowLeft, ArrowRight, Info } from "lucide-react"
import type { AdapterArgs } from "@/components/artifact-types"
import type { ExecutionTraceEvent, ExecutionTraceTypeDefinition, ExecutionTraceTypedValue } from "@/lib/contract/artifact-schema"
import { CodeView } from "@/components/ui/code/code-view"
import { useContainerWidth } from "@/components/ui/code/use-container-width"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { traceDepths } from "@/lib/trace-depth"
import { splitLines, trimExcerpt } from "@/lib/code-lines"
export function renderExecutionTrace({node}:AdapterArgs<"execution-trace">){return <ExecutionTrace {...node.props}/>}
const glyph:Record<string,string>={call:"ƒ",return:"⇠",throw:"✕",boundary:"⇄",note:"·"}
export function ExecutionTrace({title,caption,provenance,events,typeDefinitions=[],initialEventId,showCallStack=true}:Extract<AdapterArgs<"execution-trace">["node"],{type:"execution-trace"}>["props"]){
  const ordered=useMemo(()=>[...events].sort((a,b)=>a.order-b.order),[events]),depths=traceDepths(ordered)
  const [selection,setSelected]=useState(()=>Math.max(0,ordered.findIndex(e=>e.id===initialEventId)))
  const {ref,width}=useContainerWidth<HTMLElement>(),wide=width>=960,selected=Math.min(selection,ordered.length-1),event=ordered[selected]
  const move=(direction:number)=>setSelected(current=>Math.max(0,Math.min(ordered.length-1,Math.min(current,ordered.length-1)+direction)))
  if(!event) return null
  const evidenceNote={captured:"Captured from runtime.",inferred:"Based on reviewed source; values may be examples.",mixed:"Captured and source-inferred evidence; check each event.",simulated:"Illustrative values, not a runtime recording."}[provenance.mode]
  const stack=<ol aria-label="Call stack" className="va-trace-frames" data-long={ordered.length>14||undefined}>{ordered.map((frame,i)=><li key={frame.id}><button type="button" className="va-trace-frame" aria-current={selected===i?"step":undefined} onClick={()=>setSelected(i)}>
    <span className="va-trace-order">{i+1}</span><span className="va-depth-guides" aria-hidden="true">{Array.from({length:Math.min(6,depths[i])},(_,d)=><i key={d}/>)}</span>
    <span className="va-trace-frame-content"><span className="va-trace-identity"><span data-kind={frame.kind} aria-label={frame.kind}>{glyph[frame.kind]??"·"}</span><span>{identity(frame)}</span><span className="va-trace-location">{location(frame)}</span></span><span className="va-trace-label">{frame.label}</span>{frame.boundary && <span className="text-meta font-mono text-ink-muted">● {frame.boundary.outcome}</span>}</span>
  </button></li>)}</ol>
  return <figure ref={ref} className="va-execution-trace" data-wide={wide||undefined}>
    <header className="va-trace-heading"><div className="min-w-0"><div className="flex items-center gap-2"><h3 className="text-row-title font-semibold break-words">{title??"Execution trace"}</h3><TooltipProvider><Tooltip><TooltipTrigger render={<button type="button" aria-label="About this trace" className="va-trace-about"><Info size={16}/></button>}/><TooltipContent>{evidenceNote}</TooltipContent></Tooltip></TooltipProvider></div>{caption && <p className="text-small text-ink-muted break-words">{caption}</p>}</div>
      <nav className="va-trace-pager" aria-label="Execution steps"><button type="button" onClick={()=>move(-1)} disabled={selected===0} aria-label="Previous execution step"><ArrowLeft size={16}/></button><span className="font-mono text-meta text-ink-muted" aria-live="polite">{selected+1} / {ordered.length}</span><button type="button" onClick={()=>move(1)} disabled={selected===ordered.length-1} aria-label="Next execution step"><ArrowRight size={16}/></button></nav>
    </header>
    {event.boundary && <div className="va-trace-boundary"><span className="font-mono text-meta">{event.boundary.kind}</span><span>{event.boundary.from.label} → {event.boundary.to.label}</span><span className="font-mono text-meta" data-outcome={event.boundary.outcome}>● {event.boundary.outcome}</span></div>}
    <div className="va-trace-main" style={!showCallStack?{gridTemplateColumns:"minmax(0,1fr)"}:undefined}>{showCallStack && <aside className="va-trace-stack" onKeyDown={e=>{if(e.key==="ArrowDown"||e.key==="ArrowUp"){e.preventDefault();move(e.key==="ArrowDown"?1:-1)}}}>
      {wide?<><h4 className="text-small font-medium mb-2">Call stack · {ordered.length} frames</h4>{stack}</>:<details><summary><span className="block text-small font-medium">Call stack · {ordered.length} frames</span><span className="va-trace-current"><span className="va-code-pin" style={{background:"var(--brand)"}}>{selected+1}</span><span aria-label={event.kind}>{glyph[event.kind]}</span><span className="break-all font-mono text-meta">{identity(event)} · {location(event)}</span></span></summary>{stack}</details>}
    </aside>}
    <SourcePane event={event} number={selected+1}/></div>
    <div className="va-trace-inspector">
      {!!event.inputs?.length && <ValueColumn title="Inputs" values={event.inputs} definitions={typeDefinitions}/>}
      {!!event.outputs?.length && <ValueColumn title="Outputs" values={event.outputs} definitions={typeDefinitions}/>}
      {!!event.impacts?.length && <section><h4 className="text-small font-medium">Effects and errors</h4>{event.impacts.map((impact,i)=><div key={i} className="mt-3 text-small break-words"><p className="font-medium" style={{color:impact.kind==="error"?"var(--signal-risk)":undefined}}>{impact.kind==="error"?"✕ ":""}{impact.title}</p>{impact.description && <p className="text-ink-muted">{impact.description}</p>}{impact.codeRef && <p className="font-mono text-meta text-ink-muted break-all">{impact.codeRef.file}:{impact.codeRef.line}</p>}</div>)}</section>}
    </div>
  </figure>
}
function identity(event:ExecutionTraceEvent){return event.source.facts.focus.symbol?`${event.source.facts.focus.symbol}()` : event.source.facts.focus.text.replace(/\s+/g," ").trim()}
function location(event:ExecutionTraceEvent){const span=event.source.facts.span;return `${span.file}:${span.startLine}${span.endLine===span.startLine?"":`–${span.endLine}`}`}
function SourcePane({event,number}:{event:ExecutionTraceEvent;number:number}){
  const {span,focus,scope,language,excerpt}=event.source.facts, content=event.source.content
  if(!content) return <section className="va-trace-source"><p className="text-small text-ink-muted py-10">Source not included. Run trace inspect and create again to include the verified source.</p></section>
  const full=span.startLine<=splitLines(content).length
  const window=full?trimExcerpt(content,1,span.startLine,span.endLine,7):{code:excerpt,startLine:span.startLine,total:splitLines(excerpt).length}
  return <section className="va-trace-source" aria-label="Source"><CodeView {...window} file={span.file} title={scope?.symbol?`inside ${scope.symbol}()` : identity(event)} language={language} activeRange={[span.startLine,span.endLine]} focusText={focus.text} focusNumber={number} scope={scope?.startLine!==undefined && scope.endLine!==undefined?[scope.startLine,scope.endLine]:undefined}/></section>
}
function ValueColumn({title,values,definitions}:{title:string;values:ExecutionTraceTypedValue[];definitions:ExecutionTraceTypeDefinition[]}){
  return <section aria-label={title}><h4 className="text-small font-medium">{title}</h4>{values.map(value=><div key={value.id} className="mt-3 min-w-0"><div className="flex flex-wrap gap-2 items-baseline"><span className="font-mono text-meta font-medium break-all">{value.name}</span>{value.staticType && <TypeReference type={value.staticType} definitions={definitions}/>} {value.runtimeType && <span className="font-mono text-meta text-ink-muted break-all">runtime {value.runtimeType}</span>}</div><p className="font-mono text-meta break-all mt-1">{value.preview.text}</p>{value.preview.fields && <dl className="mt-2 text-meta">{value.preview.fields.map(field=><div key={field.name} className="flex flex-wrap gap-x-3 border-t border-rule py-1"><dt className="font-mono text-ink-muted break-all">{field.name}: <TypeReference type={field.type} definitions={definitions}/></dt><dd className="font-mono break-all">{field.preview??"—"}</dd></div>)}</dl>}</div>)}</section>
}
function TypeReference({type,definitions}:{type:string;definitions:ExecutionTraceTypeDefinition[]}) {
  const referenced=definitions.filter(d=>new RegExp(`(^|[^\\w$])${d.name.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")}(?=$|[^\\w$])`).test(type))
  if(!referenced.length) return <span className="font-mono text-meta text-ink-muted break-all">{type}</span>
  return <Popover><PopoverTrigger openOnHover className="font-mono text-meta text-ink-muted break-all underline decoration-dashed underline-offset-4 min-h-11" aria-label={`Inspect type ${type}`}>{type}</PopoverTrigger><PopoverContent className="w-[min(30rem,calc(100vw-2rem))]">{referenced.map(d=><section key={d.name}><CodeView code={d.definition} language={d.language??"typescript"} title={d.name} file={d.file} startLine={d.line}/><p className="text-meta text-ink-muted">{d.provenance==="derived"?"Source-derived definition":"Static-analysis inference"}</p></section>)}</PopoverContent></Popover>
}
