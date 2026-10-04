// The built-in configuration: the feasibility angles and the words that name them, the headings of the other sections,
// the words the checks look for, the verdict words, the files of a folder that are not part of a report, and the level
// of every rule. docs/inputs.md describes every key, and --print-defaults writes all of this out as a configuration
// file. Every phrase is compared as whole lowercase words, with punctuation read as a space.

// The five angles of a feasibility study, as the TELOS areas name them. A heading names an angle when its words hold one
// of the aliases as whole words in order.
export const DEFAULT_ANGLES = [
  { id: 'technical', title: 'Technical', aliases: ['technical', 'technology', 'technological'], basis: ['telosAreas', 'isoQuality'] },
  { id: 'financial', title: 'Financial', aliases: ['financial', 'economic', 'economics', 'cost benefit'], basis: ['telosAreas', 'discoveryCost'] },
  { id: 'operational', title: 'Operational', aliases: ['operational', 'operations', 'organisational', 'organizational'], basis: ['telosAreas'] },
  { id: 'schedule', title: 'Schedule', aliases: ['schedule', 'scheduling', 'timeline', 'time to deliver'], basis: ['telosAreas'] },
  { id: 'legal', title: 'Legal', aliases: ['legal', 'compliance', 'regulatory', 'regulation'], basis: ['telosAreas', 'discoveryConstraints'] }
];

// The angles a report must cover, by id.
export const DEFAULT_REQUIRED = ['technical', 'financial', 'operational', 'schedule', 'legal'];

// The headings of the other sections. A verdict heading must be one of its phrases as a whole; every other heading
// matches when its words hold a phrase as whole words in order. feasibility holds the words that make a heading the
// preferred section of an angle when several headings name it.
export const DEFAULT_HEADINGS = {
  verdict: ['verdict', 'recommendation', 'overall verdict', 'overall recommendation', 'final verdict', 'final recommendation', 'go no go', 'go no go decision', 'go no go recommendation'],
  feasibility: ['feasibility', 'feasible', 'viability', 'assessment', 'analysis'],
  risks: ['risk', 'risks'],
  assumptions: ['assumption', 'assumptions'],
  cost: ['cost', 'costs', 'budget', 'investment', 'tco', 'total cost of ownership'],
  estimates: ['estimate', 'estimates', 'effort', 'timeline', 'duration', 'schedule'],
  results: ['result', 'results', 'finding', 'findings', 'limit', 'limits', 'limitation', 'limitations', 'learnings', 'outcome', 'outcomes'],
  nextSteps: ['next steps', 'next step', 'action plan', 'actions', 'way forward', 'follow up', 'follow ups']
};

// The words the checks look for. A label is followed by a colon ("Owner: Dana") or names a column of a table.
export const DEFAULT_WORDS = {
  verdictLabels: ['verdict', 'overall verdict', 'final verdict', 'go no go'],
  recommendationLabels: ['recommendation', 'overall recommendation', 'final recommendation'],
  ratingLabels: ['rating', 'feasibility', 'assessment', 'rag', 'rag status', 'status', 'score'],
  ratings: ['feasible', 'not feasible', 'infeasible', 'feasible with conditions', 'conditionally feasible', 'partly feasible', 'partially feasible', 'at risk', 'high', 'medium', 'low', 'red', 'amber', 'yellow', 'green'],
  responses: ['accept', 'reduce', 'mitigate', 'avoid', 'transfer', 'design around', 'designed around', 'designing around'],
  ownerLabels: ['owner', 'owners', 'risk owner', 'owned by', 'responsible', 'accountable'],
  emptyValues: ['tbd', 'tba', 'todo', 'none', 'n a', 'na', 'unknown', 'unassigned', 'nobody', 'no one', 'not assigned'],
  statusLabels: ['status', 'state', 'validation', 'validated', 'tested', 'verified'],
  openStatuses: ['untested', 'open', 'unverified', 'unvalidated', 'not tested', 'not verified', 'not validated', 'not yet tested', 'pending', 'unknown'],
  openWords: ['untested', 'unverified', 'unvalidated'],
  prototype: ['prototype', 'proof of concept', 'poc', 'technical spike'],
  exact: ['fixed', 'quoted', 'actual', 'actuals', 'spent', 'paid', 'invoiced'],
  estimateLabels: ['cost', 'costs', 'budget', 'estimate', 'effort', 'duration', 'timeline']
};

// The verdict words, by the three verdicts. A verdict is the longest phrase its value starts with.
export const DEFAULT_VERDICTS = {
  go: ['go', 'proceed', 'go ahead'],
  change: ['go with changes', 'go with conditions', 'conditional go', 'proceed with changes', 'change', 'changes'],
  stop: ['stop', 'no go', 'nogo', 'do not proceed', 'dont proceed', 'do not go ahead']
};

// How a verdict is shown in a report.
export const VERDICT_NAMES = { go: 'go', change: 'go with changes', stop: 'stop' };

// The files of a folder that are never read as part of a report. Compared without case.
export const DEFAULT_IGNORE_FILES = ['README.md'];

export const DEFAULT_RULES = {
  missingVerdict: 'error',
  unknownVerdict: 'error',
  conflictingVerdict: 'error',
  missingAngle: 'error',
  missingRating: 'error',
  unknownRating: 'warning',
  missingRisks: 'error',
  riskWithoutResponse: 'error',
  riskWithoutOwner: 'error',
  missingAssumptions: 'error',
  untestedAssumption: 'warning',
  missingCost: 'error',
  singleEstimate: 'warning',
  prototypeWithoutResults: 'warning',
  missingNextSteps: 'error'
};

// The lowest level of a finding that is shown.
export const DEFAULT_MIN_SEVERITY = 'notice';
