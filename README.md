# feasibility-report-check

Checks a software feasibility study report written in Markdown, one file or a folder of files, and reports what keeps it from being a study someone can act on: no verdict, feasibility angles with no section or no rating, risks with no response or no owner, assumptions that are missing or still open, no cost section, costs and times given as one number instead of a range, a prototype with no results or limits, and no next steps. Each finding has its file, line and column, and the tool exits with a code a pipeline can act on.

The GOV.UK Service Manual describes the end of a discovery as a decision on whether to go on, and treats stopping as a good outcome when the research points that way (https://www.gov.uk/service-manual/agile-delivery/how-the-discovery-phase-works). Its guide to the alpha phase asks teams to test their riskiest assumptions with prototypes. A common way to frame the study itself is five areas: technical, economic, legal, operational and scheduling feasibility, and the technical part has to take a view on the quality characteristics that ISO/IEC 25010 names, such as performance, reliability and security (https://iso25000.com/en/iso-25000-standards/iso-25010). A report that skips one of these parts reads well and still leaves the decision open, and this tool checks for the parts on every change.

- **A verdict, read three ways.** Go, go with changes or stop, from a Verdict or Recommendation heading, a `Verdict:` line, a table row or the front matter. A verdict that is not one of the three, or two verdicts that disagree, is a finding.
- **Five angles, each with a rating.** Technical, financial, operational, schedule and legal by default, found by whole words in a heading, each with a rating such as `Rating: feasible`, a RAG status, or a row of a rating table. Add an angle of your own, or set the list for one run with `--angles`.
- **Risks with a response and an owner.** Every risk in a list, a table or under its own subheading needs a response (accept, reduce, mitigate, avoid, transfer, design around) and an owner that is not TBD.
- **Assumptions and estimates.** Assumptions marked untested, open or unverified are flagged, and so is a cost or a time given as one number.
- **Everything explained.** `--explain` shows the rule and the public sources behind each finding, and where a rule is the tool's own choice.
- Reports as text, JSON and GitHub workflow annotations, with an exit code for a pipeline: `0` no error, `1` an error, `2` usage or input error.
- Plain JavaScript, no dependencies.

```
npm test
```

```
tests 151
pass 147
fail 0
skipped 4
```

These are the summary lines that `npm test` prints at the end on Windows. The skipped tests are the ones that need a symbolic link, a device or file permissions (a symbolic link in the folder, the report named through a symbolic link, `/dev/zero` named as an input, and a file with no read access); they are guarded with `process.platform`, run on Linux and macOS, and none of them asserts a line or a column. `npm run test:coverage` runs the same tests with coverage; their time limits are four times wider when coverage is on.

## Quick start

Requires Node 22 or newer. There is nothing to install.

```
git clone https://github.com/INNERLUXES/feasibility-report-check.git
cd feasibility-report-check
node bin/feasibility-report-check.js examples/weak/feasibility-report.md
```

Or without a clone, on your own report:

```
npx --yes github:INNERLUXES/feasibility-report-check docs/feasibility-study.md
```

`examples/` holds two made-up studies. `examples/good` is a study of a parcel locker booking service, split into four files that are read as one report: a verdict, six rated angles, a risk table with responses and owners, tested assumptions, costs as low and high columns, prototype results and limits, and next steps. `examples/weak/feasibility-report.md` is a rushed study of a customer portal rebuild with one problem of most kinds. `examples/config.json` adds a security angle and makes a single estimate an error.

## Usage

```
feasibility-report-check <file-or-folder> [options]
```

```
--config <file>           a configuration file (JSON) that changes the angles, the headings, the words or the
                          rules (default: the built-in configuration; --print-defaults shows it)
--format <name>           text, json or github (default: text); github writes workflow commands that GitHub shows
                          as annotations on the files
--json                    the same as --format json
--min-severity <level>    the lowest level of a finding that is shown: notice, warning, error (default: minSeverity of
                          the configuration, else notice)
--angles <list>           the angles the report must cover, by id, separated by commas, such as
                          technical,financial,legal (default: angles of the configuration)
--each                    with a folder, check every Markdown file as a report of its own
--explain                 show the rule and the public sources behind each finding
--print-defaults          print the built-in configuration as a configuration file and exit
--help                    show the usage
--version                 show the version
```

Paths in the report are relative to the folder you run the command in, with forward slashes on every system, followed by the line and the column of the finding. A finding about something missing from the whole report, such as an angle with no section, names the report and no line.

The report of the weak example starts with what was read and the counts, then the findings, errors first, then what was found in the report, part by part:

```
feasibility-report-check: examples/weak/feasibility-report.md
input: examples/weak/feasibility-report.md (1 file, read as one report)
config: built-in defaults: angles technical, financial, operational, schedule, legal; minimum severity notice
rules: missing-verdict (error); unknown-verdict (error); conflicting-verdict (error); missing-angle (error); missing-rating (error); unknown-rating (warning); missing-risks (error); risk-without-response (error); risk-without-owner (error); missing-assumptions (error); untested-assumption (warning); missing-cost (error); single-estimate (warning); prototype-without-results (warning); missing-next-steps (error)
findings: 18 (12 error, 6 warning)

Findings (18)

  ERROR    missing-angle              examples/weak/feasibility-report.md
           no section for the financial angle: no heading names "financial", "economic", "economics" or "cost benefit"

  ERROR    missing-angle              examples/weak/feasibility-report.md
           no section for the legal angle: no heading names "legal", "compliance", "regulatory" or "regulation"

  ERROR    missing-cost               examples/weak/feasibility-report.md
           no cost section: no heading names "cost", "costs", "budget", "investment" or 2 more

  ERROR    missing-next-steps         examples/weak/feasibility-report.md
           no next steps: no heading names "next steps", "next step", "action plan", "actions" or 3 more

  ERROR    missing-rating             examples/weak/feasibility-report.md:12:4
           the technical section "Technical feasibility" has no rating, such as "Rating: feasible", "RAG: amber" or a rating table row

  ERROR    missing-rating             examples/weak/feasibility-report.md:22:1
           the rating of the schedule angle is "TBD", which says nothing; rate it, such as "Rating: feasible"

  ERROR    risk-without-response      examples/weak/feasibility-report.md:28:3
           the risk "The API may not support every portal feature" has no response: none of "accept", "reduce", "mitigate", "avoid", "transfer" or "design around"

  ERROR    risk-without-owner         examples/weak/feasibility-report.md:28:3
           the risk "The API may not support every portal feature" has no owner, such as "Owner: <a name or a role>"

  ERROR    risk-without-response      examples/weak/feasibility-report.md:29:3
           the risk "The key developer may leave. Owner: TBD" has no response: none of "accept", "reduce", "mitigate", "avoid", "transfer" or "design around"

  ERROR    risk-without-owner         examples/weak/feasibility-report.md:29:3
           the owner of the risk "The key developer may leave. Owner: TBD" is "TBD", which names no one

  ERROR    conflicting-verdict        examples/weak/feasibility-report.md:40:1
           the report gives 2 different verdicts: go on line 3 and stop here

  ERROR    unknown-verdict            examples/weak/feasibility-report.md:42:1
           the verdict "maybe later in the quarter" is not "go", "go with changes" or "stop"; start the line with one of them, or write it in bold

  WARNING  prototype-without-results  examples/weak/feasibility-report.md:8:1
           the report mentions a proof of concept but has no section for its results or limits, such as "Prototype results"

  WARNING  single-estimate            examples/weak/feasibility-report.md:10:9
           the estimate "$180,000" is one number; give a range, such as a low and a high figure

  WARNING  unknown-rating             examples/weak/feasibility-report.md:18:1
           the rating "probably fine" of the operational angle is not one of "feasible", "not feasible", "infeasible", "feasible with conditions", "conditionally feasible", "partly feasible" or 9 more

  WARNING  single-estimate            examples/weak/feasibility-report.md:24:23
           the estimate "16 weeks" is one number; give a range, such as a low and a high figure

  WARNING  untested-assumption        examples/weak/feasibility-report.md:34:3
           the assumption "Customers want a new portal (untested)" is untested; test it, or say how and when it will be tested

  WARNING  untested-assumption        examples/weak/feasibility-report.md:35:3
           the assumption "The mobile API is stable. Status: open" is open; test it, or say how and when it will be tested

Report: examples/weak/feasibility-report.md ("Feasibility study: customer portal rebuild")

  verdict      go, line 3
  technical    "Technical feasibility", line 12: no rating
  financial    missing
  operational  "Operational feasibility", line 16: the rating "probably fine" is not a rating word
  schedule     "Schedule", line 20: no rating
  legal        missing
  risks        "Risks", line 26: 3 risks, 2 without a response, 2 without an owner
  assumptions  "Assumptions", line 32: 3 assumptions, 2 untested
  cost         missing
  prototype    "proof of concept" mentioned, line 8; no results section
  next steps   missing

This report checks the structure of the feasibility report only: its verdict, its sections, its ratings, its risks, its assumptions and the form of its estimates. It does not judge whether the project is feasible or whether the numbers are right.

RESULT: FAIL - 12 errors (and 6 warnings)
```

With `--explain`, each finding also shows the rule, the points of the public pages it rests on and, where there is one, the tool's own choice:

```
  WARNING  single-estimate            examples/weak/feasibility-report.md:24:23
           the estimate "16 weeks" is one number; give a range, such as a low and a high figure
           rule: a line in a cost or estimate section, or labelled "cost", "costs", "budget" or 4 more, that holds an amount of money or time and no range, and none of "fixed", "quoted", "actual" or 4 more
           basis: appraisal weighs the costs, benefits and risks of the options, corrects for optimism bias and shows how the answer moves when the inputs are uncertain, which one figure cannot show (The Green Book: appraisal and evaluation in central government (HM Treasury), https://www.gov.uk/government/publications/the-green-book-appraisal-and-evaluation-in-central-government)
           the tool's own choice: a line that holds a word such as "fixed" or "paid" states a known figure, not an estimate, and is not checked
```

The good example passes. Its four files are read in the order of their names, so a place in the report names its file:

```
feasibility-report-check: examples/good
input: examples/good (4 files, read as one report)
config: examples/config.json (Delivery platform review rules): angles technical, financial, operational, schedule, legal, security; minimum severity notice
rules: missing-verdict (error); unknown-verdict (error); conflicting-verdict (error); missing-angle (error); missing-rating (error); unknown-rating (warning); missing-risks (error); risk-without-response (error); risk-without-owner (error); missing-assumptions (error); untested-assumption (warning); missing-cost (error); single-estimate (error); prototype-without-results (warning); missing-next-steps (error)
findings: 0

Findings (0)

  none

Report: examples/good ("Feasibility study: parcel locker booking for Harbour Lane Couriers")

  verdict      go with changes, 01-summary.md:7
  technical    "Technical feasibility", 02-feasibility.md:1: rated feasible
  financial    "Financial feasibility", 02-feasibility.md:20: rated feasible with conditions
  operational  "Operational feasibility", 02-feasibility.md:27: rated amber
  schedule     "Schedule feasibility", 02-feasibility.md:34: rated feasible
  legal        "Legal and compliance", 02-feasibility.md:41: rated at risk
  security     "Security feasibility", 02-feasibility.md:48: rated feasible
  risks        "Risks", 03-risks-and-assumptions.md:1: 4 risks, 0 without a response, 0 without an owner
  assumptions  "Assumptions", 03-risks-and-assumptions.md:10: 3 assumptions, 0 untested
  cost         "Cost estimate", 04-cost-and-plan.md:1: 5 lines with an amount, 0 with one number only
  prototype    "prototype" mentioned, 02-feasibility.md:6; results in "Prototype results", 02-feasibility.md:9
  next steps   "Next steps", 04-cost-and-plan.md:12

note: not read as part of the report: README.md

This report checks the structure of the feasibility report only: its verdict, its sections, its ratings, its risks, its assumptions and the form of its estimates. It does not judge whether the project is feasible or whether the numbers are right.

RESULT: PASS - no error
```

## What it checks

| Rule | Key | Default level | Finds |
| --- | --- | --- | --- |
| `missing-verdict` | `rules.missingVerdict` | error | a report with no verdict heading and no verdict line |
| `unknown-verdict` | `rules.unknownVerdict` | error | a verdict heading or a `Verdict:` line that is not go, go with changes or stop, or a verdict heading with nothing under it |
| `conflicting-verdict` | `rules.conflictingVerdict` | error | two verdicts in one report that are not the same |
| `missing-angle` | `rules.missingAngle` | error | a required angle that no heading names |
| `missing-rating` | `rules.missingRating` | error | the section of an angle with no rating, or a rating such as TBD that says nothing |
| `unknown-rating` | `rules.unknownRating` | warning | the section of an angle whose rating is not one of the rating words |
| `missing-risks` | `rules.missingRisks` | error | no risks section, or one that lists no risk |
| `risk-without-response` | `rules.riskWithoutResponse` | error | a risk with none of the response words |
| `risk-without-owner` | `rules.riskWithoutOwner` | error | a risk with no owner, or an owner such as TBD |
| `missing-assumptions` | `rules.missingAssumptions` | error | no assumptions section, or one that lists no assumption |
| `untested-assumption` | `rules.untestedAssumption` | warning | an assumption whose status is untested, open, unverified or the like |
| `missing-cost` | `rules.missingCost` | error | no cost section, or one with nothing in it |
| `single-estimate` | `rules.singleEstimate` | warning | an amount of money or time in a cost or estimate section given as one number, not a range |
| `prototype-without-results` | `rules.prototypeWithoutResults` | warning | a prototype or proof of concept mentioned with no section for its results or limits |
| `missing-next-steps` | `rules.missingNextSteps` | error | no next steps section, or one with nothing in it |

[docs/method.md](docs/method.md) says exactly what each rule looks at and what it cannot see, and [docs/rules-and-sources.md](docs/rules-and-sources.md) gives the points of the public pages each rule rests on.

## Angles and ratings

A heading names an angle when its words, with numbering left out, hold one of the aliases of the angle as whole words in order: `3.1 Technical feasibility` and `Legal and compliance` name their angles, `Legality` does not. The first heading of the first file is the title when it is a level 1 heading, and never counts as a section.

| Angle | Aliases |
| --- | --- |
| `technical` | technical, technology, technological |
| `financial` | financial, economic, economics, cost benefit |
| `operational` | operational, operations, organisational, organizational |
| `schedule` | schedule, scheduling, timeline, time to deliver |
| `legal` | legal, compliance, regulatory, regulation |

When several headings name an angle, the one that also says feasibility (or viability, assessment, analysis) wins, then the one at the highest level, then the first. Its rating is read from the heading itself (`Technical feasibility: amber`), from a line labelled `Rating`, `Feasibility`, `Assessment`, `RAG`, `RAG status`, `Status` or `Score`, from a table column with one of those headers, or from a rating table anywhere in the report whose first column names the angle. The rating words are feasible, not feasible, infeasible, feasible with conditions, conditionally feasible, partly feasible, partially feasible, at risk, high, medium, low, red, amber, yellow and green.

## Verdict

A verdict heading is one of Verdict, Recommendation, Overall verdict, Overall recommendation, Final verdict, Final recommendation and Go/no-go, and its verdict is the first line under it, or the text after a colon in the heading, or a verdict in bold in its first paragraph. A line labelled `Verdict:`, `Overall verdict:`, `Final verdict:` or `Go/no-go:` anywhere, a table row with such a label, or the front matter also gives a verdict; a line labelled `Recommendation:` counts only when it gives one. The verdict is the longest phrase its value starts with:

| Verdict | Phrases |
| --- | --- |
| go | go, proceed, go ahead |
| go with changes | go with changes, go with conditions, conditional go, proceed with changes, change, changes |
| stop | stop, no go (no-go), nogo, do not proceed, don't proceed, do not go ahead |

## Risks and assumptions

The items of a risks or assumptions section are the rows of its tables and the top-level items of its lists, with their nested items; a section with neither takes its subheadings as items. A risk needs a response word in any form (`mitigated`, `mitigation`, `transferred`) and a value for `Owner`, `Risk owner`, `Owned by`, `Responsible` or `Accountable`, as a labelled line or a table column, that is not empty, a dash, TBD, none or unknown. An assumption is untested when its `Status` (or `State`, `Validation`, `Tested`, `Verified`) starts with untested, open, unverified, unvalidated, not tested, not verified, pending or unknown, when a word in brackets says so (`(untested)`, `[open]`), or when it says untested, unverified or unvalidated anywhere.

## Estimates

Every line of a section whose heading names cost, costs, budget or investment, or an estimate, effort, timeline, duration or schedule, and every line labelled `Cost:`, `Budget:`, `Estimate:`, `Effort:`, `Duration:` or `Timeline:` anywhere, is checked for amounts: money with a currency sign or code ($120,000, EUR 40k, 40k USD) and time from hours to years (6 weeks, 40 person-days). A line gives a range when two numbers are joined by a dash, "to" or "..", when it says "between ... and ...", when it gives a margin (+/- 2 weeks), or when two cells of a table row hold an amount of the same kind, such as low and high columns. A line that says fixed, quoted, actual, spent, paid or invoiced states a known figure and is not checked.

## Prototype and next steps

A report that mentions a prototype, a proof of concept, a PoC or a technical spike outside its next steps needs a section for what it showed and what it could not show: a heading that names results, findings, limits, limitations, learnings or outcomes together with a prototype word, in itself or in a heading above it, such as "Prototype results" or "Limits" under "Proof of concept". The next steps are a section headed next steps, action plan, actions, way forward or follow up, with something in it.

## The configuration file

```json
{
  "name": "Delivery platform review rules",
  "aliases": { "security": ["security", "information security"] },
  "angles": { "add": ["security"] },
  "rules": { "singleEstimate": "error" }
}
```

A configuration changes the defaults key by key: the required angles and their aliases, the headings of every kind of section, the labels and words the checks look for, the verdict phrases, the files of a folder that are not read, the level of every rule, and the minimum severity. A list is a JSON array that replaces the built-in list, or an object with `replace`, `add` and `remove`. A key the tool does not know is an error with its line and a suggestion, and a key named twice is refused. [docs/inputs.md](docs/inputs.md) describes every key, and `--print-defaults` writes the whole default configuration out.

## Formats

- `text`: for a terminal: what was read, the counts, the findings with their file, line and column, what was found in each report part by part, the notes, the notice and the result. With `--explain` also the rule, the points of the public pages and the tool's own choice behind each finding.
- `json` (or `--json`): the whole report: the input, the configuration, what was found in each report, every finding with its line and column, the totals, the result, the notes and the notice.
- `github`: one workflow command per finding, `::error`, `::warning` or `::notice` with the file, line and column, which GitHub shows as an annotation on the file in the pull request, then a summary line. The characters a command gives a meaning to are escaped. The first two errors of the weak example:

```
::error file=examples/weak/feasibility-report.md,line=12,col=4,title=feasibility-report-check missing-rating::the technical section "Technical feasibility" has no rating, such as "Rating: feasible", "RAG: amber" or a rating table row
::error file=examples/weak/feasibility-report.md,line=22,col=1,title=feasibility-report-check missing-rating::the rating of the schedule angle is "TBD", which says nothing; rate it, such as "Rating: feasible"
```

## Exit codes

`0`: no finding at the level error. `1`: at least one finding at the level error; a rule can be raised to error or lowered to warning or notice in the configuration. `2`: a usage or input error: no input or two, an unknown option, an option given twice, a URL in place of a path, a file or folder that cannot be read, a folder with no Markdown file or too many entries, a file over its limit, a binary, UTF-16 or invalid UTF-8 file, or a configuration with an unknown key, a key named twice, an alias shared by two angles or an entry removed that is not on its list. With exit code `2` the tool gives no result and prints the problems on standard error.

## Limits

The tool reads structure, not meaning: a report with no finding can still be a poor study. A section under a heading none of its phrases knows is reported missing, a verdict written only in prose is not read, a response word counts wherever it stands in a risk, amounts must be written with digits, files in subfolders are not read, and the reader follows a subset of CommonMark. [docs/limits.md](docs/limits.md) lists these, with the size limits: 5,000 entries in a folder, 1 MB and 200,000 lines for a file, 32 MB for all of them, 500 findings listed per rule. [docs/threat-model.md](docs/threat-model.md) lists the risks of reading reports written by many hands and their controls, and [docs/secure-defaults.md](docs/secure-defaults.md) the defaults and how to run the tool in a pipeline.

## Architecture

Plain ES modules in `src/`, with no dependencies.

| File | Job |
| --- | --- |
| `src/cli.js` | the command line, the usage and the exit codes |
| `src/check.js` | reads the configuration and the input, runs the checks on each report and builds the report of the run |
| `src/files.js` | the one listing of the folder and the bounded reading of the files, with no link followed |
| `src/markdown.js` | the lines of a file: front matter, code fences, comments, headings, list items and tables |
| `src/words.js` | whole words, phrases with their forms, labels and their values |
| `src/sections.js` | the outline of a report: which headings name a section, how far each runs, and the items it lists |
| `src/estimates.js` | amounts of money and time, and ranges |
| `src/analyse.js` | the checks of one report |
| `src/config.js`, `src/defaults.js` | the configuration file over the defaults, and the default angles, headings, words and levels |
| `src/rules.js` | the fifteen rules and the result |
| `src/json.js` | the strict JSON reader |
| `src/report.js`, `src/text.js`, `src/size.js` | the text, JSON and GitHub output, the cleaning of text from the input, number formats |
| `src/data.js` | the public pages and the points the checks rest on, in this project's own words |
| `tools/check.mjs`, `tools/example.mjs` | the repository checks, and the examples with their real output |

## Where the facts come from

| Fact | Source |
| --- | --- |
| A study ends with a decision to go on or to stop; constraints, assumptions, cost and next steps | How the discovery phase works, GOV.UK Service Manual, https://www.gov.uk/service-manual/agile-delivery/how-the-discovery-phase-works |
| Prototypes test the riskiest assumptions and are thrown away | How the alpha phase works, GOV.UK Service Manual, https://www.gov.uk/service-manual/agile-delivery/how-the-alpha-phase-works |
| The quality characteristics a technical assessment covers | ISO/IEC 25010, https://iso25000.com/en/iso-25000-standards/iso-25010 |
| The five areas of a feasibility study (TELOS) | Feasibility study, Wikipedia, https://en.wikipedia.org/wiki/Feasibility_study |
| Costs, benefits and risks of options, optimism bias and uncertainty | The Green Book, HM Treasury, https://www.gov.uk/government/publications/the-green-book-appraisal-and-evaluation-in-central-government |
| Ways to treat a risk, and who is accountable for it | The Orange Book, HM Treasury, https://www.gov.uk/government/publications/orange-book |
| Headings and fenced code | CommonMark Spec 0.31.2, https://spec.commonmark.org/0.31.2/ |
| Annotations from workflow commands | GitHub Docs, https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-commands |
| Repeated names in a JSON object | RFC 8259, https://www.rfc-editor.org/rfc/rfc8259 |

[research/sources.md](research/sources.md) has a note on each page, in this project's own words.

## Background

A feasibility study is where a team decides whether a piece of software is worth building before it spends the budget on it, so that the decision and its reasons can be checked later. How such studies fit into the start of a project is described on the page [Feasibility Study in Software Development](https://innerluxes.dev/software-development/feasibility-study).

## License

MIT
