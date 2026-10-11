"use client"
import { useEffect, useRef, useState } from "react"
/** Same 45% reading line as story; observer wakes it when steps enter the band. */
export function activeReadingStep(tops:readonly number[],height:number) {
  let active=0
  tops.forEach((top,i)=>{if(top<=height*.45) active=i})
  return active
}
export function useActiveStep(enabled:boolean,count:number) {
  const [active,setActive]=useState(0), refs=useRef<(HTMLElement|null)[]>([])
  useEffect(()=>{
    if(!enabled) return
    let frame=0
    const update=()=>{frame=0;setActive(activeReadingStep(refs.current.slice(0,count).map(el=>el?.getBoundingClientRect().top??Infinity),window.innerHeight))}
    const schedule=()=>{if(!frame) frame=requestAnimationFrame(update)}
    const observer=typeof IntersectionObserver!=="undefined"?new IntersectionObserver(schedule,{rootMargin:"-40% 0px -45% 0px",threshold:0}):null
    refs.current.forEach(el=>{if(el)observer?.observe(el)})
    window.addEventListener("scroll",schedule,{passive:true}); window.addEventListener("resize",schedule)
    return ()=>{observer?.disconnect();window.removeEventListener("scroll",schedule);window.removeEventListener("resize",schedule);if(frame)cancelAnimationFrame(frame)}
  },[enabled,count])
  return {active:Math.max(0,Math.min(active,count-1)),setActive,refs}
}
