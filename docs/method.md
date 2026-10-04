# Method

This document says exactly what the tool reads, how it finds the parts of a report, and what each rule looks at and
cannot see. The words and phrases named here are the defaults; docs/inputs.md says how the configuration changes them.

## What is read

The input is one Markdown file, or a folder. A folder is read as one report made of the files directly in it whose
names end in `.md` or `.markdown`, in the order of their names compared by code units, so `01-summary.md` comes before
`02-angles.md` on every system. `README.md` is not read (the `ignoreFiles` list), subfolders are not read, and a
symbolic link in the folder is never followed. With `--each`, every file of the folder is checked as a report of its
own.

Each file is read as UTF-8, with or without a byte order mark, with LF, CR LF or CR line ends. A file that is binary,
UTF-16 or not valid UTF-8 stops the run with exit code `2`, so a run never passes because a file was skipped.

## The Markdown that is read

The reader reads a subset of CommonMark, line by line:

- **Headings.** An ATX heading is a line of one to six `#` characters followed by a space, a tab or the end of the
  line, indented at most three spaces; a closing run of `#` is left out. A setext heading is one line of text
  underlined by a line of `=` (level 1) or `-` (level 2). A setext heading of more than one line is read as its last
  line only.
- **Code.** A fenced code block, opened by three or more backticks or tildes and closed by a fence of the same
  character at least as long, is literal text: nothing in it is a heading, a label or an item. A fence that is never
  closed turns the rest of the file into code, with a note. Indented code blocks are read as plain text, because list
  items often continue on indented lines.
- **Comments.** An HTML comment that starts a line is left out, over as many lines as it runs. A comment inside a line
  is left out of the words and the values.
- **Front matter.** Lines between a first line of `---` and a closing `---` or `...`, within 200 lines, are front
  matter. They are never headings, and a labelled line in them (`verdict: go`) is read like any other.
- **Lists.** A list item starts with `-`, `*`, `+` or a number followed by `.` or `)`, and a space. An item runs on
  over the lines after it that are indented more than its marker, or that follow it with no blank line between.
- **Tables.** A table is a line with a pipe followed by a separator row such as `| --- | :---: |`, and runs while its
  lines hold a pipe. Cells are split at every pipe that is not escaped with a backslash.

HTML blocks other than comments, block quotes, emphasis rules and entity references are not read as CommonMark reads
them; they never change where a heading is.

## Words and phrases

Text is compared as whole words: every character that is not a letter A to Z or a digit is read as a space, letters are
lowered (A to Z only, whatever the locale), and an apostrophe is dropped, so "Don't proceed" is `dont proceed` and
"Go/No-go" is `go no go`. A phrase is found when its words appear in order as whole words. For the response words, the
prototype words and the untested words, the last word of a phrase may also carry an ending (`mitigated`,
`mitigation`, `transferred`, `prototyping`): -s, -es, -d, -ed, -ing, -ion, -tion, -ance and -ment, with a final e
dropped before the ending and the last consonant doubled before -ed and -ing. No pattern is ever built from the
configuration or from a report.

## Sections

A section runs from its heading to the next heading at its level or above in the same file. A heading names a kind of
section when its words, with any numbering left out ("3.1", "A)", "Section 2:"), hold one of the phrases of that kind
as whole words in order: `Legal and compliance` names the legal angle, `Legality` does not.

The first heading of the first file is the **title** of the report when it is a level 1 heading. The title never
counts as a section, so a report titled "Feasibility study: cost tracking" does not become its own cost section. A
level 1 heading anywhere else is an ordinary section.

When several headings name the same angle, the section of the angle is the one that also holds a word such as
`feasibility`, `viability`, `assessment` or `analysis`, then the one at the highest level, then the first. For risks
and assumptions, every matching heading counts, except one that lies inside the section of another.

## Labels

