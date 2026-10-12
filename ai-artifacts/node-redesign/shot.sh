#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 2 ]]; then
  printf 'Usage: %s <url> <outprefix>\n' "$0" >&2
  exit 2
fi

url=$1
prefix=$2
root=$(cd "$(dirname "$0")/../.." && pwd)
mkdir -p "$(dirname "$prefix")"
prefix="$(cd "$(dirname "$prefix")" && pwd)/$(basename "$prefix")"
cd "$root"
session="$(agent-browser session id --scope worktree --prefix node-redesign-shot)-$$"
ab() { agent-browser --session "$session" --headed false "$@"; }
trap 'ab close >/dev/null 2>&1 || true' EXIT

ab open "$url"
ab wait 'main'
for theme in light dark; do
  for size in desktop mobile; do
    if [[ $size == desktop ]]; then
      ab set viewport 1440 1000
    else
      ab set viewport 390 844
    fi
    ab set media "$theme" reduced-motion
    # next-themes reads this key on reload and sets the root class itself.
    ab eval "localStorage.setItem('visualizer-theme', '$theme')"
    ab reload
    ab wait 'main'
    ab wait --fn "document.documentElement.classList.contains('$theme')"
    ab eval 'document.fonts.ready.then(() => true)'
    ab wait --fn 'Array.from(document.images).every(image => image.complete)'
    # Mermaid loads asynchronously after fonts and can outlast two frames.
    ab wait --fn '!document.querySelector("main").textContent.includes("Rendering Mermaid")'
    # Allow two painted frames after fonts, theme and viewport settle.
    ab eval 'new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve(true))))'
    ab screenshot --full "${prefix}-${theme}-${size}.png"
  done
done
