"use client"
import { useEffect, useState } from "react"
import { DARK_CODE_THEME, getCodeHighlighter, LIGHT_CODE_THEME, normalizeCodeLanguage, useIsDarkTheme } from "@/lib/code-highlighting"
import { accessibleSyntaxColor } from "@/lib/code-contrast"
import type { Token } from "@/lib/code-lines"
export function useTokens(code:string,language="text") {
  const dark=useIsDarkTheme(), key=`${dark}\0${language}\0${code}`
  const [result,setResult]=useState<{key:string;lines:Token[][]}|null>(null)
  useEffect(()=>{
    let cancelled=false
    getCodeHighlighter().then(highlighter=>{
      const theme=dark?DARK_CODE_THEME:LIGHT_CODE_THEME
      const foreground=highlighter.getTheme(theme).fg
      const lines=highlighter.codeToTokens(code,{lang:normalizeCodeLanguage(language,highlighter),theme}).tokens.map(line=>line.map(token=>({...token,color:token.color?accessibleSyntaxColor(token.color,foreground,dark):foreground})))
      if(!cancelled) setResult({key,lines})
    }).catch(()=>{ if(!cancelled) setResult(null) })
    return ()=>{cancelled=true}
  },[code,language,dark,key])
  return result?.key===key?result.lines:null
}
