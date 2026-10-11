#!/usr/bin/env bash
# Headless captures for the library design pass.
# Usage: capture.sh <url> <out-prefix>   -> <out-prefix>-{1440,390}-{light,dark}.png
set -euo pipefail
url="$1"; out="$2"
S="lib-capture"
for theme in light dark; do
  for w in 1440 390; do
    h=$([ "$w" = 1440 ] && echo 900 || echo 844)
    agent-browser --session "$S" set viewport "$w" "$h" >/dev/null
    agent-browser --session "$S" set media "$theme" >/dev/null
    agent-browser --session "$S" open "$url" >/dev/null
    agent-browser --session "$S" eval "localStorage.setItem('visualizer-theme','$theme'); document.documentElement.classList.toggle('dark', '$theme'==='dark'); document.documentElement.dataset.theme='$theme'" >/dev/null
    agent-browser --session "$S" reload >/dev/null
    agent-browser --session "$S" wait 1500 >/dev/null
    agent-browser --session "$S" screenshot "${out}-${w}-${theme}.png" >/dev/null
    echo "${out}-${w}-${theme}.png"
  done
done
