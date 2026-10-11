import type { CSSProperties } from "react"
import type { CodeBlockProps } from "@/lib/contract/artifact-manifest"
import { sliceTokens, type DiffLine, type Token } from "@/lib/code-lines"
export type CodeNote=NonNullable<CodeBlockProps["annotations"]>[number]&{n:number}
export const noteTone=(tone:CodeNote["tone"])=>`var(${({info:"--ink",warn:"--signal-wait",risk:"--signal-risk",ok:"--signal-new",idea:"--brand"} as const)[tone??"info"]})`
export function NotePin({note}:{note:CodeNote}) { return <span className="va-code-pin" style={{background:noteTone(note.tone)}} aria-label={`Note ${note.n}: ${note.title}`}>{note.n}</span> }
export function CodeRow({row,tokens,notes,highlighted,active,dimmed,numbers=true,diff=false,view="unified"}:{row:DiffLine;tokens?:Token[];notes:CodeNote[];highlighted?:boolean;active?:boolean;dimmed?:boolean;numbers?:boolean;diff?:boolean;view?:"unified"|"old"|"new"}) {
  const number=view==="old"?row.oldLine:row.newLine??row.oldLine
  const note=notes.find(note=>{
    if(view!=="unified" && (note.side??"new")!==view) return false
    const line=note.side==="old"?row.oldLine:row.newLine
    return line!==undefined && line>=note.line && line<=(note.end??note.line)
  })
  const sideNumber=note?.side==="old"?row.oldLine:row.newLine
  const underline=note?.text && sideNumber===note.line ? row.value.indexOf(note.text) : -1
  const noteRanges=underline!==undefined && underline>=0 && note?.text?[[underline,underline+note.text.length] as const]:[]
  const segments=sliceTokens(tokens??[{content:row.value||" "}], [...(row.words??[]),...noteRanges])
  const style={"--note-tone":noteTone(note?.tone),opacity:dimmed ? .55 : undefined} as CSSProperties
  return <div className="va-code-row" data-line={number} data-old-line={row.oldLine} data-new-line={row.newLine} data-diff={diff?row.type:undefined} data-highlighted={highlighted||undefined} data-active={active||undefined} data-range={note?`${note.line}-${note.end??note.line}`:undefined} style={style}>
    <span className="va-code-gutter" aria-hidden="true">
      {numbers && <span className="va-code-number">{number}</span>}
      <span className="va-code-mark" data-bracket={note?"true":undefined}>{note && sideNumber===note.line?<NotePin note={note}/>:highlighted||active?"▸":""}</span>
    </span>
    {diff && <span className="va-code-glyph" aria-label={row.type==="add"?"added":row.type==="remove"?"removed":"context"}>{row.type==="add"?"+":row.type==="remove"?"−":" "}</span>}
    <code>{segments.map((token,i)=>{
      const from=segments.slice(0,i).reduce((sum,segment)=>sum+segment.content.length,0)
      const word=row.words?.some(([a,b])=>from>=a&&from<b), text=noteRanges.some(([a,b])=>from>=a&&from<b)
      return <span key={i} data-word-change={word||undefined} data-note-text={text||undefined} style={{color:token.color,fontStyle:token.fontStyle && token.fontStyle&1?"italic":undefined,fontWeight:token.fontStyle && token.fontStyle&2?700:undefined}}>{token.content}</span>
    })}</code>
  </div>
}
