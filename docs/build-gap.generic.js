// DOMAIN-NEUTRAL STARTING POINT for .claude/workflows/build-gap.js.
//
// build-gap is the ONE workflow you adapt to your stack (research-gaps stays generic). The shipped
// .claude/workflows/build-gap.js is a worked FINANCE example. If you'd rather start from a blank
// architecture than strip the finance one, copy THIS file over it:
//   cp docs/build-gap.generic.js .claude/workflows/build-gap.js
// then fill in the four {{PLACEHOLDERS}} below. See docs/ADAPTING.md for a full walkthrough.
//
// What to fill in:
//   {{LAYER_KEYS}}        the disjoint layers your product ships per feature (e.g. core|api|web|dist)
//   {{LAYER_OWNERSHIP}}   which file paths each layer owns (must NOT overlap — they build in parallel)
//   {{LAYER_EXEMPLARS}}   an existing file per layer the agents should copy the pattern from
//   {{VERIFY_CHECKS}}     the exact local commands your pre-ship gate runs (all via safe-jest)
//
// Keep the spine (Investigate → Synthesize → Implement → Verify), keep safe-jest as the test runner,
// and keep remote repo create / merge / deploy as MAIN-LOOP steps after this returns.
export const meta = {
  name: 'build-gap',
  description: 'Build one product gap end-to-end across its layers (per docs/FEATURE_PLAYBOOK.md)',
  phases: [
    { title: 'Investigate', detail: 'read-only: references + exemplars per layer' },
    { title: 'Synthesize', detail: 'one build plan + reference targets + disjoint file groups' },
    { title: 'Implement', detail: 'shared layer first → dependent layers in parallel → distribution' },
    { title: 'Verify', detail: 'safe-jest suites + build + adversarial DoD check' },
  ],
}

// args arrives as a JSON STRING (the runtime passes Workflow `args` verbatim, unparsed) — parse it.
const gap = typeof args === 'string' ? JSON.parse(args) : (args || {})
const ROOT = gap.root || '.'
if (!gap.slug || !gap.recommended_tool) throw new Error('build-gap requires args = { slug, recommended_tool, ... }')
const TOOL = gap.recommended_tool
const SCOPE = gap.scope || 'full'

// The fixed layers your product ships per feature. EDIT THESE for your stack (see docs/ADAPTING.md).
// 'shared' is built first (others depend on it); the rest build in parallel; 'dist' is last.
const LAYERS = ['shared', 'api', 'web', 'dist'] // ← {{LAYER_KEYS}}

const CTX = `
Project ${ROOT}. READ docs/FEATURE_PLAYBOOK.md (the Definition of Done — follow every layer). Build this gap:
  slug: ${gap.slug}
  name: ${gap.name || gap.slug}
  what it answers: ${gap.description || ''}
  audience: ${gap.audience || ''}
  capability/tool name: ${TOOL}
  distribution: ${gap.distribution || 'fold-in'} -> ${gap.skill_route || '(closest existing surface)'}
  v1 scope: ${SCOPE}

LAYERS (fill in for your product — see docs/ADAPTING.md):
- shared: {{LAYER_OWNERSHIP — the pure, reusable core everything depends on; reuse existing modules, never duplicate}}.
- api:    {{LAYER_OWNERSHIP — the programmatic surface (REST/MCP/CLI), schema + contract test}}.
- web:    {{LAYER_OWNERSHIP — user-facing UI, wired into the product, plus a discoverability/docs entry}}.
- dist:   {{LAYER_OWNERSHIP — how the capability is packaged/announced}}.
EXEMPLARS to copy the pattern from: {{LAYER_EXEMPLARS — one existing file per layer}}.
TESTS: ALWAYS \`node scripts/safe-jest.mjs <paths>\` — NEVER bare \`npx jest\` (it can hang). Plus your build + lint.
`

phase('Investigate')
const FIND = { type: 'object', additionalProperties: false, required: ['area', 'findings'], properties: { area: { type: 'string' }, findings: { type: 'string' } } }
const inv = (await parallel(LAYERS.map(layer => () =>
  agent(`${CTX}\n\nINVESTIGATE (read-only) the "${layer}" layer: which existing modules/files to reuse, the exact contracts/formulas needed, the exemplar to copy, and (for the shared layer) proposed hand-computed reference targets. Output the layer's API/contract + plan.`,
    { label: `investigate:${layer}`, phase: 'Investigate', schema: FIND })))).filter(Boolean)
