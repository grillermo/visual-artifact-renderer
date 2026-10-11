import { z } from "zod"
import { SourceRefSchema } from "./plan-primitives.js"

export const CodeAnnotationToneSchema = z.enum(["info", "warn", "risk", "ok", "idea"])
const NoteFields = {
  title: z.string().min(1).max(80), body: z.string().min(1).max(400).optional(),
  tone: CodeAnnotationToneSchema.optional(), text: z.string().min(1).max(80).optional(), side: z.enum(["old","new"]).optional(),
}
const SourceFields = {
  code: z.string().min(1).optional(), before: z.string().optional(), after: z.string().optional(),
  language: z.string().min(1).optional(), src: SourceRefSchema.optional(), startLine: z.number().int().min(1).max(1_000_000).optional(), diff: z.boolean().optional(),
}
const lines = (code: string) => code.replace(/\r\n/g,"\n").replace(/\n$/,"").split("\n")
type Source = { code?: string; before?: string; after?: string; src?: string; startLine?: number; diff?: boolean }
export function numberedSource(source: Source, side: "old" | "new" = "new"): Map<number,string> {
  const out = new Map<number,string>(), first=source.startLine??1
  if (source.before !== undefined && source.after !== undefined) { lines(side==="old"?source.before:source.after).forEach((text,i)=>out.set(first+i,text)); return out }
  let old=first, next=first
  for (const text of lines(source.code??"")) {
    if (!source.diff) { out.set(next++,text); continue }
    const hunk=/^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/.exec(text)
    if (hunk) { old=Number(hunk[1]); next=Number(hunk[2]); continue }
    if (/^(--- |\+\+\+ |diff --git|index |\\ No newline)/.test(text)) continue
    if (text.startsWith("+")) { if(side==="new") out.set(next,text.slice(1)); next++ }
    else if (text.startsWith("-")) { if(side==="old") out.set(old,text.slice(1)); old++ }
    else { out.set(side==="old"?old:next,text.startsWith(" ")?text.slice(1):text); old++; next++ }
  }
  return out
}
function sourceIssues(source: Source, ctx: z.RefinementCtx) {
  const pair = source.before !== undefined && source.after !== undefined
  if ((source.before !== undefined) !== (source.after !== undefined)) ctx.addIssue({code:"custom",message:"Provide both before and after"})
  if ((source.code !== undefined || source.src !== undefined) === pair) ctx.addIssue({code:"custom",message:"Provide exactly one of code (or src) and before + after"})
  for(const key of ["code","before","after"] as const) {
    const text=source[key]
    if(text!==undefined && (lines(text).length>400 || new TextEncoder().encode(text).length>24*1024)) ctx.addIssue({code:"custom",path:[key],message:"Code is capped at 400 lines and 24 KB per side; split the excerpt or use walkthrough"})
  }
}
export const CodeBlockPropsSchema = z.object({
  ...SourceFields, title: z.string().min(1).optional(), file:z.string().min(1).max(200).optional(), caption:z.string().min(1).optional(),
  lineNumbers:z.boolean().optional(), highlight:z.array(z.union([z.number().int().min(1),z.string().regex(/^\d+-\d+$/)])).max(40).optional(),
  annotations:z.array(z.object({...NoteFields,line:z.number().int().min(1),end:z.number().int().min(1).optional()}).strict()).max(12).optional(),
  diffMode:z.enum(["unified","split"]).optional(), sketch:z.boolean().optional(),
}).strict().superRefine((props,ctx)=>{
  sourceIssues(props,ctx)
  const diff=props.diff || props.before!==undefined
  const seen:{a:number;b:number;side:string}[]=[]
  props.annotations?.forEach((note,i)=>{
    const side=note.side??"new", map=numberedSource(props,side), end=note.end??note.line
    const issue=(message:string)=>ctx.addIssue({code:"custom",path:["annotations",i],message})
    if(end<note.line) issue("Range end must be >= line")
    if(!props.src && (!map.has(note.line)||!map.has(end))) issue(`line ${note.line} is outside ${Math.min(...map.keys())}-${Math.max(...map.keys())}`)
    if(seen.some(r=>r.side===side && note.line<=r.b && end>=r.a)) issue("Annotation ranges may not overlap on the same side")
    seen.push({a:note.line,b:end,side})
    if(note.text && !props.src && !map.get(note.line)?.includes(note.text)) issue("text must exist on the annotation start line")
    if(note.side && !diff) issue("side is only valid on diffs")
    if(diff && note.tone && !["info","risk","idea"].includes(note.tone)) issue("Diff notes use only info, risk or idea; green means added")
  })
  const map=numberedSource(props)
  props.highlight?.forEach((entry,i)=>{ const [a,b]=typeof entry==="number"?[entry,entry]:entry.split("-").map(Number); if(!props.src && (b<a || !map.has(a)||!map.has(b))) ctx.addIssue({code:"custom",path:["highlight",i],message:"Highlight range is outside the source"}) })
})
export type CodeBlockProps = z.infer<typeof CodeBlockPropsSchema>
export const codeBlockIsStructured = (props: CodeBlockProps) => Boolean(props.annotations?.length || props.highlight?.length || props.diff || props.before!==undefined || props.startLine || props.lineNumbers!==undefined || props.src)
const WalkthroughFileSchema = z.object({...SourceFields,path:z.string().min(1).max(200)}).strict().superRefine(sourceIssues)
export const WalkthroughPropsSchema = z.object({
  title:z.string().min(1).optional(), caption:z.string().min(1).optional(), files:z.array(WalkthroughFileSchema).min(1).max(4),
  steps:z.array(z.object({...NoteFields,file:z.string().min(1).max(200).optional(),lines:z.string().regex(/^\d+(?:-\d+)?$/)}).strict()).min(2).max(8),
}).strict().superRefine((props,ctx)=>{
  const paths=props.files.map(f=>f.path)
  if(new Set(paths).size!==paths.length) ctx.addIssue({code:"custom",path:["files"],message:"File paths must be unique"})
  props.steps.forEach((step,i)=>{
    const issue=(message:string)=>ctx.addIssue({code:"custom",path:["steps",i],message})
    if(props.files.length>1 && !step.file) issue("file is required with several files")
    const file=props.files.find(f=>f.path===(step.file??paths[0]))
    if(!file) { issue("Unknown file"); return }
    const [a,b=a]=step.lines.split("-").map(Number), map=numberedSource(file,step.side)
    if(b<a || a<1 || (!file.src && (!map.has(a)||!map.has(b)))) issue("Step lines must be in the file range")
    if(step.text && !file.src && !map.get(a)?.includes(step.text)) issue("text must exist on the step start line")
    const diff=file.diff || file.before!==undefined
    if(step.side && !diff) issue("side is only valid on diffs")
    if(diff && step.tone && !["info","risk","idea"].includes(step.tone)) issue("Diff steps use only info, risk or idea")
  })
})
export type WalkthroughProps = z.infer<typeof WalkthroughPropsSchema>
