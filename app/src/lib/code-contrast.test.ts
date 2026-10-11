import { test } from "node:test"
import assert from "node:assert/strict"
import { bundledThemes } from "shiki"
import { contrast, accessibleSyntaxColor, CODE_CONTRAST_SURFACES, WORD_CONTRAST_SURFACES } from "./code-contrast"
test("high-contrast theme foregrounds meet AA on code, row and word tints",async()=>{
  for(const dark of [false,true]){
    const name=dark?"github-dark-high-contrast":"github-light-high-contrast",theme=(await bundledThemes[name]()).default
    const foreground=theme.colors?.["editor.foreground"]??(dark?"#f0f3f6":"#0e1116")
    for(const setting of theme.tokenColors??[]) {
      const color=setting.settings.foreground
      if(!color)continue
      for(const context of ["row","word"] as const){
        const actual=accessibleSyntaxColor(color,foreground,dark,context)
        const surfaces=context==="word"?WORD_CONTRAST_SURFACES:CODE_CONTRAST_SURFACES
        for(const bg of surfaces[dark?"dark":"light"])assert.ok(contrast(actual,bg)>=4.5,`${name}: ${actual} on ${bg}`)
      }
    }
  }
})
test("regular github light comments fail on the warm surface, use theme ink",()=>{
  assert.ok(contrast("#66707b","#f1eee7")<4.5)
  assert.equal(accessibleSyntaxColor("#66707b","#0e1116",false),"#0e1116")
})
