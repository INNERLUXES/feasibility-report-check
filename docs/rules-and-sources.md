# Rules and sources

Every rule rests on points of public pages, written in this project's own words; this document lists them, with the
choices that are the tool's own. The same points are in src/data.js and are shown by `--explain`; research/sources.md
has a longer note on each page.

## Rules

### `missing-verdict`

- Discovery ends when the team has decided whether to move on to the next phase, and stopping at that point is a valid result that saves time and money. ([How the discovery phase works (GOV.UK Service Manual)](https://www.gov.uk/service-manual/agile-delivery/how-the-discovery-phase-works))
- The tool's own choice: the three verdicts, go, go with changes and stop, are the tool's own names for the decision a feasibility study ends with.

### `unknown-verdict`

- Discovery ends when the team has decided whether to move on to the next phase, and stopping at that point is a valid result that saves time and money. ([How the discovery phase works (GOV.UK Service Manual)](https://www.gov.uk/service-manual/agile-delivery/how-the-discovery-phase-works))

### `conflicting-verdict`

- Discovery ends when the team has decided whether to move on to the next phase, and stopping at that point is a valid result that saves time and money. ([How the discovery phase works (GOV.UK Service Manual)](https://www.gov.uk/service-manual/agile-delivery/how-the-discovery-phase-works))

### `missing-angle`

- A common way to frame a feasibility study is five areas, technical, economic, legal, operational and scheduling, each with its own question to answer. ([Feasibility study (Wikipedia), the TELOS areas](https://en.wikipedia.org/wiki/Feasibility_study))
- Discovery looks at constraints such as legislation, contracts, legacy technology and existing processes, and a hard constraint can be a reason to stop. ([How the discovery phase works (GOV.UK Service Manual)](https://www.gov.uk/service-manual/agile-delivery/how-the-discovery-phase-works))

### `missing-rating`

- A common way to frame a feasibility study is five areas, technical, economic, legal, operational and scheduling, each with its own question to answer. ([Feasibility study (Wikipedia), the TELOS areas](https://en.wikipedia.org/wiki/Feasibility_study))
- The tool's own choice: a rating is read from a labelled line, a table column or the heading itself; the rating words are the tool's own.

### `unknown-rating`

- A common way to frame a feasibility study is five areas, technical, economic, legal, operational and scheduling, each with its own question to answer. ([Feasibility study (Wikipedia), the TELOS areas](https://en.wikipedia.org/wiki/Feasibility_study))

### `missing-risks`

- A risk is treated by a chosen response, such as avoiding it, retaining it by an informed decision, changing its likelihood or its consequences, or sharing it. ([The Orange Book: management of risk, principles and concepts (HM Treasury)](https://www.gov.uk/government/publications/orange-book))

### `risk-without-response`

- A risk is treated by a chosen response, such as avoiding it, retaining it by an informed decision, changing its likelihood or its consequences, or sharing it. ([The Orange Book: management of risk, principles and concepts (HM Treasury)](https://www.gov.uk/government/publications/orange-book))
- The tool's own choice: the response words are the tool's own short list of the usual ways to treat a risk.

### `risk-without-owner`

- A plan to treat a risk says who is accountable and who is responsible for carrying it out. ([The Orange Book: management of risk, principles and concepts (HM Treasury)](https://www.gov.uk/government/publications/orange-book))

### `missing-assumptions`

- Teams are told to break down their assumptions early and to carry the risky ones forward so they can be tested. ([How the discovery phase works (GOV.UK Service Manual)](https://www.gov.uk/service-manual/agile-delivery/how-the-discovery-phase-works))
- The next phase is spent testing the riskiest assumptions, so an assumption that has not been tested yet is work still to do. ([How the alpha phase works (GOV.UK Service Manual)](https://www.gov.uk/service-manual/agile-delivery/how-the-alpha-phase-works))

### `untested-assumption`

- The next phase is spent testing the riskiest assumptions, so an assumption that has not been tested yet is work still to do. ([How the alpha phase works (GOV.UK Service Manual)](https://www.gov.uk/service-manual/agile-delivery/how-the-alpha-phase-works))

### `missing-cost`

- Whether to continue depends partly on cost: what the work would cost set against the improvement it could make. ([How the discovery phase works (GOV.UK Service Manual)](https://www.gov.uk/service-manual/agile-delivery/how-the-discovery-phase-works))
- Appraisal weighs the costs, benefits and risks of the options, corrects for optimism bias and shows how the answer moves when the inputs are uncertain, which one figure cannot show. ([The Green Book: appraisal and evaluation in central government (HM Treasury)](https://www.gov.uk/government/publications/the-green-book-appraisal-and-evaluation-in-central-government))

### `single-estimate`

- Appraisal weighs the costs, benefits and risks of the options, corrects for optimism bias and shows how the answer moves when the inputs are uncertain, which one figure cannot show. ([The Green Book: appraisal and evaluation in central government (HM Treasury)](https://www.gov.uk/government/publications/the-green-book-appraisal-and-evaluation-in-central-government))
- The tool's own choice: a line that holds a word such as "fixed" or "paid" states a known figure, not an estimate, and is not checked.

### `prototype-without-results`

- Prototypes are built to learn and their code is expected to be thrown away, so what counts is what a prototype showed and what it could not show. ([How the alpha phase works (GOV.UK Service Manual)](https://www.gov.uk/service-manual/agile-delivery/how-the-alpha-phase-works))
- The tool's own choice: a prototype mentioned in the next steps is still to be built, so those mentions do not count.

### `missing-next-steps`

- A team that decides to move on should know what it will test first, who it needs and how it will measure success. ([How the discovery phase works (GOV.UK Service Manual)](https://www.gov.uk/service-manual/agile-delivery/how-the-discovery-phase-works))

## Angles

### Technical

- A common way to frame a feasibility study is five areas, technical, economic, legal, operational and scheduling, each with its own question to answer. ([Feasibility study (Wikipedia), the TELOS areas](https://en.wikipedia.org/wiki/Feasibility_study))
- Product quality is split into characteristics such as functional suitability, performance efficiency, compatibility, reliability, security and maintainability, which a technical assessment has to take a view on. ([ISO/IEC 25010, the product quality model (iso25000.com)](https://iso25000.com/en/iso-25000-standards/iso-25010))

### Financial

- A common way to frame a feasibility study is five areas, technical, economic, legal, operational and scheduling, each with its own question to answer. ([Feasibility study (Wikipedia), the TELOS areas](https://en.wikipedia.org/wiki/Feasibility_study))
- Whether to continue depends partly on cost: what the work would cost set against the improvement it could make. ([How the discovery phase works (GOV.UK Service Manual)](https://www.gov.uk/service-manual/agile-delivery/how-the-discovery-phase-works))

### Operational

- A common way to frame a feasibility study is five areas, technical, economic, legal, operational and scheduling, each with its own question to answer. ([Feasibility study (Wikipedia), the TELOS areas](https://en.wikipedia.org/wiki/Feasibility_study))

### Schedule

- A common way to frame a feasibility study is five areas, technical, economic, legal, operational and scheduling, each with its own question to answer. ([Feasibility study (Wikipedia), the TELOS areas](https://en.wikipedia.org/wiki/Feasibility_study))

### Legal

- A common way to frame a feasibility study is five areas, technical, economic, legal, operational and scheduling, each with its own question to answer. ([Feasibility study (Wikipedia), the TELOS areas](https://en.wikipedia.org/wiki/Feasibility_study))
- Discovery looks at constraints such as legislation, contracts, legacy technology and existing processes, and a hard constraint can be a reason to stop. ([How the discovery phase works (GOV.UK Service Manual)](https://www.gov.uk/service-manual/agile-delivery/how-the-discovery-phase-works))

## The reader and the output

- A heading is a line that starts with one to six # characters or a line underlined with = or -, and the content of a fenced code block is literal text. ([CommonMark Spec 0.31.2](https://spec.commonmark.org/0.31.2/))
- A line of output such as ::error file=...,line=...::message becomes an annotation on that file and line in the run. ([Workflow commands for GitHub Actions (GitHub Docs)](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-commands))
- When an object repeats a name the behaviour of the software that reads it cannot be predicted, so the configuration reader refuses a repeated name. ([RFC 8259, The JSON Data Interchange Format](https://www.rfc-editor.org/rfc/rfc8259))

## Pages

| Page | Address |
| --- | --- |
| How the discovery phase works (GOV.UK Service Manual) | https://www.gov.uk/service-manual/agile-delivery/how-the-discovery-phase-works |
| How the alpha phase works (GOV.UK Service Manual) | https://www.gov.uk/service-manual/agile-delivery/how-the-alpha-phase-works |
| ISO/IEC 25010, the product quality model (iso25000.com) | https://iso25000.com/en/iso-25000-standards/iso-25010 |
| Feasibility study (Wikipedia), the TELOS areas | https://en.wikipedia.org/wiki/Feasibility_study |
| The Green Book: appraisal and evaluation in central government (HM Treasury) | https://www.gov.uk/government/publications/the-green-book-appraisal-and-evaluation-in-central-government |
| The Orange Book: management of risk, principles and concepts (HM Treasury) | https://www.gov.uk/government/publications/orange-book |
| CommonMark Spec 0.31.2 | https://spec.commonmark.org/0.31.2/ |
| Workflow commands for GitHub Actions (GitHub Docs) | https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-commands |
| RFC 8259, The JSON Data Interchange Format | https://www.rfc-editor.org/rfc/rfc8259 |

## What is the tool's own

The pages say what a feasibility study should cover and why; they do not give the words a report uses. The words the tool looks for (the verdict phrases, the rating words, the response words, the labels, the headings), the rule that a section is found by whole words in its heading, the ranking of headings that name the same angle, and the level of every rule are the tool's own choices. Each can be changed in the configuration (docs/inputs.md), and docs/method.md says exactly how each is used.
