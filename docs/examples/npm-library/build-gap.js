// WORKED EXAMPLE — the build workflow for slugify-pro (a single-package npm library), the
// minimal-shape twin of the finance build-gap. Two layers (core → dist), ONE test root (never
// --worker), NO UI/MCP. To run the factory AS this library, copy this over the live workflow:
//   cp docs/examples/npm-library/build-gap.js .claude/workflows/build-gap.js
//   node scripts/validate-build-gap.mjs
//
// Same spine (Investigate → Synthesize → Implement → Verify) + safe-jest gating as every other
// build-gap; only the layer model shrank. See docs/examples/npm-library/FEATURE_PLAYBOOK.md.
//   Workflow({ name: 'build-gap', args: { slug, name, description, audience, recommended_tool, scope } })
// npm publish / tag are MAIN-LOOP steps after this returns.
export const meta = {
  name: 'build-gap',
  description: 'Build one slugify-pro capability across the core library and its npm distribution',
  phases: [
    { title: 'Investigate', detail: 'core API refs + dist (README/CHANGELOG/semver)' },
    { title: 'Synthesize', detail: 'build plan + reference cases + disjoint groups' },
    { title: 'Implement', detail: 'core+tests → dist' },
    { title: 'Verify', detail: 'safe-jest + build + lint + npm pack + adversarial DoD check' },
  ],
}
const gap = typeof args === 'string' ? JSON.parse(args) : (args || {})
const ROOT = gap.root || '.'
if (!gap.slug || !gap.recommended_tool) throw new Error('build-gap requires args = { slug, recommended_tool, ... }')
const TOOL = gap.recommended_tool
const SCOPE = gap.scope || 'full'

// Two layers only. 'core' is built first; 'dist' depends on it. No UI, no second test root.
const LAYERS = ['core', 'dist']

const CTX = `
Project ${ROOT} (slugify-pro, a single-package npm library). READ docs/FEATURE_PLAYBOOK.md (the DoD — follow every layer). Build this gap:
  slug: ${gap.slug}
  name: ${gap.name || gap.slug}
  what it answers: ${gap.description || ''}
  audience: ${gap.audience || ''}
  capability: ${TOOL}
  v1 scope: ${SCOPE}
CORE: pure, fully-typed function(s) in src/${gap.slug}.ts; REUSE existing normalize/transliterate helpers, never duplicate them. Export from src/index.ts ONLY if the spec says it's public (semver-aware: additive=minor, behavior change=major). Pin hand-written reference cases incl. unicode/empty/collision edges. Coverage gate: 100% func / 90% branch on the new module.
DIST: update README.md (usage + a FICTIONAL example) + CHANGELOG.md + the package.json version bump per semver. Do NOT run npm publish (main loop does that).
TESTS: ONE test root — \`node scripts/safe-jest.mjs src/__tests__/${gap.slug}\`. NEVER bare jest, NEVER --worker (there is no second root). Then \`npm run build\` (types) + \`npm run lint\` + \`npm pack --dry-run\`.
`

phase('Investigate')
const FIND = { type: 'object', additionalProperties: false, required: ['area', 'findings'], properties: { area: { type: 'string' }, findings: { type: 'string' } } }
const inv = (await parallel(LAYERS.map(layer => () =>
  agent(`${CTX}\n\nINVESTIGATE (read-only) the "${layer}" layer: which existing code to reuse, the exact contract, the exemplar to copy, and (for core) proposed hand-written reference cases + semver impact. Output the layer's API/plan.`,
    { label: `investigate:${layer}`, phase: 'Investigate', schema: FIND })))).filter(Boolean)
log(`Investigated ${inv.length} layers`)

phase('Synthesize')
const PLAN = { type: 'object', additionalProperties: false, required: ['core_api', 'algorithm', 'reference_cases', 'groups'], properties: {
  core_api: { type: 'string' }, algorithm: { type: 'string' }, reference_cases: { type: 'string' },
  groups: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['key', 'title', 'files', 'instructions'],
    properties: { key: { type: 'string', enum: LAYERS }, title: { type: 'string' }, files: { type: 'array', items: { type: 'string' } }, instructions: { type: 'string' } } } } } }
const plan = await agent(`${CTX}\n\nSynthesize ONE build plan: core_api (typed I/O), algorithm, reference_cases (hand-written), and 2 DISJOINT-file groups keyed core|dist. 'core' owns src/ (module + tests + the index.ts export); 'dist' owns README.md + CHANGELOG.md + package.json. Files MUST NOT overlap.\n\nFINDINGS:\n${JSON.stringify(inv, null, 2)}`, { label: 'synthesize', phase: 'Synthesize', schema: PLAN })
log(`Plan: ${plan.groups.length} groups`)
const G = k => plan.groups.find(x => x.key === k)
const brief = grp => `${CTX}\n\ncore_api: ${plan.core_api}\nalgorithm: ${plan.algorithm}\nreference_cases: ${plan.reference_cases}\n\nIMPLEMENT group "${grp.title}" — edit ONLY: ${grp.files.join(', ')}. Add/update tests (run via safe-jest, never bare jest). Do NOT publish. Report changes + any deviation.\n\n${grp.instructions}`

phase('Implement')
const coreRep = await agent(brief(G('core')), { label: 'implement:core', phase: 'Implement' })
const distRep = await agent(`${brief(G('dist'))}\n\nCORE DONE:\n${coreRep.slice(0, 400)}`, { label: 'implement:dist', phase: 'Implement' })

phase('Verify')
const V = { type: 'object', additionalProperties: false, required: ['pass', 'summary', 'issues'], properties: { pass: { type: 'boolean' }, summary: { type: 'string' }, issues: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['severity', 'detail'], properties: { severity: { type: 'string', enum: ['blocker', 'major', 'minor'] }, detail: { type: 'string' }, file: { type: 'string' } } } } } }
const checks = await parallel([
  () => agent(`${CTX}\n\nRUN (use safe-jest — NEVER bare jest, NEVER --worker): \`node scripts/safe-jest.mjs src/__tests__/${gap.slug}\`; \`npm run build\`; \`npm run lint\`; \`npm pack --dry-run\`. Report pass/fail with exact errors. If safe-jest prints ::SAFE_JEST_TIMEOUT:: that's a HANG not a failure — report it as such.`, { label: 'verify:build-tests', phase: 'Verify', schema: V }),
  () => agent(`${CTX}\n\nADVERSARIAL: confirm core matches the hand-written reference cases (incl. unicode/empty/collision); the export surface in index.ts is exactly what the spec declared (no accidental public API); the semver bump matches the change; README + CHANGELOG updated; the npm tarball contains the intended files. Flag any unmet DoD item as a blocker. Do NOT edit.`, { label: 'verify:correctness', phase: 'Verify', schema: V }),
])
return { slug: gap.slug, tool: TOOL, scope: SCOPE, files: plan.groups.flatMap(g => g.files), reports: [coreRep, distRep], verdicts: checks.filter(Boolean) }
