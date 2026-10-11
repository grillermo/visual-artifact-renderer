"use client"
import { useEffect, useRef, useState } from "react"
export function useContainerWidth<T extends HTMLElement>() {
  const ref=useRef<T>(null)
  const [width,setWidth]=useState(0)
  useEffect(()=>{
    const element=ref.current
    if(!element || typeof ResizeObserver==="undefined") return
    const observer=new ResizeObserver(entries=>setWidth(entries[0]?.contentRect.width??0))
    observer.observe(element)
    return ()=>observer.disconnect()
  },[])
  return {ref,width}
}
