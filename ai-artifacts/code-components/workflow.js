export const meta = {
  name: 'code-components-proposal',
  description: 'Research Plannotator code-review UI, oracle-review a VAR node proposal, revise',
  phases: [{ title: 'Research' }, { title: 'Oracle' }, { title: 'Revise' }],
}

const WT = '/Users/iurysouza/dev/worktrees/var/node-redesign'
const OUT = `${WT}/ai-artifacts/code-components`
const RULES = `You are a subagent. Don't run memo.
Read-only: do not edit source files. Do not commit, push, post or publish. The ONLY place you may write is ${OUT}/ (and only the file named below). Other workers are editing the worktree; touch nothing else.`

const CONTEXT = `Context: Visualizer ("VAR", visual-artifact renderer) at ${WT} is a JSON-to-UI runtime. Agents emit a constrained JSON artifact spec (Zod-validated contract in shared/src/contract.ts); a Next.js renderer (static export, served from disk) maps each node type to a trusted adapter under app/src/components/adapters/. A node redesign is in progress: see ai-artifacts/node-redesign/design-spec.md (editorial tone, no nested bordered boxes, dot-and-word status, tokens like --paper, --ink, --rule for light/dark).
Iury wants high-quality code components modelled on Plannotator's code-review UI: side-by-side diffs, code explainers with notes beside the code, and anything else from Plannotator that fits. They must look as good as Plannotator's.`

phase('Research')
const research = await agent(`${RULES}

${CONTEXT}

Task: research and write ${OUT}/research.md.

Part A - Plannotator (read its SOURCE, cite file paths):
- Local copies first: ~/.local/share/agents2/tools/plannotator-pi/0.28.10/ (has node_modules incl. @pierre/*), ~/.local/share/agents2/tools/plannotator/ and plannotator-opencode/, ~/dev/personal/others, ~/dev/personal/tools (grep -ril plannotator), ~/dev/personal/tools/agents2 catalog/locks (has the repo URL). Shipped bundles may be minified; if real source is not local, shallow-clone the GitHub repo into /tmp (e.g. git clone --depth 1 <url> /tmp/plannotator-src) and read it there. Say which copy and version you read.
- Work out: diff view (unified vs split, how diffs are parsed and laid out, word-level highlighting), code/file view, line comments and annotations (how notes attach to line ranges, gutter, threads), guided-review sections, syntax highlighting library (Shiki? Prism?), diff library (@pierre/diffs? diff? jsdiff?), virtualisation, theming and dark mode, CSS approach, bundle weight, licence (Plannotator and each library).

Part B - our side (read): ${WT}/AGENTS.md, ai-artifacts/ARCHITECTURE.md, ai-artifacts/node-redesign/design-spec.md, shared/src/contract.ts, shared/src/editorial-schemas.ts, the existing code, call-stack and execution-trace adapters under app/src/components/adapters/ (and their schemas/manifest entries), app/package.json (what highlighting we use now), and how the theme tokens and static export work.

Part C - proposal: 2 to 4 new or upgraded JSON nodes (e.g. "diff" with split/unified, "code-walkthrough" with margin notes per line range, maybe an upgraded "code"). For each: purpose, example JSON props (realistic, small), Zod shape sketch, what to port/adapt from Plannotator vs depend on as a library, files to add/change in our repo, bundle-size and static-export concerns (e.g. Shiki WASM/grammars loading from disk, server-side vs client-side highlighting at build time), dark-mode approach via our tokens, how it obeys the no-boxes design rules, overlap with existing nodes.

Write research.md in plain English, conclusion first, with Plannotator file paths cited. Your final reply: a 10-line summary and the path you wrote.`, { label: 'research', agentType: 'researcher' })

phase('Oracle')
const review = await agent(`${RULES}

${CONTEXT}

Task: review the research proposal at ${OUT}/research.md and write ${OUT}/oracle-review.md.
Verify claims by reading the code yourself where it matters (our repo at ${WT}; Plannotator paths cited in research.md, possibly under /tmp/plannotator-src or ~/.local/share/agents2/tools/plannotator-pi).
Review against: contract-as-handshake (JSON not code, Zod validation at CLI and renderer, pnpm export:contract); the node-redesign design rules in ai-artifacts/node-redesign/design-spec.md (no nested bordered boxes, dot-and-word status, editorial tone); static export (next build output served from disk, no server at view time); dark mode via tokens (--paper, --ink, --rule etc.); licence compatibility; bundle size; maintenance cost; overlap with existing nodes (code, call-stack, execution-trace and others in the manifest).
Give a verdict per proposed node: adopt / change / drop, with reasons and the concrete changes required. Also list factual errors in research.md, if any, and anything important it missed.
Your final reply: the verdict table and the path you wrote.

Research summary from the researcher:
${research ?? '(researcher returned nothing; read research.md directly)'}`, { label: 'oracle', agentType: 'oracle' })

phase('Revise')
const proposal = await agent(`${RULES}

${CONTEXT}

Task: write the final ${OUT}/proposal.md. Read ${OUT}/research.md and ${OUT}/oracle-review.md. Apply the oracle's verdicts: accept what is right; where you disagree, say so with reasons in a short "Where we disagree with the review" section. Do not rewrite research.md or oracle-review.md.
proposal.md must be plain English, conclusion first, short (aim for under 250 lines), sentence-case headings. Sections: Recommendation (which nodes, in what order); per node: purpose, example JSON, port vs depend plan with Plannotator paths and libraries, files to add/change; Risks; Open questions for Iury (concrete choices).
Your final reply: a 5-line summary of the recommendation and the path you wrote.

Oracle summary:
${review ?? '(oracle returned nothing; read oracle-review.md directly)'}`, { label: 'revise', agentType: 'researcher' })

return { research, review, proposal }
