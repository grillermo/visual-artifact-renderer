import { before, after, test } from "node:test"
import assert from "node:assert/strict"
import { JSDOM } from "jsdom"
import { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { CodeView, type CodeViewProps } from "./code-view"
let container:HTMLDivElement, root:Root, width=1000, copied=""
before(()=>{
  const dom=new JSDOM("<!doctype html><html><body></body></html>",{url:"http://localhost"})
  Object.assign(globalThis,{window:dom.window,document:dom.window.document,MutationObserver:dom.window.MutationObserver,IS_REACT_ACT_ENVIRONMENT:true})
  Object.defineProperty(globalThis,"navigator",{configurable:true,value:{clipboard:{writeText:async(text:string)=>{copied=text}}}})
  Object.assign(globalThis,{ResizeObserver:class { constructor(private cb:ResizeObserverCallback){} observe(){this.cb([{contentRect:{width}} as ResizeObserverEntry],this as unknown as ResizeObserver)} disconnect(){} }})
  container=document.createElement("div"); root=createRoot(container)
})
after(()=>act(()=>root.unmount()))
async function render(props:CodeViewProps){await act(async()=>{root.render(<CodeView key={JSON.stringify(props)+width} {...props}/>)});}
test("pins sort in line order and inclusive range marks each row",async()=>{
  await render({code:"one\ntwo\nthree",annotations:[{line:3,title:"Last"},{line:1,end:2,title:"First",text:"one"}]})
  assert.equal(container.querySelectorAll('[data-range="1-2"]').length,2)
  assert.equal(container.querySelector('[data-line="1"] .va-code-pin')?.textContent,"1")
  assert.equal(container.querySelector('[data-line="3"] .va-code-pin')?.textContent,"2")
  assert.equal(container.querySelector('[data-note-text]')?.textContent,"one")
})
test("split uses container width and long-line fallback",async()=>{
  width=1000; await render({before:"a",after:"b",diffMode:"split"}); assert.ok(container.querySelector('[data-code-mode="split"]'))
  width=390; await render({before:"a",after:"b",diffMode:"split"}); assert.ok(container.querySelector('[data-code-mode="unified"]'))
  width=1000; await render({before:"a".repeat(141),after:"b",diffMode:"split"}); assert.ok(container.querySelector('[data-code-mode="unified"]'))
})
test("word spans only mark paired rows and diff glyphs have accessible names",async()=>{
  await render({before:"const port = 80",after:"const port = 81\nunrelated"})
  assert.equal(container.querySelectorAll('[data-word-change]').length,2)
  assert.ok(container.querySelector('[aria-label="added"]')); assert.ok(container.querySelector('[aria-label="removed"]'))
  assert.equal(container.querySelector('[data-new-line="2"] [data-word-change]'),null)
})
test("copy excludes removed lines and shell prompts",async()=>{
  await render({before:"const a=1",after:"const a=2"}); await act(async()=>{(container.querySelector('[aria-label="Copy code"]') as HTMLButtonElement).click()}); assert.equal(copied,"const a=2")
  await render({code:"$ echo one\n$ echo two",language:"bash"}); assert.equal(container.querySelector('.va-code-number'),null)
  await act(async()=>{(container.querySelector('[aria-label="Copy code"]') as HTMLButtonElement).click()}); assert.equal(copied,"echo one\necho two")
})
test("dense desktop notes stay inline instead of stretching a narrow rail",async()=>{
  width=1000; await render({code:"a\nb\nc\nd\ne\nf",annotations:[1,2,3,4].map(line=>({line,title:`Note ${line}`,body:"An explanation of this source line."}))})
  assert.equal(container.querySelector('.va-code-rail'),null)
  assert.equal(container.querySelectorAll('.va-code-inline-note').length,4)
})
test("inactive source context uses a semantic dimmed state without opacity",async()=>{
  width=1000; await render({code:"a\nb\nc",activeRange:[2,2]})
  assert.equal(container.querySelectorAll('[data-dimmed]').length,2)
  assert.equal((container.querySelector('[data-line="1"]') as HTMLElement).style.opacity,"")
  assert.equal((container.querySelector('[data-active] .va-code-pin') as HTMLElement).style.background,"var(--source-focus)")
})
test("narrow notes are inline after range end, not after start",async()=>{
  width=390; await render({code:"a\nb\nc",annotations:[{line:1,end:2,title:"Range"}]})
  assert.equal(container.querySelector('.va-code-rail'),null)
  assert.equal(container.querySelector('[data-line="2"]')?.nextElementSibling?.className,"va-code-inline-note")
})
