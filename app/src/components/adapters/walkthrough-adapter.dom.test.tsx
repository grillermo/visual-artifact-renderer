import { before, after, test } from "node:test"
import assert from "node:assert/strict"
import { JSDOM } from "jsdom"
import { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { Walkthrough } from "./walkthrough-adapter"
import { activeReadingStep } from "./use-active-step"
let container:HTMLDivElement,root:Root,width=1000,reduced=false,behavior=""
before(()=>{
  const dom=new JSDOM("<!doctype html><html><body></body></html>",{url:"http://localhost"})
  Object.assign(globalThis,{window:dom.window,document:dom.window.document,MutationObserver:dom.window.MutationObserver,IS_REACT_ACT_ENVIRONMENT:true})
  Object.assign(globalThis,{ResizeObserver:class { constructor(private cb:ResizeObserverCallback){} observe(){this.cb([{contentRect:{width}} as ResizeObserverEntry],this as unknown as ResizeObserver)} disconnect(){} }})
  window.matchMedia=()=>({matches:reduced,addEventListener(){},removeEventListener(){},addListener(){},removeListener(){}} as unknown as MediaQueryList)
  dom.window.HTMLElement.prototype.scrollIntoView=function(options){behavior=(options as ScrollIntoViewOptions).behavior??""}
  dom.window.HTMLElement.prototype.scrollTo=function(){}
  container=document.createElement("div");root=createRoot(container)
})
after(()=>act(()=>root.unmount()))
const props={files:[{path:"a.ts",code:"one\ntwo"},{path:"b.ts",code:"other\nend"}],steps:[{file:"a.ts",lines:"1",title:"Start"},{file:"b.ts",lines:"2",title:"Finish"}]}
async function render(){await act(async()=>root.render(<Walkthrough key={`${width}:${reduced}`} {...props}/>))}
test("reading band matches story",()=>assert.equal(activeReadingStep([0,400,900],1000),1))
test("step order and click switch active file and source range",async()=>{
  await render();assert.deepEqual([...container.querySelectorAll('.va-walkthrough-step-title')].map(e=>e.textContent),["1Start","2Finish"])
  await act(async()=>{(container.querySelectorAll('.va-walkthrough-step-title')[1] as HTMLButtonElement).click()})
  assert.ok(container.querySelector('.va-walkthrough-pane [data-active="true"][data-line="2"]'))
  assert.match(container.querySelector('.va-walkthrough-pane .va-code-header')!.textContent!,/b.ts/)
  assert.equal(behavior,"")
  assert.match(container.querySelector('.va-walkthrough-steps [data-active] .va-walkthrough-location')!.textContent!,/b.tsLines 2/)
})
test("keyboard moves steps without motion",async()=>{
  await render();await act(async()=>{container.querySelector('.va-walkthrough-pane')!.dispatchEvent(new window.KeyboardEvent("keydown",{key:"ArrowUp",bubbles:true}))})
  assert.match(container.querySelector('.va-walkthrough-pane .va-code-header')!.textContent!,/a.ts/);assert.equal(behavior,"")
})
test("narrow width shows every excerpt and full-file disclosures, no sticky pane",async()=>{
  width=390;await render();assert.equal(container.querySelector('.va-walkthrough-pane'),null)
  assert.equal(container.querySelectorAll('li .va-code').length,2);assert.equal(container.querySelectorAll('details').length,2);assert.ok(container.querySelector('.va-walkthrough-nav'))
})
test("medium containers use excerpts rather than cramping two source columns",async()=>{
  width=800;await render();assert.equal(container.querySelector('.va-walkthrough-pane'),null)
  assert.equal(container.querySelectorAll('li .va-code').length,2)
})
test("old-side focus follows the old number on shifted unchanged rows",async()=>{
  width=1000
  const diff={files:[{path:"change.ts",before:"one\ntwo\nthree",after:"insert\none\ntwo\nthree"}],steps:[{lines:"2",side:"old" as const,title:"Original"},{lines:"3",side:"new" as const,title:"Replacement"}]}
  await act(async()=>root.render(<Walkthrough key="old-side" {...diff}/>))
  const row=container.querySelector('.va-walkthrough-pane [data-active="true"][data-old-line="2"]')!
  assert.equal(row.getAttribute("data-new-line"),"3")
  assert.equal(row.querySelector('[data-column="old"]')!.textContent,"2")
  assert.equal(row.querySelector('[data-column="new"]')!.textContent,"3")
  assert.equal(row.querySelectorAll('.va-code-pin').length,2)
  await act(async()=>root.render(<Walkthrough key="coincident" files={diff.files} steps={Array.from({length:8},(_,i)=>({lines:"2",side:"old",title:`Reader ${i+1}`}))}/>))
  assert.equal(container.querySelectorAll('.va-walkthrough-pane .va-code-pin').length,8)
  assert.equal((container.querySelector('.va-walkthrough-pane .va-code') as HTMLElement).style.getPropertyValue("--code-pin-width"),"96px")
})
test("live step removal clamps selection to a remaining excerpt",async()=>{
  width=1000
  await act(async()=>root.render(<Walkthrough key="live" {...props} steps={[...props.steps,{file:"a.ts",lines:"2",title:"Later"}]}/>))
  await act(async()=>{(container.querySelectorAll('.va-walkthrough-step-title')[2] as HTMLButtonElement).click()})
  await act(async()=>root.render(<Walkthrough key="live" {...props}/>))
  assert.match(container.querySelector('.va-walkthrough-pane .va-code-header')!.textContent!,/b.ts/)
  assert.equal(container.querySelector('.va-walkthrough-steps [data-active]')!.textContent?.includes("Finish"),true)
})
test("reduced motion activates instantly",async()=>{
  width=390;reduced=true;await render();await act(async()=>{(container.querySelectorAll('.va-walkthrough-step-title')[1] as HTMLButtonElement).click()});assert.equal(behavior,"instant")
})
