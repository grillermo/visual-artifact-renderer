import { test } from "node:test"
import assert from "node:assert/strict"
import { JSDOM } from "jsdom"
import { act } from "react"
import { createRoot } from "react-dom/client"
import { ArtifactNodeSchema } from "@/lib/contract/artifact-manifest"
import { ExecutionTrace } from "./execution-trace-adapter"

test("live trace removal keeps source and navigation within the remaining events",async()=>{
  const dom=new JSDOM("<!doctype html><html><body></body></html>",{url:"http://localhost"})
  Object.assign(globalThis,{window:dom.window,document:dom.window.document,Element:dom.window.Element,HTMLElement:dom.window.HTMLElement,Node:dom.window.Node,getComputedStyle:dom.window.getComputedStyle.bind(dom.window),MutationObserver:dom.window.MutationObserver,IS_REACT_ACT_ENVIRONMENT:true})
  Object.assign(globalThis,{ResizeObserver:class { constructor(private cb:ResizeObserverCallback){} observe(){this.cb([{contentRect:{width:1000}} as ResizeObserverEntry],this as unknown as ResizeObserver)} disconnect(){} }})
  dom.window.HTMLElement.prototype.scrollTo=function(){}
  window.matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){}} as unknown as MediaQueryList)
  const source={content:"run()\nreturn",facts:{span:{file:"a.ts",startLine:1,endLine:1},excerpt:"run()",sourceHash:"a".repeat(64),worktree:"unknown",language:"typescript",syntaxKind:"CallExpression",focus:{kind:"call",text:"run()",symbol:"run"},resolution:"resolved"}}
  const parsed=ArtifactNodeSchema.safeParse({type:"execution-trace",props:{provenance:{mode:"simulated",method:"author-curated",summary:"DOM fixture",confidence:"high"},events:["First","Second","Third"].map((label,order)=>({id:label.toLowerCase(),label,order:order*10,kind:"call",phase:"process",source,evidence:{origin:"simulated",confidence:"high"}}))}})
  assert.ok(parsed.success,parsed.success?undefined:JSON.stringify(parsed.error.issues))
  const node=parsed.data
  if(node.type!=="execution-trace")throw new Error("Expected trace fixture")
  const container=document.createElement("div"),root=createRoot(container)
  try{
    await act(async()=>root.render(<ExecutionTrace {...node.props}/>))
    for(let i=0;i<2;i++)await act(async()=>{(container.querySelector('[aria-label="Next execution step"]') as HTMLButtonElement).click()})
    await act(async()=>root.render(<ExecutionTrace {...node.props} events={node.props.events.slice(0,2)}/>))
    assert.match(container.querySelector('.va-trace-pager')!.textContent!,/2 \/ 2/)
    assert.equal(container.querySelector('[aria-current="step"] .va-trace-label')!.textContent,"Second")
    assert.ok(container.querySelector('.va-trace-source [data-active="true"]'))
    assert.equal(container.querySelector('.va-trace-source .va-code-pin')!.textContent,"2")
    await act(async()=>{(container.querySelector('[aria-label="Previous execution step"]') as HTMLButtonElement).click()})
    assert.match(container.querySelector('.va-trace-pager')!.textContent!,/1 \/ 2/)
  }finally{await act(async()=>root.unmount());dom.window.close()}
})
