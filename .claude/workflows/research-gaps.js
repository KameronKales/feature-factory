// ⚠️ EXAMPLE WORKFLOW — the domain list + prompts below are a worked example (a personal-finance
// product). Replace the DOMAINS / focus / DoD references with YOUR product domains before running.
// Reusable workflow: research product/toolset gaps and emit a STRUCTURED, build-ready
// gap list that feeds .claude/workflows/build-gap.js. Invoke with:
//   Workflow({ name: 'research-gaps', args: { exclude: ['self-employed-planner', ...], focus: '...' } })
// Output shape (each gap is directly consumable by build-gap):
//   { gaps: [ { slug, name, description, audience, evidence, recommended_tool,
//               distribution, skill_route, scope, priority } ] }
export const meta = {
  name: 'research-gaps',
  description: 'Audit YOUR product toolset for high-value gaps; output a structured build-ready gap list',
  phases: [
    { title: 'Survey', detail: 'parallel domain auditors map coverage vs the standard planning landscape' },
    { title: 'Rank', detail: 'verify, dedupe, exclude already-built, emit the build-ready structured list' },
  ],
}
// args arrives as a JSON STRING (the runtime passes Workflow `args` verbatim, unparsed) — parse it.
const A = typeof args === 'string' ? (args ? JSON.parse(args) : {}) : (args || {})
// Repo root: pass `root` in args to run this in any project. The workflow sandbox
// has no process/cwd access, so it can't be auto-detected — default is this repo.
const ROOT = A.root || '/absolute/path/to/YOUR-repo'
const exclude = A.exclude || []
const focus = A.focus ||
  'comprehensive personal financial planning (accumulation/FIRE, taxes, decumulation, real estate, debt & cashflow, equity comp, protection/insurance/estate, family/education, self-employed/business owners, guaranteed income, fixed income, relocation)'

phase('Survey')
const DOMAINS = [
  'accumulation & FIRE', 'taxes (accumulation + conversions)', 'decumulation / retirement income',
  'real estate', 'debt & cashflow', 'equity compensation', 'protection / insurance / estate',
  'family & education', 'self-employed & business owners', 'guaranteed income & annuities',
  'fixed income / bond & TIPS ladders', 'relocation / state-tax arbitrage',
]
const SURVEY = { type: 'object', additionalProperties: false, required: ['domain', 'covered', 'gaps'], properties: {
  domain: { type: 'string' }, covered: { type: 'string' },
  gaps: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['name', 'why', 'evidence'],
    properties: { name: { type: 'string' }, why: { type: 'string' }, evidence: { type: 'string' } } } } } }
const surveys = (await parallel(DOMAINS.map(d => () =>
  agent(`Project ${ROOT}. Audit the project MCP toolset + engine for coverage of: ${d}. Read workers/ai-mcp/src/tool-names.ts (full tool list) and the relevant src/lib/* modules, and GREP for the domain's key topics to confirm what's actually covered vs missing — verified by code evidence, not guessed. Overall focus: ${focus}. Output: a one-line 'covered' summary, and concrete gaps with name, why-it-matters/audience, and the code-grep evidence (file counts / what's absent).`,
    { label: `survey:${d}`, phase: 'Survey', schema: SURVEY })))).filter(Boolean)
log(`Surveyed ${surveys.length} domains`)

phase('Rank')
const OUT = { type: 'object', additionalProperties: false, required: ['gaps'], properties: {
  gaps: { type: 'array', items: { type: 'object', additionalProperties: false,
    required: ['slug', 'name', 'description', 'audience', 'evidence', 'recommended_tool', 'distribution', 'skill_route', 'scope', 'priority'],
    properties: {
      slug: { type: 'string', description: 'kebab-case, e.g. guaranteed-income' },
      name: { type: 'string' }, description: { type: 'string' }, audience: { type: 'string' },
      evidence: { type: 'string', description: 'verified coverage gap (grep/file evidence)' },
      recommended_tool: { type: 'string', description: 'proposed MCP tool name, e.g. analyze_guaranteed_income' },
      distribution: { type: 'string', enum: ['new-skill', 'fold-in'] },
      skill_route: { type: 'string', description: 'new skill name (new-skill) OR existing skill(s) to fold into' },
      scope: { type: 'string', enum: ['full', 'lean'] },
      priority: { type: 'number', description: '1 = highest value' },
    } } } } }
const ranked = await agent(`Project ${ROOT}. From the domain surveys, produce the FINAL build-ready gap list. Rules: (1) VERIFY each gap is genuinely missing (not already inside an existing tool) — drop false positives. (2) EXCLUDE anything already built/in-flight: ${JSON.stringify(exclude)}. (3) Apply FEATURE_PLAYBOOK defaults per gap: distribution='new-skill' only for a distinct high-intent vertical with its own audience, else 'fold-in' (name the existing skill); scope='full' unless trivial. (4) Rank by value (1=highest). Output the structured gaps array (slug, name, description, audience, evidence, recommended_tool, distribution, skill_route, scope, priority).\n\nSURVEYS:\n${JSON.stringify(surveys, null, 2)}`,
  { label: 'rank', phase: 'Rank', schema: OUT })
log(`Build-ready gaps: ${ranked.gaps.length}`)
return ranked
