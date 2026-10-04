# Sources

The public pages the checks of this tool are based on, each with a short note in this project's own words on what the
page says and which checks lean on it. Nothing here is a copy of a page: read the page itself for its exact wording.
src/data.js holds the same pages and the points the reports show, and test/data.test.js checks that every page there
is listed here.

## How the discovery phase works (GOV.UK Service Manual)

https://www.gov.uk/service-manual/agile-delivery/how-the-discovery-phase-works

The UK government's guide to the first phase of a service: learning about the users, the problem, the policy intent
and the constraints before anything is built. Its points that matter here:

- Discovery is finished when the team has decided whether to move on. Stopping at that point is described as a good
  outcome when the research points that way, because it saves time and money. This is why a report must end with a
  verdict, and why stop is one of the three verdicts (`missing-verdict`, `unknown-verdict`, `conflicting-verdict`).
- The constraints to look for include legislation, contracts, legacy technology and existing processes, and a hard
  constraint can be a reason to stop. This backs the legal and technical angles (`missing-angle`).
- Teams are told to break down their assumptions and to take the risky ones into the next phase to test them
  (`missing-assumptions`).
- Whether to go on depends partly on whether the work is worth its cost: what it would cost against the improvement it
  could bring (`missing-cost`, the financial angle).
- A team that moves on should know what it will test first, who it needs and how it will measure success
  (`missing-next-steps`).

## How the alpha phase works (GOV.UK Service Manual)

https://www.gov.uk/service-manual/agile-delivery/how-the-alpha-phase-works

The guide to the phase after discovery. It asks teams to spend alpha building prototypes and testing their riskiest
assumptions, and to expect to throw the prototype code away. What a prototype is worth is what it showed and what it
could not show, so a report that mentions one should say both (`prototype-without-results`), and an assumption that
is still open is work that remains (`untested-assumption`).

## ISO/IEC 25010, the product quality model

https://iso25000.com/en/iso-25000-standards/iso-25010

A summary page of the ISO/IEC 25010 product quality model. It splits the quality of a software product into
characteristics such as functional suitability, performance efficiency, compatibility, interaction capability,
reliability, security, maintainability, flexibility and safety. A technical feasibility section is where a report
takes a view on whether these can be met, which is why the technical angle is required by default and why a team may
add an angle of its own, such as security, through the configuration.

## Feasibility study (Wikipedia), the TELOS areas

https://en.wikipedia.org/wiki/Feasibility_study

An overview article. It describes TELOS, a common way to frame a feasibility study as five areas: technical,
economic, legal, operational and scheduling, each with its own question (can it be built, can it be afforded, is it
allowed, will it work in the organisation, can it be done in time). The five default angles of this tool, and the
words that name them, follow these areas (`missing-angle`, `missing-rating`, `unknown-rating`). The rating words
themselves are this tool's own choice.

## The Green Book: appraisal and evaluation in central government (HM Treasury)

https://www.gov.uk/government/publications/the-green-book-appraisal-and-evaluation-in-central-government

The UK Treasury's guidance on appraising options by their costs, benefits and risks. It asks appraisers to correct
for optimism bias and to show how the answer changes when the inputs are uncertain. A single figure for a cost or a
duration hides that uncertainty, so the tool asks for a range (`single-estimate`) and for a cost section
(`missing-cost`).

## The Orange Book: management of risk, principles and concepts (HM Treasury)

https://www.gov.uk/government/publications/orange-book

The UK government's guidance on managing risk. It lists the ways a risk can be treated, among them avoiding it,
retaining it by an informed decision, changing its likelihood or its consequences, and sharing it, and it says that a
plan to treat a risk should name who is accountable and who is responsible for it. The tool asks every risk for a
response and an owner (`missing-risks`, `risk-without-response`, `risk-without-owner`). Its short list of response
words (accept, reduce, mitigate, avoid, transfer, design around) is the tool's own wording of the usual responses.

## CommonMark Spec 0.31.2

https://spec.commonmark.org/0.31.2/

The specification of Markdown that the reader follows in part: ATX headings start with one to six `#` characters, a
setext heading is a line underlined with `=` or `-`, and the content of a fenced code block is literal text. The
reader reads a subset; docs/method.md lists where it is simpler.

## Workflow commands for GitHub Actions (GitHub Docs)

https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-commands

The page that describes the `::error`, `::warning` and `::notice` commands with their `file`, `line`, `col` and
`title` properties, and the characters that must be escaped in a command. `--format github` writes one such command
per finding.

## RFC 8259, The JSON Data Interchange Format

https://www.rfc-editor.org/rfc/rfc8259

The JSON standard. It notes that software cannot be relied on to behave the same way when an object repeats a name,
so the configuration reader refuses a repeated name instead of keeping one of the values.
