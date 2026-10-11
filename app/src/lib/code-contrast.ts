/** WCAG contrast for opaque theme JSON colours. */
export function luminance(hex:string) {
  const rgb=hex.replace(/^#/,"").match(/../g)?.slice(0,3).map(c=>parseInt(c,16)/255)
  if(!rgb || rgb.length!==3) throw new Error(`Expected opaque RGB theme colour: ${hex}`)
  const linear=rgb.map(c=>c<=.04045?c/12.92:((c+.055)/1.055)**2.4)
  return linear[0]*.2126+linear[1]*.7152+linear[2]*.0722
}
export function contrast(a:string,b:string){const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05)}
// Conservative bounds include the code surface, row tints and word tints.
// A failing syntax colour uses the theme's own foreground, never a new colour.
export const CODE_CONTRAST_SURFACES={light:["#f1eee7","#d4d0c8"],dark:["#1c1b18","#49433d"]} as const
export function accessibleSyntaxColor(color:string,foreground:string,dark:boolean){return CODE_CONTRAST_SURFACES[dark?"dark":"light"].every(bg=>contrast(color,bg)>=4.5)?color:foreground}
