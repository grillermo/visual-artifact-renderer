// Character-width estimate (px) for SVG text we lay out ourselves, without measuring the DOM.

const NARROW = new Set("iljtfr.,;:'!|()[] /-\u2019")
const WIDE = new Set("mwMW@")

export function estimateTextWidth(text: string, fontSize: number, options: { mono?: boolean; bold?: boolean } = {}): number {
  if (options.mono) return text.length * fontSize * 0.6
  let em = 0
  for (const ch of text) {
    if (NARROW.has(ch)) em += 0.32
    else if (WIDE.has(ch)) em += 0.88
    else if (ch >= "A" && ch <= "Z") em += 0.66
    else if (ch >= "0" && ch <= "9") em += 0.57
    else em += 0.54
  }
  return em * fontSize * (options.bold ? 1.07 : 1.03)
}
