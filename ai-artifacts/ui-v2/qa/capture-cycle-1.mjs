import { execFileSync } from "node:child_process"
import { readFileSync, writeFileSync, mkdirSync } from "node:fs"
import { resolve } from "node:path"
const root=resolve(import.meta.dirname,"../../.."),out=resolve(import.meta.dirname,"cycle-1")
mkdirSync(out,{recursive:true})
const samples=JSON.parse(readFileSync(resolve(import.meta.dirname,"samples-v3.json"),"utf8"))
const cases=samples.map(s=>({project:s.after.project,slug:s.after.slug,title:s.title}))
cases.push({project:"ui-v2",slug:"code-walkthrough-fixture",title:"Code walkthrough acceptance"})
const ab=(...args)=>execFileSync("agent-browser",["--headed","false","--session","cycle1-ui-v2",...args],{encoding:"utf8",env:{...process.env,VISUAL_ARTIFACT_OPEN:"0",AGENT_BROWSER_SKILLS_DIR:resolve(process.env.HOME,".agents/agent-browser/skill-data")},timeout:60000}).trim()
const evaluation=js=>JSON.parse(JSON.parse(ab("eval",`JSON.stringify(${js})`)))
const diagramsReady=`[...document.querySelectorAll('.va-map-drawing')].every(el=>getComputedStyle(el).display==='none'||!!el.querySelector('.mm-canvas svg')) && [...document.querySelectorAll('[data-story]')].every(el=>!!el.querySelector('.mm-canvas svg')) && !document.body.innerText.includes('Rendering Mermaid')`
const retry=process.argv.includes("--retry-failed"),codeOnly=process.argv.includes("--code-only")
const codeSlugs=new Set(["project-atlas-diagram-gallery","project-atlas-pi-extensions-how-it-works","project-atlas-var-how-it-works","nice-mermaid-nvim-nice-mermaid-inline-render-pipeline","dotfiles-cloud-agent-box-guided-tour","code-walkthrough-fixture"])
const results=retry||codeOnly?JSON.parse(readFileSync(resolve(out,"results.json"),"utf8")).filter(r=>r.pass && (!codeOnly || !codeSlugs.has(r.slug))):[]
ab("open","http://localhost:9991/")
for(const item of cases)for(const width of [1440,390])for(const theme of ["light","dark"]){
  if(codeOnly && !codeSlugs.has(item.slug))continue
  if(retry && results.some(r=>r.project===item.project && r.slug===item.slug && r.width===width && r.theme===theme && r.pass))continue
  const key=`${item.project}__${item.slug}__${width}__${theme}`
  try{
    ab("set","viewport",String(width),"900")
    ab("set","media",theme)
    ab("eval",`localStorage.setItem('theme','${theme}')`)
    ab("console","--clear");ab("errors","--clear")
    ab("open",`http://localhost:9991/${item.project}/${item.slug}/`)
    ab("wait","--fn",`document.readyState==='complete' && !!document.querySelector('button[aria-label="Comments"]') && !document.querySelector('button[aria-label="Toggle dark mode"]')?.textContent.includes('Theme') && document.documentElement.classList.contains('dark')===${theme==="dark"}`)
    ab("wait","--fn","!document.querySelector('.va-code') || !!document.querySelector('.va-code-row code span[style]')")
    ab("eval",`(() => {const button=document.querySelector('button[aria-label="Comments"]');if(button.getAttribute('aria-pressed')!=='true')button.click()})()`)
    ab("wait","--fn","!!document.querySelector('button[aria-label=\"Comments\"][aria-pressed=\"true\"]')")
    ab("wait","--fn",diagramsReady)
    ab("eval","(async()=>{for(const d of document.querySelectorAll('details:not(.va-trace-stack details):not(.va-walkthrough details)'))d.open=true;const h=document.documentElement.scrollHeight;for(let y=0;y<h;y+=700){window.scrollTo(0,y);await new Promise(r=>requestAnimationFrame(r))}window.scrollTo(0,0)})()")
    ab("wait","--fn",diagramsReady)
    // No accessibility snapshot before hydration. Its injected click IDs can cause React diagnostics.
    ab("wait","--fn","!document.querySelector('.va-code') || !!document.querySelector('.va-code-row code span[style]')")
    const metrics=evaluation(`({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,dark:document.documentElement.classList.contains('dark'),comments:!!document.querySelector('button[aria-label="Comments"][aria-pressed="true"]'),invalid:/Invalid artifact|Artifact validation|failed to load artifact/i.test(document.body.innerText),codeCount:document.querySelectorAll('.va-code').length,codeRects:[...document.querySelectorAll('.va-code')].map(e=>({top:e.getBoundingClientRect().top+scrollY,height:e.getBoundingClientRect().height,width:e.getBoundingClientRect().width})),walkthroughCount:document.querySelectorAll('.va-walkthrough').length,traceCount:document.querySelectorAll('.va-execution-trace').length,rails:[...document.querySelectorAll('.va-code-rail')].map(rail=>({width:rail.getBoundingClientRect().width,connectors:rail.querySelectorAll('[data-connector]').length})),traceCollapsed:[...document.querySelectorAll('.va-trace-stack details')].every(d=>!d.open)})`)
    const consoleLog=JSON.parse(ab("console","--json")),errors=JSON.parse(ab("errors","--json"))
    const messages=(consoleLog.data?.messages??[]).filter(message=>message.type==="error"),pageErrors=errors.data?.errors??[]
    const file=`${key}.png`
    ab("screenshot","--full",resolve(out,file))
    results.push({project:item.project,slug:item.slug,width,theme,...metrics,consoleErrors:messages.map(m=>m.text),pageErrors,file,pass:metrics.scrollWidth<=width && !metrics.invalid && metrics.comments && messages.length===0 && pageErrors.length===0})
    console.log(`${key}: ${results.at(-1).pass?"PASS":"FAIL"} code=${metrics.codeCount} overflow=${metrics.scrollWidth-width} errors=${messages.length+pageErrors.length}`)
  }catch(error){results.push({project:item.project,slug:item.slug,width,theme,pass:false,error:String(error.stderr??error.message).slice(0,500)});console.error(key,error.message)}
  writeFileSync(resolve(out,"results.json"),JSON.stringify(results,null,2)+"\n")
}
ab("close")
if(results.some(r=>!r.pass))process.exitCode=1
