// WORKED EXAMPLE — the build workflow for LogScope (a log-analytics SaaS), the second-domain twin
// of the finance build-gap that ships at .claude/workflows/build-gap.js. To run the factory AS
// LogScope, copy this over the live workflow:
//   cp docs/examples/log-analytics/build-gap.js .claude/workflows/build-gap.js
//
// Same spine as the finance example (Investigate → Synthesize → Implement → Verify) and same
// safe-jest gating; only the LAYER MODEL changed: query|api|web|cli with packages/* paths and a
// log-analytics Definition of Done (golden-query fixtures, retention/ACL through QueryPlan, the
// NotificationChannel abstraction, surface parity). See docs/examples/log-analytics/FEATURE_PLAYBOOK.md.
//
// Build ONE gap end-to-end per that playbook (query engine → tests → API ∥ web → CLI), using
// scripts/safe-jest.mjs so tests can't hang. Invoke with a single gap object (from research-gaps):
//   Workflow({ name: 'build-gap', args: { slug, name, description, audience,
//              recommended_tool, distribution: 'new-skill'|'fold-in', skill_route, scope } })
// Publish / tag / deploy are MAIN-LOOP steps after this returns.
export const meta = {
  name: 'build-gap',
  description: 'Build one LogScope capability across query engine, tests, API, web, and CLI (per the Feature Playbook)',
  phases: [
    { title: 'Investigate', detail: 'query refs + web IA + API/CLI pattern' },
    { title: 'Synthesize', detail: 'build plan + golden-query targets + disjoint groups' },
    { title: 'Implement', detail: 'query+tests → (api ∥ web) → cli' },
    { title: 'Verify', detail: 'safe-jest suites + build + adversarial DoD check' },
  ],
}
// args arrives as a JSON STRING (the runtime passes Workflow `args` verbatim, unparsed) — parse it.
const gap = typeof args === 'string' ? JSON.parse(args) : (args || {})
const ROOT = gap.root || '.'
if (!gap.slug || !gap.recommended_tool) throw new Error('build-gap requires args = { slug, recommended_tool, ... }')
const TOOL = gap.recommended_tool
const SCOPE = gap.scope || 'full'

const CTX = `
Project ${ROOT} (LogScope, a log-analytics SaaS). READ docs/FEATURE_PLAYBOOK.md (the Definition of Done — follow every layer). Build this gap:
  slug: ${gap.slug}
  name: ${gap.name || gap.slug}
  what it answers: ${gap.description || ''}
  audience: ${gap.audience || ''}
  capability/route name: ${TOOL}
  distribution: ${gap.distribution || 'fold-in'} -> ${gap.skill_route || '(closest existing command group)'}
  v1 scope: ${SCOPE}
QUERY ENGINE: pure, typed, reused by API + web + CLI; REUSE existing packages/query primitives (operators, TimeRange, aggregation fns) — never re-implement parsing or duplicate the operator table. Reads of stored events MUST go through the QueryPlan pipeline (parse→plan→evaluate) so they inherit indexing + retention + ACL. Notifications MUST flow through the shared NotificationChannel abstraction (one dispatch site, applied at scheduled + manual + backfill triggers). Pin GOLDEN-QUERY fixtures (recorded query + expected result). Coverage gate: 90% branch / 100% func on the new module.
API: thin handler over the engine in packages/api — add the route(s), update the OpenAPI schema, add a contract test. Web + CLI both call this route (single source of truth). Errors use the { code, message, details } envelope; register new codes in errors.ts. Enforce web/CLI surface parity (test/surface-parity.test.ts).
WEB: progressive-disclosure UI in apps/web (tab/panel/widget shown only when relevant) mirroring an exemplar panel (SavedQueryPanel) with empty/loading guards (must render unconfigured without throwing); wire the result into the query view / dashboard; add a nav entry + a docs page; e2e smoke under e2e/.
CLI: subcommand(s) in packages/cli calling the API route — if 'new-skill' -> a NEW top-level group \`logscope ${gap.slug}\`; if 'fold-in' -> subcommands under ${gap.skill_route}. Add --help text, examples, shell completion, and update the CLI reference docs. Do NOT publish or tag (main loop does that).
TESTS: ALWAYS \`node scripts/safe-jest.mjs <paths>\` — NEVER bare \`npx jest\` (it can hang). Plus \`npm run build\` + \`npm run lint\`. safe-jest.mjs is pure Node (any OS) and handles the hard timeout.
`

