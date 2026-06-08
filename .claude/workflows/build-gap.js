// ⚠️ CUSTOMIZE-PER-PROJECT TEMPLATE (worked example: a finance web-app + MCP product).
// Unlike research-gaps.js (which is fully product-neutral), build-gap encodes a concrete
// ARCHITECTURE: a four-layer engine|mcp|web|skill model with specific paths (src/lib,
// workers/ai-mcp, src/components, skills/) and a finance-shaped Definition of Done. That
// coupling is intentional — the build step is where you adapt the factory to YOUR stack.
// To reuse: keep the Investigate→Synthesize→Implement→Verify spine + safe-jest gating, and
// REPLACE the layer keys, file groups, exemplar components, and DoD checks with your own
// (and point docs/FEATURE_PLAYBOOK.md at your DoD). See docs/FEATURE_FACTORY.md.
//
// Build ONE gap end-to-end per docs/FEATURE_PLAYBOOK.md (engine → tests → web IA + homepage
// → MCP → distribution), using scripts/safe-jest.mjs so tests can't hang. Invoke with a
// single gap object (from research-gaps) as args:
//   Workflow({ name: 'build-gap', args: { slug, name, description, audience,
//              recommended_tool, distribution: 'new-skill'|'fold-in', skill_route, scope } })
// Remote repo create / first-sync / merge / deploy are MAIN-LOOP steps after this returns.
export const meta = {
  name: 'build-gap',
  description: 'Build one financial-toolset gap across engine, tests, web IA, MCP, and distribution (per the Feature Playbook)',
  phases: [
    { title: 'Investigate', detail: 'engine refs + web IA + MCP/skill pattern' },
    { title: 'Synthesize', detail: 'build plan + reference targets + disjoint groups' },
    { title: 'Implement', detail: 'engine+tests → (MCP ∥ web+homepage) → distribution' },
    { title: 'Verify', detail: 'safe-jest suites + build + adversarial DoD check' },
  ],
}
// args arrives as a JSON STRING (the runtime passes Workflow `args` verbatim, unparsed) — parse it.
const gap = typeof args === 'string' ? JSON.parse(args) : (args || {})
// Repo root: pass `root` in args to run this in any project. The workflow sandbox
// has no process/cwd access, so it can't be auto-detected — default is this repo.
const ROOT = gap.root || '.'
if (!gap.slug || !gap.recommended_tool) throw new Error('build-gap requires args = { slug, recommended_tool, ... }')
const TOOL = gap.recommended_tool
const SCOPE = gap.scope || 'full'

const CTX = `
Project ${ROOT}. READ docs/FEATURE_PLAYBOOK.md (the Definition of Done — follow every layer) + SKILL_STRATEGY.md (authoring principles). Build this gap:
  slug: ${gap.slug}
  name: ${gap.name || gap.slug}
  what it answers: ${gap.description || ''}
  audience: ${gap.audience || ''}
  MCP tool name: ${TOOL}
  distribution: ${gap.distribution || 'fold-in'} -> ${gap.skill_route || '(closest existing skill)'}
  v1 scope: ${SCOPE}
ENGINE: pure, Zod-typed, reused by web + worker; REUSE existing src/lib modules (federal-tax, state-tax, tax-limits, etc.) — never duplicate brackets/limits; 2026 via DEFAULT_TAX_YEAR. Pin HAND-COMPUTED reference scenarios in the test suite. Coverage gate: 90% branch / 100% func on the engine module.
MCP: thin SELF-ORCHESTRATING adapter — registerTool (→ structuredContent), assumed_defaults[], share_url when a plan is in scope, next_actions, disclosures, _meta; optional plan_id via resolvePlan. Wire into tool-names.ts + index.ts + lib/tool-edges.ts + test/all-tools-smoke.test.ts (count). Use lib/assumed-defaults.ts + lib/share.ts.
WEB IA: progressive-disclosure input + a dedicated results panel mirroring EquityCompensationPanel/AdvancedTaxesPanel (with the typeof==='number' 'Calculating…' guard); wire the result into the forecast (shared-model); command-palette entry; an e2e smoke under e2e/; AND surface the feature on the marketing homepage feature list (locate the homepage/landing route).
DISTRIBUTION: if 'new-skill' -> node scripts/new-skill.mjs ${gap.slug} then fill SKILL.md/README (thin, fictional examples) + cross-link; if 'fold-in' -> add ${TOOL} to the SKILL.md of ${gap.skill_route} (+ cross-link). Either way update the catalog marketplace. Do NOT create remote repos or push (main loop does that).
TESTS: ALWAYS use \`node scripts/safe-jest.mjs <paths>\` (root) / \`node scripts/safe-jest.mjs --worker\` — NEVER bare \`npx jest\` (it can hang). Web: \`npm run build\` + \`npm run lint\`. safe-jest.mjs is pure Node (any OS) and handles the hard timeout.
`

