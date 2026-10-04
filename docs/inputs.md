# Inputs

## The report

```
feasibility-report-check <file-or-folder> [options]
```

The report is one Markdown file, or a folder whose Markdown files (`.md`, `.markdown`) directly in it are read as one
report in the order of their names. `README.md` in the folder is not read. With `--each`, every file of the folder is a
report of its own, with its own verdict, angles and sections. docs/method.md says how each part is found.

A report that the tool reads well looks like this; every part can sit in its own file:

```markdown
# Feasibility study: parcel locker booking

## Verdict

Go with changes. ...

## Technical feasibility

Rating: feasible

### Prototype results

...

## Financial feasibility

Rating: feasible with conditions

## Risks

| Risk | Response | Owner |
| --- | --- | --- |
| The vendor changes its interface | Reduce: fix the version in the contract | Head of partnerships |

## Assumptions

- Customers collect within three days. Status: tested with a survey of 300 customers

## Cost estimate

| Item | Low | High |
| --- | --- | --- |
| Build | $90,000 | $130,000 |

## Next steps

1. ...
```

## Options

| Option | What it does |
| --- | --- |
| `--config <file>` | a configuration file (JSON) over the built-in configuration |
| `--format <name>` | `text` (default), `json`, or `github` for workflow commands |
| `--json` | the same as `--format json` |
| `--min-severity <level>` | hide the findings below `notice`, `warning` or `error`; overrides `minSeverity` |
| `--angles <list>` | the angles the report must cover, by id, separated by commas; overrides `angles` |
| `--each` | with a folder, check every file as a report of its own |
| `--explain` | show the rule and the public sources behind each finding |
| `--print-defaults` | print the built-in configuration as a configuration file |
| `--help`, `--version` | show the usage or the version |

An option given twice, a second path, an unknown option, a path that looks like a web address, or `-` for standard
input is a usage error with exit code `2`.

## The configuration file

A JSON object. Every key is optional and changes the built-in configuration; `--print-defaults` writes the whole of it
out, and that output read back gives the defaults. A key the tool does not know is an error with its line and a
suggestion, and an object that names a key twice is refused.

A **list** is either a JSON array, which replaces the built-in list, or an object with `replace`, `add` and `remove`,
applied in that order. Adding an entry that is already on the list, removing one that is not, and naming one twice are
errors. Every entry is a text of 1 to 120 characters, at most 500 entries to a list, and is kept as lowercase words
joined by one space, as it is compared: `"Risk-Log"` is `risk log`.

```json
{
  "name": "Delivery platform review rules",
  "aliases": { "security": ["security", "information security"] },
  "angles": { "add": ["security"] },
  "headings": { "risks": { "add": ["risk log"] } },
  "words": { "ratings": { "add": ["acceptable"] } },
  "rules": { "singleEstimate": "error", "untestedAssumption": "off" },
  "minSeverity": "warning"
}
```

| Key | Value | Default |
| --- | --- | --- |
| `name` | a name shown in the report | none |
| `angles` | a list of the angle ids a report must cover | `technical`, `financial`, `operational`, `schedule`, `legal` |
| `aliases` | an object from an angle id to the list of its aliases; a new id makes a new angle | see below |
| `headings` | an object of heading lists, below | see below |
| `words` | an object of word lists, below | see below |
| `verdicts` | an object with the lists `go`, `change` and `stop` | see below |
| `ignoreFiles` | a list of file names in a folder that are not read, compared without case | `README.md` |
| `rules` | an object from a rule key to its level: `error`, `warning`, `notice` or `off` | see the README |
| `minSeverity` | the lowest level shown: `notice`, `warning` or `error` | `notice` |

### Angles and their aliases

An angle id is a letter a to z followed by letters and digits, at most 40 characters, and there are at most 50 angles.
An alias belongs to one angle only. An angle in `angles` must have aliases, from the defaults or from `aliases`.

| Angle | Aliases |
| --- | --- |
| `technical` | technical, technology, technological |
| `financial` | financial, economic, economics, cost benefit |
| `operational` | operational, operations, organisational, organizational |
| `schedule` | schedule, scheduling, timeline, time to deliver |
| `legal` | legal, compliance, regulatory, regulation |

### Headings

