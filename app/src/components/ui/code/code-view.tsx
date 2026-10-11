"use client"
import { Fragment, useId, useMemo, useState } from "react"
import { Check, Copy } from "lucide-react"
import type { CodeBlockProps } from "@/lib/contract/artifact-manifest"
import { compareLines, expandHighlight, pairLines, parseUnifiedDiff, splitFits, splitLines, type DiffLine, type Token } from "@/lib/code-lines"
import { CodeRow, type CodeNote } from "./code-rows"
import { CodeNoteBody, NoteRail } from "./note-rail"
import { SplitRows } from "./split-rows"
import { useContainerWidth } from "./use-container-width"
import { useTokens } from "./use-tokens"

export type CodeViewProps=CodeBlockProps&{activeRange?:readonly[number,number];scope?:readonly[number,number];focusText?:string;focusNumber?:number;pinOnly?:boolean;routePins?:CodeNote[]}
export function CodeView(props:CodeViewProps) {
  const {ref,width}=useContainerWidth<HTMLElement>(), id=useId(), [copied,setCopied]=useState(false), [copyFailed,setCopyFailed]=useState(false)
  const diff=props.diff || props.before!==undefined, start=props.startLine??1
  const rows=useMemo<DiffLine[]>(()=>props.before!==undefined && props.after!==undefined?compareLines(props.before,props.after,start):props.diff?parseUnifiedDiff(props.code??"",start).hunks.flatMap(h=>h.lines):splitLines(props.code??"").map((value,i)=>({type:"context",value,newLine:start+i})),[props.code,props.before,props.after,props.diff,start])
  const pairs=useMemo(()=>pairLines(rows),[rows])
  const emphasis=useMemo(()=>new Map(pairs.flatMap(p=>[p.old,p.new].filter((r):r is DiffLine=>!!r).map(r=>[`${r.type}:${r.oldLine}:${r.newLine}`,r.words] as const))),[pairs])
  const display=useMemo(()=>rows.map(r=>({...r,words:emphasis.get(`${r.type}:${r.oldLine}:${r.newLine}`)})),[rows,emphasis])
  const notes=useMemo<CodeNote[]>(()=>props.routePins??[...(props.annotations??[])].sort((a,b)=>a.line-b.line||(a.side??"new").localeCompare(b.side??"new")).map((note,i)=>({...note,n:i+1})),[props.annotations,props.routePins])
  const highlighted=expandHighlight(props.highlight), rail=width>=900 && notes.length>0 && !props.pinOnly
  const split=diff && props.diffMode==="split" && splitFits(rows,width)
  const tokens=useTokens(rows.map(r=>r.value).join("\n"),props.language), tokenMap=new Map<string,Token[]>()
  rows.forEach((row,i)=>{ const t=tokens?.[i]; if(t) { if(row.oldLine!==undefined) tokenMap.set(`old:${row.oldLine}`,t); if(row.newLine!==undefined) tokenMap.set(`new:${row.newLine}`,t) } })
  const anchors=notes.map(note=>Math.max(0,split?pairs.findIndex(pair=>(note.side==="old"?pair.old?.oldLine:pair.new?.newLine)===note.line):display.findIndex(row=>(note.side==="old"?row.oldLine:row.newLine)===note.line))*24+12)
  const recipe=/^(bash|sh|zsh|shell)$/.test(props.language??"") && !notes.length && !diff
  const numbers=props.lineNumbers??!recipe, name=props.file??props.title??props.src??"Snippet"
  const copyText=diff?rows.filter(r=>r.type!=="remove").map(r=>r.value).join("\n"):recipe?(props.code??"").replace(/^\$ /gm,""):props.code??""
  async function copy() { try { await navigator.clipboard.writeText(copyText); setCopied(true); setCopyFailed(false); setTimeout(()=>setCopied(false),1500) } catch { setCopyFailed(true) } }
  const added=rows.filter(r=>r.type==="add").length, removed=rows.filter(r=>r.type==="remove").length
  return <figure ref={ref} className="va-code" aria-labelledby={id} data-code-mode={split?"split":diff?"unified":"code"}>
    <figcaption id={id} className="va-code-header"><div className="min-w-0 flex-1"><span className="break-all font-mono text-meta text-ink">{name}</span>{props.file && props.title && <span className="ml-3 text-small text-ink-muted">{props.title}</span>}{props.sketch && <span className="ml-2 text-meta text-ink-muted">illustrative</span>}</div>
      <div className="flex items-center gap-3">{diff && <span className="flex gap-2 font-mono text-meta"><span className="text-change-added" aria-label={`${added} added lines`}>+{added}</span><span className="text-change-removed" aria-label={`${removed} removed lines`}>−{removed}</span></span>}<span className="font-mono text-meta text-ink-muted">{props.language??"text"}</span><button type="button" className="va-code-copy" onClick={copy} aria-label={copied?"Code copied":"Copy code"}>{copied?<Check size={16}/>:<Copy size={16}/>}</button></div>
    </figcaption>
    <div className="va-code-surface" data-rail={rail||undefined}>
      <div className="va-code-scroll" tabIndex={0} role="region" aria-label={`${name} code`}><div className="va-code-lines">{split?<SplitRows rows={pairs} notes={notes} tokens={tokenMap} inlineNotes={!rail && !props.pinOnly}/>:display.map((row,i)=>{
        const line=row.newLine??row.oldLine??0, active=props.activeRange && line>=props.activeRange[0] && line<=props.activeRange[1]
        const focusNote=active && line===props.activeRange?.[0]?{line,title:"Active step",text:props.focusText,n:props.focusNumber??1,tone:"idea" as const}:undefined
        return <Fragment key={i}><CodeRow row={row} tokens={tokens?.[i]} notes={focusNote?[focusNote,...notes]:notes} numbers={numbers} diff={!!diff} highlighted={highlighted.has(line)} active={active} dimmed={props.scope?line<props.scope[0]||line>props.scope[1]:props.activeRange?!active:false}/>
          {!rail && !props.pinOnly && notes.filter(note=>(note.side==="old"?row.oldLine:row.newLine)===(note.end??note.line)).map(note=><div className="va-code-inline-note" key={note.n}><CodeNoteBody note={note}/></div>)}
        </Fragment>
      })}</div></div>
      {rail && <NoteRail notes={notes} anchors={anchors}/>}
    </div>
    {copyFailed && <p role="status" className="text-small text-ink-muted">Copy unavailable. Select the code to copy it.</p>}
    {props.caption && <p className="mt-3 text-small text-ink-muted break-words">{props.caption}</p>}
  </figure>
}
