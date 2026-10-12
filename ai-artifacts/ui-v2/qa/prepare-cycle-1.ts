import { readFileSync, writeFileSync, mkdirSync } from "node:fs"
import { createHash } from "node:crypto"
import { resolve, dirname } from "node:path"
import { ArtifactNodeSchema, safeParseVisualArtifactSpec, normalizeCallStackRows } from "../../../shared/src/contract"
const root=resolve(import.meta.dirname,"../../..")
const write=(path:string,value:unknown)=>{mkdirSync(dirname(path),{recursive:true});writeFileSync(path,JSON.stringify(value,null,2)+"\n")}
const code=(props:Record<string,unknown>)=>({type:"code",props})
const chapter=(title:string,nodes:unknown[])=>({type:"chapter",props:{title},children:nodes})
const excerpt="export function retry(job: Job) {\n  const pending = new Map()\n  pending.set(job.id, job)\n  const maxAttempts = 3\n  for (let attempt = 0; attempt < maxAttempts; attempt++) {\n    if (run(job)) return true\n  }\n  pending.delete(job.id)\n  return false\n}"
const traceSource="export function main(input: unknown) {\n  const parsed = parse(input)\n  const output = render(parsed)\n  return output\n}"
const traceSourceHash=createHash("sha256").update(traceSource).digest("hex")
const trace={type:"execution-trace",props:{title:"JSON to a trusted adapter",provenance:{mode:"simulated",method:"author-curated",summary:"Fixture source and values, not a runtime capture.",confidence:"high"},events:Array.from({length:9},(_,i)=>({id:`frame-${i}`,order:i,kind:i===3?"boundary":i===8?"return":"call",phase:"process",label:["Read the artifact request","Read the stored bundle","Parse unknown JSON","Validate the shared contract","Choose the trusted adapter","Normalize the source excerpt","Render the source rows","Render notes beside the line range","Return the rendered artifact"][i],source:{content:traceSource,facts:{span:{file:"fixture/contract-validation/validate.ts",startLine:2,endLine:2},excerpt:"  const parsed = parse(input)",sourceHash:traceSourceHash,worktree:"dirty",language:"typescript",syntaxKind:"call_expression",focus:{kind:"call",text:"parse(input)",symbol:"parse"},scope:{kind:"function",symbol:"main",startLine:1,endLine:5},resolution:"resolved"}},evidence:{origin:"simulated",confidence:"high"},...(i===3?{boundary:{kind:"validation",from:{label:"Parsed JSON",system:"cli"},to:{label:"Renderer contract",system:"renderer"},outcome:"passed"}}:{}),inputs:[{id:`input-${i}`,name:"input",staticType:"unknown",preview:{kind:"scalar",text:"{ nodes: [code], title: 'An explained source excerpt' }"},provenance:"simulated"}],outputs:[{id:`out-${i}`,name:"parsed",staticType:"ArtifactSpec",preview:{kind:"object",text:"Validated artifact with a trusted adapter"},provenance:"simulated"}]}))}}
const fixture={slug:"code-walkthrough-fixture",title:"Code walkthrough acceptance",artifactType:"review",topics:["code","walkthrough"],nodes:[
 chapter("Copy a command",[code({file:"Terminal",language:"bash",code:"$ pnpm export:contract\n$ pnpm verify:artifacts"})]),
 chapter("Read an explained excerpt",[code({file:"src/retry.ts",language:"typescript",startLine:40,code:excerpt,annotations:[{line:41,end:43,title:"Bound pending work",body:"This state lives only for the job.",tone:"idea",text:"new Map()"},{line:47,end:48,title:"Release it on failure",tone:"risk"}]})]),
 chapter("Compare two versions",[code({file:"src/logger.ts",title:"One output boundary",language:"typescript",before:"const attempts = 10\nconsole.log(message)\nreturn attempts",after:"const attempts = 3\nlogger.info(message)\nreturn attempts",diffMode:"split"})]),
 chapter("Explain a patch",[code({file:"src/logger.ts",language:"typescript",diff:true,code:"@@ -40,3 +40,3 @@\n-const attempts = 10\n-console.log(message)\n+const attempts = 3\n+logger.info(message)\n return attempts",annotations:[{line:40,end:41,title:"One structured sink",tone:"idea",side:"new",text:"3"}]})]),
 chapter("Follow a multi-file route",[{type:"walkthrough",props:{title:"A retry has an end",files:[{path:"src/retry.ts",language:"typescript",code:excerpt},{path:"src/cache.ts",language:"typescript",code:"export const cache = new Map()\nexport function clear() {\n  cache.clear()\n}"}],steps:[{file:"src/retry.ts",lines:"2-4",title:"Give the work a bound",body:"The attempt budget is explicit.",text:"new Map()",tone:"idea"},{file:"src/retry.ts",lines:"8-9",title:"Release failed work",tone:"risk"},{file:"src/cache.ts",lines:"2-4",title:"Clear shared state",body:"The request owner ends the lifetime.",tone:"ok"}]}}]),
 chapter("Inspect boundary frames",[trace]),
 chapter("Keep long source inside its scroller",[code({file:"src/long.ts",language:"typescript",code:`const request = { message: '${"source needs a local scroll boundary ".repeat(5)}' }\nreturn request`,annotations:[{line:1,title:"A deliberately long source line",body:"Scroll the code; this note stays beside or below it.",tone:"info"}]})]),
 chapter("Resolve dense note collisions",[code({file:"src/dense.ts",language:"typescript",code:excerpt,annotations:[1,2,3,4,5,6].map(line=>({line,title:`Decision at line ${line}`,body:"A longer explanation makes measured notes collide. The connector keeps the numbered pin tied to its source line.",tone:line%2?"idea":"info"}))})]),
]}
const parsed=safeParseVisualArtifactSpec(fixture);if(!parsed.success)throw parsed.error
write(resolve(root,"artifacts/ui-v2/code-walkthrough-fixture/artifact.json"),fixture)
const compact={slug:"component-library",title:"Canonical code components",nodes:[fixture.nodes[1],fixture.nodes[2],fixture.nodes[4],fixture.nodes[5]]}
write(resolve(root,"artifacts/visualizer/component-library.json"),compact)
write(resolve(root,"artifacts/visualizer/call-stack-excerpts/artifact.json"),{...compact,slug:"call-stack-excerpts",title:"Source excerpts through code and walkthrough"})
write(resolve(root,"artifacts/visualizer-pierre-trees-diffs/pierre-trees-diffs-demo.json"),{slug:"pierre-trees-diffs-demo",title:"File sources and code diffs",nodes:[{type:"file-tree",props:{items:[{name:"src",children:[{name:"logger.ts",content:"logger.info(message)",language:"typescript"}]}]}},fixture.nodes[2]]})
const sampleDir=resolve(root,"ai-artifacts/ui-v2/qa/corpus-v3")
const samplePath=resolve(sampleDir,"project-atlas__diagram-gallery.json")
const sample=JSON.parse(readFileSync(samplePath,"utf8"))
function rewrite(nodes:any[]){return nodes.map(node=>{
 if(node.children)node.children=rewrite(node.children)
 if(node.type!=="call-stack")return node
 const rows=normalizeCallStackRows(node.props.rows).rows,lines=rows.map(row=>`${"  ".repeat(row.depth)}${row.call}${row.at?` @ ${row.at}`:""}${row.note?` -- ${row.note}`:""}`)
 return {type:"walkthrough",props:{title:node.props.title??"Call outline",caption:"Call outline retained from the original diagram. This is not verified source.",files:[{path:"call-outline.txt",language:"text",code:lines.join("\n")}],steps:rows.slice(0,8).map((row,i)=>({lines:String(i+1),title:row.call.replace(/\*\*/g,"").slice(0,80),body:row.note}))}}
})}
sample.nodes=rewrite(sample.nodes)
const result=safeParseVisualArtifactSpec(sample);if(!result.success)throw result.error
write(samplePath,sample)
// Validate the actual stored fixture nodes, not their generator's types.
for(const node of fixture.nodes)if(!ArtifactNodeSchema.safeParse(node).success)throw new Error("Invalid fixture node")
console.log("Prepared cycle 1 fixture and repository-only rewrites")