log(`Investigated ${inv.length} layers`)

phase('Synthesize')
const PLAN = { type: 'object', additionalProperties: false, required: ['shared_api', 'algorithm', 'reference_targets', 'groups'], properties: {
  shared_api: { type: 'string' }, algorithm: { type: 'string' }, reference_targets: { type: 'string' },
  groups: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['key', 'title', 'files', 'instructions'],
    properties: { key: { type: 'string', enum: LAYERS }, title: { type: 'string' }, files: { type: 'array', items: { type: 'string' } }, instructions: { type: 'string' } } } } } }
const plan = await agent(`${CTX}\n\nSynthesize ONE build plan: shared_api, algorithm, reference_targets (hand-computed), and DISJOINT-file groups keyed ${LAYERS.join('|')}. Files MUST NOT overlap across groups (the non-shared groups run in parallel after the shared one).\n\nFINDINGS:\n${JSON.stringify(inv, null, 2)}`, { label: 'synthesize', phase: 'Synthesize', schema: PLAN })
log(`Plan: ${plan.groups.length} groups`)
const G = k => plan.groups.find(x => x.key === k)
const brief = grp => `${CTX}\n\nshared_api: ${plan.shared_api}\nalgorithm: ${plan.algorithm}\nreference_targets: ${plan.reference_targets}\n\nIMPLEMENT group "${grp.title}" — edit ONLY: ${grp.files.join(', ')}. Add/update tests (run via safe-jest, never bare jest). Do NOT create remote repos or push. Report changes + any deviation.\n\n${grp.instructions}`

phase('Implement')
// Shared layer first (everything depends on it), then the dependent layers in parallel, then distribution.
const [SHARED, ...REST] = LAYERS
const sharedRep = await agent(brief(G(SHARED)), { label: `implement:${SHARED}`, phase: 'Implement' })
const parallelLayers = REST.filter(k => k !== 'dist')
const mid = (await parallel(parallelLayers.map(k => () =>
  agent(`${brief(G(k))}\n\nSHARED LAYER DONE:\n${sharedRep.slice(0, 400)}`, { label: `implement:${k}`, phase: 'Implement' })))).filter(Boolean)
const distRep = G('dist') ? await agent(`${brief(G('dist'))}\n\nUPSTREAM DONE:\n${[sharedRep, ...mid].map(r => r.slice(0, 180)).join('\n')}`, { label: 'implement:dist', phase: 'Implement' }) : null

phase('Verify')
const V = { type: 'object', additionalProperties: false, required: ['pass', 'summary', 'issues'], properties: { pass: { type: 'boolean' }, summary: { type: 'string' }, issues: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['severity', 'detail'], properties: { severity: { type: 'string', enum: ['blocker', 'major', 'minor'] }, detail: { type: 'string' }, file: { type: 'string' } } } } } }
const checks = await parallel([
  () => agent(`${CTX}\n\nRUN (use safe-jest — NEVER bare jest): {{VERIFY_CHECKS — your scoped suites}} ; your build ; your lint. Report pass/fail with exact errors. If safe-jest prints ::SAFE_JEST_TIMEOUT:: that's a HANG not a failure — report it as such.`, { label: 'verify:build-tests', phase: 'Verify', schema: V }),
  () => agent(`${CTX}\n\nADVERSARIAL: confirm the shared layer matches the hand-computed reference targets; the capability is reachable from every surface it should be (api/web/dist); and every FEATURE_PLAYBOOK DoD item is met. Flag any unmet DoD item as a blocker. Do NOT edit.`, { label: 'verify:correctness', phase: 'Verify', schema: V }),
])
return { slug: gap.slug, tool: TOOL, distribution: gap.distribution, skill_route: gap.skill_route, files: plan.groups.flatMap(g => g.files), reports: [sharedRep, ...mid, distRep].filter(Boolean), verdicts: checks.filter(Boolean) }
