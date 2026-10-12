"use client"
import { useEffect, useRef, useState } from "react"
import { layoutNotes } from "@/lib/code-lines"
import { Prose } from "@/components/ui/prose"
import { NotePin, type CodeNote } from "./code-rows"
export function CodeNoteBody({note}:{note:CodeNote}) {
  return <div className="va-code-note" data-annotation-line={note.line}><NotePin note={note}/><div><p className="text-row-title font-medium text-ink">{note.title}</p>{note.body && <Prose className="text-small text-ink-muted [&>p]:my-0">{note.body}</Prose>}</div></div>
}
export function NoteRail({notes,anchors}:{notes:CodeNote[];anchors:number[]}) {
  const ref=useRef<HTMLDivElement>(null), [heights,setHeights]=useState<number[]>([])
  useEffect(()=>{
    if(!ref.current || typeof ResizeObserver==="undefined") return
    const children=[...ref.current.querySelectorAll<HTMLElement>(".va-code-note")]
    const observer=new ResizeObserver(()=>setHeights(children.map(child=>child.getBoundingClientRect().height)))
    children.forEach(child=>observer.observe(child))
    return ()=>observer.disconnect()
  },[notes])
  const layout=layoutNotes(notes.map((_,i)=>({anchor:anchors[i],height:heights[i]??64})))
  return <div ref={ref} className="va-code-rail" aria-label="Code notes" style={{minHeight:Math.max(0,...layout.map(n=>n.top+n.height))+12}}>{notes.map((note,i)=>{
    const position=layout[i]
    return <div key={note.n} style={{position:"absolute",top:position.top,left:0,right:0}}>
      {position.displaced>24 && <span className="va-note-connector" data-connector style={{top:-position.displaced,height:position.displaced}} aria-hidden="true"/>}
      <CodeNoteBody note={note}/>
    </div>
  })}</div>
}
