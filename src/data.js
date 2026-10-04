// The public pages the checks rest on, and what each says, written in this project's own words. research/sources.md
// lists the same pages with a longer note on each, and test/data.test.js checks that every page here is listed there and
// that every rule and every angle names points that exist. The code in src/ uses these constants and never writes a
// reason of its own in a report.

export const SOURCES = [
  { id: 'govukDiscovery', title: 'How the discovery phase works (GOV.UK Service Manual)', url: 'https://www.gov.uk/service-manual/agile-delivery/how-the-discovery-phase-works' },
  { id: 'govukAlpha', title: 'How the alpha phase works (GOV.UK Service Manual)', url: 'https://www.gov.uk/service-manual/agile-delivery/how-the-alpha-phase-works' },
  { id: 'iso25010', title: 'ISO/IEC 25010, the product quality model (iso25000.com)', url: 'https://iso25000.com/en/iso-25000-standards/iso-25010' },
  { id: 'telos', title: 'Feasibility study (Wikipedia), the TELOS areas', url: 'https://en.wikipedia.org/wiki/Feasibility_study' },
  { id: 'greenBook', title: 'The Green Book: appraisal and evaluation in central government (HM Treasury)', url: 'https://www.gov.uk/government/publications/the-green-book-appraisal-and-evaluation-in-central-government' },
  { id: 'orangeBook', title: 'The Orange Book: management of risk, principles and concepts (HM Treasury)', url: 'https://www.gov.uk/government/publications/orange-book' },
  { id: 'commonmark', title: 'CommonMark Spec 0.31.2', url: 'https://spec.commonmark.org/0.31.2/' },
  { id: 'githubCommands', title: 'Workflow commands for GitHub Actions (GitHub Docs)', url: 'https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-commands' },
  { id: 'rfc8259', title: 'RFC 8259, The JSON Data Interchange Format', url: 'https://www.rfc-editor.org/rfc/rfc8259' }
];

export const source = (id) => SOURCES.find((s) => s.id === id);

// What a page says, in this project's own words. Each point names its page.
export const POINTS = {
  discoveryDecision: { source: 'govukDiscovery', text: 'discovery ends when the team has decided whether to move on to the next phase, and stopping at that point is a valid result that saves time and money' },
  discoveryConstraints: { source: 'govukDiscovery', text: 'discovery looks at constraints such as legislation, contracts, legacy technology and existing processes, and a hard constraint can be a reason to stop' },
  discoveryAssumptions: { source: 'govukDiscovery', text: 'teams are told to break down their assumptions early and to carry the risky ones forward so they can be tested' },
  discoveryCost: { source: 'govukDiscovery', text: 'whether to continue depends partly on cost: what the work would cost set against the improvement it could make' },
  discoveryNext: { source: 'govukDiscovery', text: 'a team that decides to move on should know what it will test first, who it needs and how it will measure success' },
  alphaAssumptions: { source: 'govukAlpha', text: 'the next phase is spent testing the riskiest assumptions, so an assumption that has not been tested yet is work still to do' },
  alphaPrototypes: { source: 'govukAlpha', text: 'prototypes are built to learn and their code is expected to be thrown away, so what counts is what a prototype showed and what it could not show' },
  isoQuality: { source: 'iso25010', text: 'product quality is split into characteristics such as functional suitability, performance efficiency, compatibility, reliability, security and maintainability, which a technical assessment has to take a view on' },
  telosAreas: { source: 'telos', text: 'a common way to frame a feasibility study is five areas, technical, economic, legal, operational and scheduling, each with its own question to answer' },
  greenBookRanges: { source: 'greenBook', text: 'appraisal weighs the costs, benefits and risks of the options, corrects for optimism bias and shows how the answer moves when the inputs are uncertain, which one figure cannot show' },
  orangeBookResponses: { source: 'orangeBook', text: 'a risk is treated by a chosen response, such as avoiding it, retaining it by an informed decision, changing its likelihood or its consequences, or sharing it' },
  orangeBookOwners: { source: 'orangeBook', text: 'a plan to treat a risk says who is accountable and who is responsible for carrying it out' },
  commonmarkHeadings: { source: 'commonmark', text: 'a heading is a line that starts with one to six # characters or a line underlined with = or -, and the content of a fenced code block is literal text' },
  githubAnnotations: { source: 'githubCommands', text: 'a line of output such as ::error file=...,line=...::message becomes an annotation on that file and line in the run' },
  jsonRepeatedNames: { source: 'rfc8259', text: 'when an object repeats a name the behaviour of the software that reads it cannot be predicted, so the configuration reader refuses a repeated name' }
};

// The page of a point.
export const pointPage = (key) => source(POINTS[key].source);

// The levels of a finding, from the lowest. A finding at the level error makes the run fail.
export const LEVELS = ['notice', 'warning', 'error'];

// The sentence every report ends with, before the result.
export const NOTICE = 'This report checks the structure of the feasibility report only: its verdict, its sections, its ratings, its risks, its assumptions and the form of its estimates. It does not judge whether the project is feasible or whether the numbers are right.';
