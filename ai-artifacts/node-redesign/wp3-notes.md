# WP3 notes: diagrams

## What changed
- `app/src/lib/diagram/label-placement.ts` (pure): candidate positions along each edge, checked against node and label rects. Falls back to a numbered marker with a legend line.
- `app/src/lib/diagram/map-layout.ts` (pure): layered / grid / hub layout, edge routing, back edges on an outside lane, near-aligned ends snapped straight. `bestOrientation` picks row or column to fit the width.
- `plan/diagram-svg.tsx`: `MapSvg`, `MapFigure`, `MapLegend`, hooks `useElementSize`, `usePrefersReducedMotion`. Old `ArrowDefs`, `DiagramCanvas`, `EdgeLabel` kept for state-machine, with open-stroke arrowheads.
- `map`, `box-diagram` (legacy, same renderer), `story`, `steps`, `sequence-diagram`, `state-machine`: no outer panel, text nodes with a glyph and hairline underline, signal-new for key steps.
- `story`: sticky diagram (top on narrow screens, left at 1100px+), IntersectionObserver picks the beat, earlier beats stay visible, focus dims the rest. Reduced motion and the pre-hydration render show the whole diagram.
- Edge summary is in `sr-only` text for screen readers.

## Tests
- `map-layout.test.ts`: weekly report's three box-diagrams, row and column: no label/node overlap (5px clearance), no label/label overlap, no edge through a third node, no markers. Plus `placeEdgeLabel` unit tests.
- `pnpm lint` clean, `pnpm test` 173 pass, 0 fail.

## Fixture
Store `node-redesign/wip-wp3`, spec `wip/wp3-spec.json`, shots `wip/wp3-{light,dark}-{desktop,mobile}.png`.

## Known gaps
- Story diagram sits at the sticky column's natural size, so it looks small beside the text on desktop. Scale-up could be added.
- Sequence `key` indexes count from 0 over all steps, dividers and notes included.
- I only re-viewed light desktop after the final routing change; dark and mobile were captured but only lightly inspected.
- No schema requests.
