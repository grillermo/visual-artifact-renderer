export function traceDepths(events:readonly {kind:string}[]) {
  let depth=0
  return events.map(event=>{
    if(event.kind==="return" || event.kind==="throw") depth=Math.max(0,depth-1)
    const current=depth
    if(event.kind==="call") depth++
    return current
  })
}