A label is a phrase followed by a colon, anywhere in a line: `Owner: Dana`, `**Rating:** amber`, `- Status: open`,
`Go/no-go: go`. Its value runs to the next semicolon, the next pipe or the end of the line, with emphasis and code marks
and a final full stop left out. A label in a table is a row whose first cell is the label (`| Verdict | Go |`) or, where
the rule says so, a column whose header is the label. A value that is empty, a dash, a question mark or one of
`tbd`, `tba`, `todo`, `none`, `n/a`, `na`, `unknown`, `unassigned`, `nobody`, `no one` and `not assigned` says nothing.

## Items

The risks and the assumptions are items of their sections: every row of every table in the section, and every
top-level item of its lists, with the lines that continue it and its nested items. A section that holds neither a
table nor a list takes its subheadings at the highest level under it as items, each with the text under it. A
section that holds none of these, such as a section of paragraphs, lists nothing.

## Rules

### `missing-verdict`

Looks for a verdict in three places: a heading that is exactly one of the verdict headings (`Verdict`,
`Recommendation`, `Overall recommendation`, `Go/no-go` and their kin), with the verdict after a colon in the heading or
on the first line of text under it; a line labelled `Verdict`, `Overall verdict`, `Final verdict` or `Go/no-go`; and a
line labelled `Recommendation`, which counts only when its value is a verdict, because "Recommendation:" also starts
ordinary advice. A report with none of these is a finding for the whole report.

