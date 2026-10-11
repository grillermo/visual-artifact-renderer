import { CodeNoteBody } from "./note-rail"
import { CodeRow, type CodeNote } from "./code-rows"
import type { SplitRow, Token } from "@/lib/code-lines"
export function SplitRows({rows,notes,tokens,inlineNotes}:{rows:SplitRow[];notes:CodeNote[];tokens:Map<string,Token[]>;inlineNotes:boolean}) {
  return <div className="va-split-rows">{rows.map((pair,i)=><div key={i} className="va-split-pair" data-paired={pair.paired||undefined}>
    <div>{pair.old && <CodeRow row={pair.old} view="old" diff notes={notes} tokens={tokens.get(`old:${pair.old.oldLine}`)}/>}</div>
    <div>{pair.new && <CodeRow row={pair.new} view="new" diff notes={notes} tokens={tokens.get(`new:${pair.new.newLine}`)}/>}</div>
    {inlineNotes && notes.filter(note=>(note.side==="old"?pair.old?.oldLine:pair.new?.newLine)===(note.end??note.line)).map(note=><div className="va-code-inline-note" style={{gridColumn:"1 / -1"}} key={note.n}><CodeNoteBody note={note}/></div>)}
  </div>)}</div>
}
