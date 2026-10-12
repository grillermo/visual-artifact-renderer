import { test } from "node:test"
import assert from "node:assert/strict"
import { ArtifactNodeSchema } from "./artifact-manifest"
const valid=(props:unknown,type="code")=>ArtifactNodeSchema.safeParse({type,props})
test("ranged notes validate overlap, ordering, text and side",()=>{
  assert.equal(valid({code:"one\ntwo\nthree",annotations:[{line:1,end:2,title:"Range",text:"one",tone:"idea"}]}).success,true)
  for(const annotations of [[{line:2,end:1,title:"Bad"}],[{line:1,end:2,title:"A"},{line:2,title:"B"}],[{line:1,title:"A",text:"absent"}],[{line:1,title:"A",side:"old"}]]) assert.equal(valid({code:"one\ntwo",annotations}).success,false)
})
test("code source is exclusive and capped with actionable errors",()=>{
  for(const props of [{before:"a"},{code:"a",before:"a",after:"b"},{code:"x\n".repeat(401)},{code:"x".repeat(24577)}]) { const result=valid(props); assert.equal(result.success,false) }
  const result=valid({code:"x\n".repeat(401)}); if(!result.success) assert.match(result.error.message,/split the excerpt or use walkthrough/)
  assert.equal(valid({before:"",after:"a"}).success,true)
  assert.equal(valid({before:"",after:"a",annotations:[{line:1,title:"No old row",side:"old"}]}).success,false)
})
test("diff notes reject green/warning, accept ranged old and new notes",()=>{
  for(const tone of ["ok","warn"]) assert.equal(valid({before:"a",after:"b",annotations:[{line:1,title:"Note",tone}]}).success,false)
  assert.equal(valid({before:"a",after:"b",annotations:[{line:1,title:"Old",side:"old",tone:"risk",text:"a"},{line:1,title:"New",side:"new",tone:"idea",text:"b"}]}).success,true)
})
test("walkthrough file and step bounds",()=>{
  const files=[{path:"a.ts",code:"one\ntwo"}], steps=[{lines:"1",title:"One"},{lines:"2",title:"Two"}]
  assert.equal(valid({files,steps},"walkthrough").success,true)
  assert.equal(valid({files,steps:[steps[0]]},"walkthrough").success,false)
  assert.equal(valid({files,steps:[steps[0],{lines:"3",title:"Out"}]},"walkthrough").success,false)
  assert.equal(valid({files:[...files,{path:"b.ts",code:"x"}],steps},"walkthrough").success,false)
  assert.equal(valid({files,steps:steps.map(s=>({...s,file:"missing"}))},"walkthrough").success,false)
})
test("major three rejects removed code aliases",()=>{for(const type of ["call-stack","code-block","diff","log"]) assert.equal(valid({code:"a"},type).success,false)})