phase('Investigate')
const FIND = { type: 'object', additionalProperties: false, required: ['area', 'findings'], properties: { area: { type: 'string' }, findings: { type: 'string' } } }
const inv = (await parallel([
  () => agent(`${CTX}\n\nINVESTIGATE (read-only): query-engine references — which packages/query primitives + operators/fns to reuse, the QueryPlan pipeline + TimeRange util, the NotificationChannel abstraction, exact semantics this gap needs, and proposed golden-query targets. Output the engine API (typed I/O) + algorithm + targets.`, { label: 'investigate:query', phase: 'Investigate', schema: FIND }),
  () => agent(`${CTX}\n\nINVESTIGATE (read-only): web integration — the saved-query view, an exemplar panel (SavedQueryPanel) + its empty/loading guards, the dashboard wiring, the nav + docs site. Output the IA flow + file manifest, marking apps/web-only files (web group) so groups stay disjoint.`, { label: 'investigate:web', phase: 'Investigate', schema: FIND }),
  () => agent(`${CTX}\n\nINVESTIGATE (read-only): the API route + CLI command pattern — an exemplar route + its OpenAPI entry + contract test, the error envelope/errors.ts, the surface-parity test, and an exemplar CLI command group + completion. Output the route spec + the CLI plan for ${TOOL}.`, { label: 'investigate:api-cli', phase: 'Investigate', schema: FIND }),
])).filter(Boolean)
log(`Investigated ${inv.length} areas`)

phase('Synthesize')
const PLAN = { type: 'object', additionalProperties: false, required: ['engine_api', 'algorithm', 'reference_targets', 'groups'], properties: {
  engine_api: { type: 'string' }, algorithm: { type: 'string' }, reference_targets: { type: 'string' },
  groups: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['key', 'title', 'files', 'instructions'],
    properties: { key: { type: 'string', enum: ['query', 'api', 'web', 'cli'] }, title: { type: 'string' }, files: { type: 'array', items: { type: 'string' } }, instructions: { type: 'string' } } } } } }
const plan = await agent(`${CTX}\n\nSynthesize ONE build plan: engine_api (typed I/O), algorithm, reference_targets (golden queries), and 4 DISJOINT-file groups keyed query|api|web|cli. 'query' owns packages/query (module + tests + NotificationChannel/QueryPlan wiring); 'api' owns packages/api (route + OpenAPI + contract/parity tests); 'web' owns apps/web + e2e; 'cli' owns packages/cli + CLI docs. Files MUST NOT overlap across groups (api ∥ web run in parallel after query).\n\nFINDINGS:\n${JSON.stringify(inv, null, 2)}`, { label: 'synthesize', phase: 'Synthesize', schema: PLAN })
log(`Plan: ${plan.groups.length} groups`)
const G = k => plan.groups.find(x => x.key === k)
const brief = grp => `${CTX}\n\nengine_api: ${plan.engine_api}\nalgorithm: ${plan.algorithm}\nreference_targets: ${plan.reference_targets}\n\nIMPLEMENT group "${grp.title}" — edit ONLY: ${grp.files.join(', ')}. Add/update tests (run via safe-jest, never bare jest). Do NOT publish or tag. Report changes + any deviation.\n\n${grp.instructions}`

phase('Implement')
const engineRep = await agent(brief(G('query')), { label: 'implement:query', phase: 'Implement' })
const mid = (await parallel([
  () => agent(`${brief(G('api'))}\n\nQUERY ENGINE DONE:\n${engineRep.slice(0, 400)}`, { label: 'implement:api', phase: 'Implement' }),
  () => agent(`${brief(G('web'))}\n\nQUERY ENGINE DONE:\n${engineRep.slice(0, 400)}`, { label: 'implement:web', phase: 'Implement' }),
])).filter(Boolean)
const cliRep = await agent(`${brief(G('cli'))}\n\nQUERY+API+WEB DONE:\n${[engineRep, ...mid].map(r => r.slice(0, 180)).join('\n')}`, { label: 'implement:cli', phase: 'Implement' })

phase('Verify')
const V = { type: 'object', additionalProperties: false, required: ['pass', 'summary', 'issues'], properties: { pass: { type: 'boolean' }, summary: { type: 'string' }, issues: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['severity', 'detail'], properties: { severity: { type: 'string', enum: ['blocker', 'major', 'minor'] }, detail: { type: 'string' }, file: { type: 'string' } } } } } }
const checks = await parallel([
  () => agent(`${CTX}\n\nRUN (use safe-jest — NEVER bare jest): \`node scripts/safe-jest.mjs packages/query/src/__tests__/${gap.slug}\`; the API contract suite; the CLI integration suite; \`npm run build\`; \`npm run lint\`. Report pass/fail with exact errors. If safe-jest prints ::SAFE_JEST_TIMEOUT:: that's a HANG not a failure — report it as such.`, { label: 'verify:build-tests', phase: 'Verify', schema: V }),
  () => agent(`${CTX}\n\nADVERSARIAL: confirm the engine matches the golden-query targets; stored-event reads go through QueryPlan (retention+ACL honored) and notifications dispatch via NotificationChannel at every trigger site; the route is registered with OpenAPI + contract + surface-parity tests; the web panel renders unconfigured + is wired into the query view + has a nav/docs entry; the CLI command + completion + docs are done. Flag any FEATURE_PLAYBOOK DoD item not met as a blocker. Do NOT edit.`, { label: 'verify:correctness', phase: 'Verify', schema: V }),
])
return { slug: gap.slug, tool: TOOL, distribution: gap.distribution, skill_route: gap.skill_route, files: plan.groups.flatMap(g => g.files), reports: [engineRep, ...mid, cliRep], verdicts: checks.filter(Boolean) }
