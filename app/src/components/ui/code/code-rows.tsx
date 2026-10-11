import { accessibleSyntaxColor } from "@/lib/code-contrast"
import type { CSSProperties } from "react"
import type { CodeBlockProps } from "@/lib/contract/artifact-manifest"
import { sliceTokens, type DiffLine, type Token } from "@/lib/code-lines"
export type CodeNote=NonNullable<CodeBlockProps["annotations"]>[number]&{n:number}
export const noteTone=(tone:CodeNote["tone"])=>`var(${({info:"--ink",warn:"--signal-wait",risk:"--signal-risk",ok:"--signal-new",idea:"--brand"} as const)[tone??"info"]})`
export function NotePin({note}:{note:CodeNote}) { return <span className="va-code-pin" style={{background:noteTone(note.tone)}} aria-label={`Note ${note.n}: ${note.title}`}>{note.n}</span> }
export function CodeRow({row,tokens,notes,highlighted,active,dimmed,numbers=true,diff=false,view="unified",dark=false}:{row:DiffLine;tokens?:Token[];notes:CodeNote[];highlighted?:boolean;active?:boolean;dimmed?:boolean;numbers?:boolean;diff?:boolean;view?:"unified"|"old"|"new";dark?:boolean}) {
  const number=view==="old"?row.oldLine:row.newLine??row.oldLine
  const matching=notes.filter(note=>{
    if(view!=="unified" && (note.side??"new")!==view) return false
    const line=note.side==="old"?row.oldLine:row.newLine
    return line!==undefined && line>=note.line && line<=(note.end??note.line)
  })
  const note=matching[0]
  const starts=matching.filter(note=>(note.side==="old"?row.oldLine:row.newLine)===note.line)
  const noteRanges=starts.flatMap(note=>{const start=note.text?row.value.indexOf(note.text):-1;return start>=0&&note.text?[{range:[start,start+note.text.length] as const,tone:note.tone}]:[]})
  const segments=sliceTokens(tokens??[{content:row.value||" "}], [...(row.words??[]),...noteRanges.map(note=>note.range)])
  const positioned:{token:Token;from:number}[]=[]
  let offset=0
  for(const token of segments){positioned.push({token,from:offset});offset+=token.content.length}
  const style={"--note-tone":noteTone(note?.tone),opacity:dimmed ? .55 : undefined} as CSSProperties
  return <div className="va-code-row" data-line={number} data-old-line={row.oldLine} data-new-line={row.newLine} data-diff={diff?row.type:undefined} data-highlighted={highlighted||undefined} data-active={active||undefined} data-range={note?`${note.line}-${note.end??note.line}`:undefined} style={style}>
    <span className="va-code-gutter" data-unified={diff&&view==="unified"||undefined} aria-hidden="true">
      {numbers && (diff&&view==="unified"?<><span className="va-code-number" data-column="old">{row.oldLine??" "}</span><span className="va-code-number" data-column="new">{row.newLine??" "}</span></>:<span className="va-code-number">{number}</span>)}
      <span className="va-code-mark" data-bracket={note?"true":undefined}>{starts.length?starts.map(note=><NotePin key={`${note.n}:${note.side}`} note={note}/>):highlighted||active?"▸":""}</span>
    </span>
    {diff && <span className="va-code-glyph" aria-label={row.type==="add"?"added":row.type==="remove"?"removed":"context"}>{row.type==="add"?"+":row.type==="remove"?"−":" "}</span>}
    <code>{positioned.map(({token,from},i)=>{
      const word=row.words?.some(([a,b])=>from>=a&&from<b), text=noteRanges.find(({range:[a,b]})=>from>=a&&from<b)
      return <span key={i} data-word-change={word||undefined} data-note-text={!!text||undefined} style={{textDecorationColor:text?noteTone(text.tone):undefined,color:word&&token.color?accessibleSyntaxColor(token.color,"var(--ink)",dark,"word"):token.color,fontStyle:token.fontStyle && token.fontStyle&1?"italic":undefined,fontWeight:token.fontStyle && token.fontStyle&2?700:undefined}}>{token.content}</span>
    })}</code>
  </div>
}
