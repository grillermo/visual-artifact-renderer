"use client"
import { useEffect, useRef } from "react"
import type { AdapterArgs } from "@/components/artifact-types"
import type { WalkthroughProps } from "@/lib/contract/artifact-manifest"
import { CodeView } from "@/components/ui/code/code-view"
import { noteTone } from "@/components/ui/code/code-rows"
import { useContainerWidth } from "@/components/ui/code/use-container-width"
import { Prose } from "@/components/ui/prose"
import { trimExcerpt } from "@/lib/code-lines"
import { useActiveStep } from "./use-active-step"
import { usePrefersReducedMotion } from "./plan/diagram-svg"
export function renderWalkthrough({node}:AdapterArgs<"walkthrough">){return <Walkthrough {...node.props}/>}
export function Walkthrough({title,files,steps,caption}:WalkthroughProps) {
  const {ref,width}=useContainerWidth<HTMLElement>(), wide=width>=900, reduced=usePrefersReducedMotion()
  const {active,setActive,refs}=useActiveStep(wide,steps.length), pane=useRef<HTMLDivElement>(null), instant=useRef(true), previousPath=useRef<string>("")
  const step=steps[active], file=files.find(file=>file.path===(step.file??files[0].path))!, range=step.lines.split("-").map(Number), end=range[1]??range[0]
  function activate(index:number,keyboard=false) {
    const next=Math.max(0,Math.min(steps.length-1,index)); instant.current=keyboard||reduced;setActive(next)
    if(!wide) refs.current[next]?.scrollIntoView?.({block:"start",behavior:keyboard||reduced?"instant":"smooth"})
  }
  useEffect(()=>{
    if(!wide || !pane.current) return
    const scroller=pane.current.querySelector<HTMLElement>(".va-code-scroll"), row=pane.current.querySelector<HTMLElement>('[data-active="true"]')
    if(scroller && row) {
      const delta=row.getBoundingClientRect().top-scroller.getBoundingClientRect().top-scroller.clientHeight/2+row.clientHeight/2
      scroller.scrollTo?.({top:scroller.scrollTop+delta,behavior:reduced||instant.current?"instant":"smooth"})
    }
    if(previousPath.current && previousPath.current!==file.path && !reduced && !instant.current) pane.current.animate?.([{opacity:.55},{opacity:1}],{duration:160,easing:"ease-out"})
    previousPath.current=file.path;instant.current=false
  },[active,file.path,reduced,wide])
  const pin=(index:number,tone:typeof step.tone)=><span className="va-code-pin" style={{background:active===index?"var(--source-focus)":noteTone(tone)}}>{index+1}</span>
  return <section ref={ref} className="va-walkthrough" aria-label={title??"Code walkthrough"} data-wide={wide||undefined}>
    {title && <h3 className="mb-4 text-row-title font-semibold">{title}</h3>}
    {!wide && <nav className="va-walkthrough-nav" aria-label="Walkthrough steps">{steps.map((step,i)=><button type="button" key={i} onClick={()=>activate(i)} aria-current={active===i?"step":undefined}>{pin(i,active===i?"idea":"info")}<span>{step.title}</span></button>)}</nav>}
    <div className="va-walkthrough-layout"><ol className="va-walkthrough-steps">{steps.map((step,i)=>{
      const source=files.find(file=>file.path===(step.file??files[0].path))!, [first,last=first]=step.lines.split("-").map(Number)
      const excerpt=trimExcerpt(source.code??(step.side==="old"?source.before:source.after)??"",source.startLine??1,first,last)
      return <li key={i} ref={el=>{refs.current[i]=el}} data-walkthrough-step={i} data-active={active===i||undefined}>
        <button type="button" className="va-walkthrough-step-title" onClick={()=>activate(i)} aria-current={active===i?"step":undefined}>{pin(i,active===i?"idea":step.tone)}<span className="text-row-title font-medium">{step.title}</span></button>
        {step.body && <Prose className="va-walkthrough-step-body text-small text-ink-muted [&>p]:my-0">{step.body}</Prose>}
        <p className="va-walkthrough-location"><span title={source.path}>{source.path.split("/").pop()}</span><span>Lines {first}{last===first?"":`–${last}`}</span></p>
        {!wide && <div className="mt-4"><CodeView {...excerpt} file={source.path} language={source.language} activeRange={[first,last]} focusText={step.text} focusNumber={i+1} caption={`Lines ${excerpt.startLine}–${excerpt.startLine+excerpt.code.split("\n").length-1} of ${excerpt.total} (${source.path})`}/></div>}
      </li>
    })}</ol>
    {wide && <div ref={pane} className="va-walkthrough-pane" tabIndex={0} role="region" aria-label="Walkthrough source" onKeyDown={event=>{
      if(event.target!==event.currentTarget) return
      if(["ArrowDown","j","ArrowUp","k"].includes(event.key)){event.preventDefault();activate(active+(["ArrowDown","j"].includes(event.key)?1:-1),true)}
    }}>
      <div className="va-walkthrough-pager"><span className="va-walkthrough-source-label">Source</span><span className="text-meta text-ink-muted" aria-live="polite">Step {active+1} of {steps.length}</span><button type="button" disabled={active===0} aria-label="Previous walkthrough step" onClick={()=>activate(active-1)}>‹</button><button type="button" disabled={active===steps.length-1} aria-label="Next walkthrough step" onClick={()=>activate(active+1)}>›</button></div>
      <CodeView {...file} file={file.path} activeRange={[range[0],end]} activeSide={step.side} focusText={step.text} focusNumber={active+1} pinOnly routePins={steps.flatMap((other,i)=>i!==active&&(other.file??files[0].path)===file.path?[{line:Number(other.lines.split("-")[0]),title:`Step ${i+1}: ${other.title}`,n:i+1,tone:"info" as const,side:other.side}]:[])}/>
    </div>}
    </div>
    {!wide && files.map(file=><details key={file.path} className="mt-4 border-t border-rule py-3"><summary className="cursor-pointer text-small">Show full file: {file.path}</summary><CodeView {...file} file={file.path}/></details>)}
    {caption && <p className="mt-4 text-small text-ink-muted">{caption}</p>}
  </section>
}