A verdict is the longest verdict phrase its value starts with: `go`, `proceed` and `go ahead` are go; `go with
changes`, `go with conditions`, `conditional go`, `proceed with changes`, `change` and `changes` are go with changes;
`stop`, `no go`, `no-go`, `do not proceed`, `don't proceed` and `do not go ahead` are stop. When the first line under a
verdict heading does not start with a verdict, a verdict written in bold in its first paragraph counts ("We recommend
**go with changes**."). It cannot see a verdict written only in prose ("we think the team should go ahead").

### `unknown-verdict`

A verdict heading whose first line, or a verdict line, does not give a verdict, and a verdict heading with nothing
under it. A line labelled `Recommendation` whose value is not a verdict is never this finding. Every such place is
reported, even when the report gives a clear verdict elsewhere.

### `conflicting-verdict`

Two verdicts in one report that are not the same: go and stop, or go and go with changes. Reported once, at the first
verdict that differs from the first one. The first verdict is the verdict of the report in the summary.

### `missing-angle`

An angle of the required list (technical, financial, operational, schedule and legal by default) that no heading other
than the title names by one of its aliases. Reported for the whole report. It cannot see an angle discussed under a
heading with none of its aliases; add the heading to the aliases of the angle.

### `missing-rating`

The section of an angle with no rating. A rating is read, in this order, from the heading itself after a colon or in
its last parentheses (`Technical feasibility: amber`, `Technical feasibility (green)`, read only when it is a rating
word), from a line in the section labelled `Rating`, `Feasibility`, `Assessment`, `RAG`, `RAG status`, `Status` or
`Score`, from a column of a table in the section headed by one of those labels, and from a rating table anywhere in the
report: a table with such a column whose first cell names the angle by an alias, alone or with words such as
`feasibility` (`| Technical feasibility | Feasible |`). A row about "Technical debt" does not rate the technical
angle. A rating that says nothing (`Rating: TBD`) is this finding too.

### `unknown-rating`

The section of an angle that has a rating, but none of its ratings starts with a rating word: `feasible`, `not
feasible`, `infeasible`, `feasible with conditions`, `conditionally feasible`, `partly feasible`, `partially feasible`,
`at risk`, `high`, `medium`, `low`, `red`, `amber`, `yellow` and `green`. A warning by default, because a rating is
there to read; add the team's own words to `words.ratings`.

### `missing-risks`

No heading names `risk` or `risks`, or the risk sections list no item. A heading such as "Riskiest parts" does not
name risks, because `riskiest` is another word.

### `risk-without-response`

A risk whose text, with its nested items and its table row, holds none of the response words in any form of the last
word: accept, reduce, mitigate, avoid, transfer and design around. It cannot tell a response from a mention: "we cannot
mitigate this" counts as a response. A word that only starts like one, such as "avoidable", does not.

### `risk-without-owner`

A risk with no value for `Owner`, `Owners`, `Risk owner`, `Owned by`, `Responsible` or `Accountable`, as a labelled
line or as a table column, or whose value says nothing (`Owner: TBD`, an empty cell). It does not check that the owner
is a person or a role.

### `missing-assumptions`

No heading names `assumption` or `assumptions`, or the assumption sections list no item.

### `untested-assumption`

An assumption whose status says it is not tested yet. The status is a value labelled `Status`, `State`,
`Validation`, `Validated`, `Tested` or `Verified`, in a line or a table column; it is open when it starts with
`untested`, `open`, `unverified`, `unvalidated`, `not tested`, `not verified`, `not validated`, `not yet tested`,
`pending` or `unknown`. With no status label, a word in brackets that is one of those (`(untested)`, `[open]`) counts,
and so does `untested`, `unverified` or `unvalidated` anywhere in the item. The word "open" on its own ("an open
question") does not, and a status label always wins over a word in the text.

### `missing-cost`

No heading names `cost`, `costs`, `budget`, `investment`, `tco` or `total cost of ownership`, or every such section is
empty. A heading such as "Financial feasibility" is not a cost section; a cost estimate under it is, when it has its
own heading such as "Cost estimate".

### `single-estimate`

A line that gives an amount of money or time as one number. The lines checked are every line of a section whose
heading names cost (as above) or an estimate (`estimate`, `estimates`, `effort`, `timeline`, `duration`, `schedule`),
and every line anywhere labelled `Cost`, `Costs`, `Budget`, `Estimate`, `Effort`, `Duration` or `Timeline`. An amount
of money is a number with a currency sign ($, pound or euro sign) or a code (USD, EUR, GBP, AUD, CAD, CHF) before or
after it, or followed by dollars, euros or pounds, with digits grouped by commas and an optional k, m, bn, thousand,
million or billion. An amount of time is a number with a unit from hours to years, such as weeks, sprints or
person-days.

A line gives a range, and is not a finding, when two numbers are joined by a dash, an en dash, an em dash, "to" or
"..", when it says "between ... and ...", when it gives a margin (`+/-`, the plus-minus sign, "plus or minus"), or, in
a table row, when two cells hold an amount of the same kind (a low and a high column). A line that holds `fixed`,
`quoted`, `actual`, `actuals`, `spent`, `paid` or `invoiced` states a known figure and is not checked. Only the first
2,000 characters of a line are read. It cannot see that "Phase 1 - 6 weeks" is one number: a step number before a
duration reads as a range.

### `prototype-without-results`

The report mentions `prototype`, `proof of concept`, `PoC` or `technical spike` (or `prototyped`, `prototypes` and the
other forms) outside its next steps, and no heading names `result`, `results`, `finding`, `findings`, `limit`,
`limits`, `limitation`, `limitations`, `learnings`, `outcome` or `outcomes` together with a prototype word in the heading
itself or in a heading above it, with text under it. "Prototype results", "PoC findings" and "Limits" under "Proof of
concept" all count; a plain "Findings" section of the report does not. A prototype in the next steps is still to be
built, so it is not a mention.

### `missing-next-steps`

No heading names `next steps`, `next step`, `action plan`, `actions`, `way forward`, `follow up` or `follow ups`, or
every such section is empty.

## Levels and the result

Each rule has a level: `error`, `warning`, `notice`, or `off`, which does not run it. The defaults are in the README.
`--min-severity` (or `minSeverity`) hides the findings below a level; they are counted in a note. The run fails, with
exit code `1`, when a finding at the level `error` remains. Each rule lists at most 500 findings; the rest are counted
in a note and still count for the result.