| Key | Finds | Default |
| --- | --- | --- |
| `headings.verdict` | a verdict heading; the whole heading must be one of these | verdict, recommendation, overall verdict, overall recommendation, final verdict, final recommendation, go no go, go no go decision, go no go recommendation |
| `headings.feasibility` | the words that make a heading the preferred section of an angle | feasibility, feasible, viability, assessment, analysis |
| `headings.risks` | a risks section | risk, risks |
| `headings.assumptions` | an assumptions section | assumption, assumptions |
| `headings.cost` | a cost section | cost, costs, budget, investment, tco, total cost of ownership |
| `headings.estimates` | a section whose lines are checked for single estimates, with the cost sections | estimate, estimates, effort, timeline, duration, schedule |
| `headings.results` | a results or limits section of a prototype | result, results, finding, findings, limit, limits, limitation, limitations, learnings, outcome, outcomes |
| `headings.nextSteps` | a next steps section | next steps, next step, action plan, actions, way forward, follow up, follow ups |

### Words

| Key | Used for | Default |
| --- | --- | --- |
| `words.verdictLabels` | labels of a verdict line; a value that is not a verdict is `unknown-verdict` | verdict, overall verdict, final verdict, go no go |
| `words.recommendationLabels` | labels of a line that counts only when it gives a verdict | recommendation, overall recommendation, final recommendation |
| `words.ratingLabels` | labels and table headers of a rating | rating, feasibility, assessment, rag, rag status, status, score |
| `words.ratings` | rating words; a rating starts with one | feasible, not feasible, infeasible, feasible with conditions, conditionally feasible, partly feasible, partially feasible, at risk, high, medium, low, red, amber, yellow, green |
| `words.responses` | responses to a risk, in any form of the last word | accept, reduce, mitigate, avoid, transfer, design around, designed around, designing around |
| `words.ownerLabels` | labels and table headers of the owner of a risk | owner, owners, risk owner, owned by, responsible, accountable |
| `words.emptyValues` | values that say nothing | tbd, tba, todo, none, n a, na, unknown, unassigned, nobody, no one, not assigned |
| `words.statusLabels` | labels and table headers of the status of an assumption | status, state, validation, validated, tested, verified |
| `words.openStatuses` | statuses that mean not tested yet | untested, open, unverified, unvalidated, not tested, not verified, not validated, not yet tested, pending, unknown |
| `words.openWords` | words that mark an assumption untested anywhere in it | untested, unverified, unvalidated |
| `words.prototype` | a prototype, in any form of the last word | prototype, proof of concept, poc, technical spike |
| `words.exact` | words that make a line a known figure, not an estimate | fixed, quoted, actual, actuals, spent, paid, invoiced |
| `words.estimateLabels` | labels of a line checked for a single estimate anywhere | cost, costs, budget, estimate, effort, duration, timeline |

### Verdicts

| Key | Verdict | Default |
| --- | --- | --- |
| `verdicts.go` | go | go, proceed, go ahead |
| `verdicts.change` | go with changes | go with changes, go with conditions, conditional go, proceed with changes, change, changes |
| `verdicts.stop` | stop | stop, no go, nogo, do not proceed, dont proceed, do not go ahead |

A phrase belongs to one verdict only, and each verdict keeps at least one phrase.

### Rules

| Key | Rule | Default |
| --- | --- | --- |
| `rules.missingVerdict` | `missing-verdict` | error |
| `rules.unknownVerdict` | `unknown-verdict` | error |
| `rules.conflictingVerdict` | `conflicting-verdict` | error |
| `rules.missingAngle` | `missing-angle` | error |
| `rules.missingRating` | `missing-rating` | error |
| `rules.unknownRating` | `unknown-rating` | warning |
| `rules.missingRisks` | `missing-risks` | error |
| `rules.riskWithoutResponse` | `risk-without-response` | error |
| `rules.riskWithoutOwner` | `risk-without-owner` | error |
| `rules.missingAssumptions` | `missing-assumptions` | error |
| `rules.untestedAssumption` | `untested-assumption` | warning |
| `rules.missingCost` | `missing-cost` | error |
| `rules.singleEstimate` | `single-estimate` | warning |
| `rules.prototypeWithoutResults` | `prototype-without-results` | warning |
| `rules.missingNextSteps` | `missing-next-steps` | error |

## Limits of the configuration

The configuration file is at most 1 MB, nested at most 32 deep, with at most 100,000 values and 4,096 characters in a
string. Every problem of a file is listed at once, in the order of its lines, with exit code `2`.