phase('Investigate')
const FIND = { type: 'object', additionalProperties: false, required: ['area', 'findings'], properties: { area: { type: 'string' }, findings: { type: 'string' } } }
const inv = (await parallel([
  () => agent(`${CTX}\n\nINVESTIGATE (read-only): engine references — which existing src/lib modules + constants/fns to reuse, the exact formulas this gap needs, and proposed hand-computed reference-scenario targets. Output the engine API (Zod I/O) + algorithm + reference targets.`, { label: 'investigate:engine', phase: 'Investigate', schema: FIND }),
  () => agent(`${CTX}\n\nINVESTIGATE (read-only): web integration — the inputs panel, an exemplar form + results panel (EquityCompensationPanel/AdvancedTaxesPanel), CommandPalette, useCalculations, shared-model, AND the marketing homepage/landing route + its feature list. Output the IA flow + file manifest, marking UI-only files (web group) vs model/shared-model (engine group) so groups stay disjoint.`, { label: 'investigate:web', phase: 'Investigate', schema: FIND }),
  () => agent(`${CTX}\n\nINVESTIGATE (read-only): the MCP adapter + distribution pattern — an exemplar self-orchestrating tool, envelope/assumed-defaults/share libs, the registration sites + smoke test, and the factory (new-skill.mjs) / target skill dir. Output the adapter spec + the distribution plan for ${TOOL}.`, { label: 'investigate:mcp-skill', phase: 'Investigate', schema: FIND }),
])).filter(Boolean)
log(`Investigated ${inv.length} areas`)

phase('Synthesize')
const PLAN = { type: 'object', additionalProperties: false, required: ['engine_api', 'algorithm', 'reference_targets', 'groups'], properties: {
  engine_api: { type: 'string' }, algorithm: { type: 'string' }, reference_targets: { type: 'string' },
  groups: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['key', 'title', 'files', 'instructions'],
    properties: { key: { type: 'string', enum: ['engine', 'mcp', 'web', 'skill'] }, title: { type: 'string' }, files: { type: 'array', items: { type: 'string' } }, instructions: { type: 'string' } } } } } }
const plan = await agent(`${CTX}\n\nSynthesize ONE build plan: engine_api (Zod I/O), algorithm, reference_targets (hand-computed), and 4 DISJOINT-file groups keyed engine|mcp|web|skill. 'engine' owns src/lib (module + tests + shared-model wiring); 'web' owns src/components + src/app (incl homepage) + e2e; 'mcp' owns workers/ai-mcp; 'skill' owns skills/ + marketplace + factory. Files MUST NOT overlap across groups (mcp ∥ web run in parallel after engine).\n\nFINDINGS:\n${JSON.stringify(inv, null, 2)}`, { label: 'synthesize', phase: 'Synthesize', schema: PLAN })
log(`Plan: ${plan.groups.length} groups`)
const G = k => plan.groups.find(x => x.key === k)
const brief = grp => `${CTX}\n\nengine_api: ${plan.engine_api}\nalgorithm: ${plan.algorithm}\nreference_targets: ${plan.reference_targets}\n\nIMPLEMENT group "${grp.title}" — edit ONLY: ${grp.files.join(', ')}. Add/update tests (run via safe-jest, never bare jest). Do NOT create remote repos or push. Report changes + any deviation.\n\n${grp.instructions}`

phase('Implement')
const engineRep = await agent(brief(G('engine')), { label: 'implement:engine', phase: 'Implement' })
const mid = (await parallel([
  () => agent(`${brief(G('mcp'))}\n\nENGINE DONE:\n${engineRep.slice(0, 400)}`, { label: 'implement:mcp', phase: 'Implement' }),
  () => agent(`${brief(G('web'))}\n\nENGINE DONE:\n${engineRep.slice(0, 400)}`, { label: 'implement:web', phase: 'Implement' }),
])).filter(Boolean)
const skillRep = await agent(`${brief(G('skill'))}\n\nENGINE+MCP+WEB DONE:\n${[engineRep, ...mid].map(r => r.slice(0, 180)).join('\n')}`, { label: 'implement:skill', phase: 'Implement' })

phase('Verify')
const V = { type: 'object', additionalProperties: false, required: ['pass', 'summary', 'issues'], properties: { pass: { type: 'boolean' }, summary: { type: 'string' }, issues: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['severity', 'detail'], properties: { severity: { type: 'string', enum: ['blocker', 'major', 'minor'] }, detail: { type: 'string' }, file: { type: 'string' } } } } } }
const checks = await parallel([
  () => agent(`${CTX}\n\nRUN (use safe-jest — NEVER bare jest): \`node scripts/safe-jest.mjs src/lib/__tests__/${gap.slug}\`; \`node scripts/safe-jest.mjs --worker\`; \`npm run build\`; \`npm run lint\`; worker tsc. Report pass/fail with exact errors. Pre-existing (don't attribute): persistence.test.ts parse error, dashboard speculative TS. If safe-jest prints ::SAFE_JEST_TIMEOUT:: that's a HANG not a failure — report it as such.`, { label: 'verify:build-tests', phase: 'Verify', schema: V }),
  () => agent(`${CTX}\n\nADVERSARIAL: confirm the engine matches the hand-computed reference targets; ${TOOL} is registered (tool-names+index+edges+smoke) and returns assumed_defaults[]+share_url+structuredContent; the web panel is wired into the forecast with progressive disclosure + command-palette entry + HOMEPAGE feature-list update; distribution done (skill SKILL.md + marketplace). Flag any FEATURE_PLAYBOOK DoD item not met as a blocker. Do NOT edit.`, { label: 'verify:correctness', phase: 'Verify', schema: V }),
])
return { slug: gap.slug, tool: TOOL, distribution: gap.distribution, skill_route: gap.skill_route, files: plan.groups.flatMap(g => g.files), reports: [engineRep, ...mid, skillRep], verdicts: checks.filter(Boolean) }
