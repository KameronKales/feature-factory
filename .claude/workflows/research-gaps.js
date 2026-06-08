// PROJECT-AGNOSTIC research workflow: audit ANY product for high-value gaps and emit a
// STRUCTURED, build-ready gap list that feeds .claude/workflows/build-gap.js.
//
// Everything domain-specific comes from `args` — there is NO product/domain baked in.
// Invoke with (all optional; you'll usually pass root + domains):
//   Workflow({ name: 'research-gaps', args: {
//     root: '/abs/path/to/your/repo',         // the project to audit (default: '.')
//     domains: ['onboarding','billing',...],  // areas to survey (default: generic taxonomy)
//     focus: 'what the product is really for', // overall lens
//     surface: 'its REST API + CLI',           // where the product's capabilities live
//     exclude: ['already-built-slug', ...],    // skip these
//   } })
//
// A worked EXAMPLE (a personal-finance product) lives in docs/FEATURE_FACTORY.md — copy it
// and swap in your own domains/surface. The workflow itself stays product-neutral.
//
// Output shape (each gap is directly consumable by build-gap):
//   { gaps: [ { slug, name, description, audience, evidence, recommended_tool,
//               distribution, skill_route, scope, priority } ] }
export const meta = {
  name: 'research-gaps',
  description: 'Audit YOUR product for high-value gaps; output a structured build-ready gap list',
  phases: [
    { title: 'Survey', detail: 'parallel domain auditors map coverage vs what the product should do' },
    { title: 'Rank', detail: 'verify, dedupe, exclude already-built, emit the build-ready structured list' },
  ],
}
// args arrives as a JSON STRING (the runtime passes Workflow `args` verbatim, unparsed) — parse it.
const A = typeof args === 'string' ? (args ? JSON.parse(args) : {}) : (args || {})
const ROOT = A.root || '.'
const exclude = A.exclude || []
const focus = A.focus || "the product's core value proposition and the user journeys it must support well"
const surface = A.surface || "the product's public surface — its API / CLI / MCP tool registry, exported modules, and core source"
// Generic product-audit taxonomy. Override with args.domains for your product (e.g. a
// finance product passes its own verticals; see docs/FEATURE_FACTORY.md).
const DOMAINS = (Array.isArray(A.domains) && A.domains.length) ? A.domains : [
  'core features / primary user journeys', 'reliability & error handling', 'security',
  'performance & scale', 'developer experience & onboarding', 'testing & observability',
  'integrations / API & extensibility', 'accessibility & UX', 'documentation',
]

phase('Survey')
const SURVEY = { type: 'object', additionalProperties: false, required: ['domain', 'covered', 'gaps'], properties: {
  domain: { type: 'string' }, covered: { type: 'string' },
  gaps: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['name', 'why', 'evidence'],
    properties: { name: { type: 'string' }, why: { type: 'string' }, evidence: { type: 'string' } } } } } }
const surveys = (await parallel(DOMAINS.map(d => () =>
  agent(`Project at ${ROOT}. Audit it for coverage/quality of: ${d}. DISCOVER the project's capabilities by reading ${surface} (find the actual entry points yourself — a tool/command registry, route table, package exports, etc.), then read the relevant source and GREP for this area's key topics to confirm what is genuinely covered vs missing or weak — verified by code evidence, never guessed. Overall product focus: ${focus}. Output: a one-line 'covered' summary, and concrete gaps with name, why-it-matters/audience, and the code evidence (file paths / counts / what's absent).`,
    { label: `survey:${d}`, phase: 'Survey', schema: SURVEY })))).filter(Boolean)
log(`Surveyed ${surveys.length} domains`)

phase('Rank')
const OUT = { type: 'object', additionalProperties: false, required: ['gaps'], properties: {
  gaps: { type: 'array', items: { type: 'object', additionalProperties: false,
    required: ['slug', 'name', 'description', 'audience', 'evidence', 'recommended_tool', 'distribution', 'skill_route', 'scope', 'priority'],
    properties: {
      slug: { type: 'string', description: 'kebab-case, e.g. recurring-billing' },
      name: { type: 'string' }, description: { type: 'string' }, audience: { type: 'string' },
      evidence: { type: 'string', description: 'verified coverage gap (grep/file evidence)' },
      recommended_tool: { type: 'string', description: 'proposed capability/tool name for the build' },
      distribution: { type: 'string', enum: ['new-skill', 'fold-in'] },
      skill_route: { type: 'string', description: 'new skill name (new-skill) OR existing skill(s) to fold into' },
      scope: { type: 'string', enum: ['full', 'lean'] },
      priority: { type: 'number', description: '1 = highest value' },
    } } } } }
const ranked = await agent(`Project at ${ROOT}. From the domain surveys, produce the FINAL build-ready gap list. Rules: (1) VERIFY each gap is genuinely missing (not already covered by an existing capability) — drop false positives. (2) EXCLUDE anything already built/in-flight: ${JSON.stringify(exclude)}. (3) Apply docs/FEATURE_PLAYBOOK.md defaults per gap: distribution='new-skill' only for a distinct high-intent capability with its own audience, else 'fold-in' (name the existing skill/module); scope='full' unless trivial. (4) Rank by value (1=highest). Output the structured gaps array.\n\nSURVEYS:\n${JSON.stringify(surveys, null, 2)}`,
  { label: 'rank', phase: 'Rank', schema: OUT })
log(`Build-ready gaps: ${ranked.gaps.length}`)
return ranked
