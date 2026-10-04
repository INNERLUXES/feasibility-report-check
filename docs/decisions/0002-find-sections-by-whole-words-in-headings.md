# 2. Find sections by whole words in their headings

## Status

Accepted

## Context

Feasibility reports have no single template. One team writes "Technical feasibility", another "3.1 Technology
assessment", another "Legal and compliance" or "Regulatory review". A tool that asks for exact headings fails good
reports; a tool that guesses from the text under a heading gives results nobody can predict or check.

Words in headings are also used in other ways. A report titled "Feasibility study: cost tracking app" is not its own
cost section. "Riskiest parts of the build" is not a risk register. "Technical debt" in a summary table does not rate
the technical angle. And a report can name an angle twice: "Technical approach" early on, "Technical feasibility"
later, with the rating under the second.

## Decision

1. A heading names a kind of section when its words, with numbering left out, hold one of the phrases of that kind as
   whole words in order. Words are the ASCII letters and digits of the heading in lowercase, every other character read
   as a space. `Legal and compliance` names the legal angle; `Legality` does not, and neither does `Riskiest`.
2. A verdict heading is stricter: the whole heading must be one of the verdict headings, because "Recommendations for
   the vendor" is advice, not a verdict.
3. The first heading of the first file, when it is a level 1 heading, is the title and never counts as a section.
4. When several headings name the same angle, the one that also says "feasibility" or a word like it wins, then the one
   at the highest level, then the first. For risks and assumptions every matching heading counts, except one inside the
   section of another, so items are not counted twice.
5. The phrases are lists in the configuration. A team with its own headings adds them; no pattern is ever built from
   the configuration.

## Consequences

- A section under a heading with none of its phrases is reported missing, with the phrases the tool looked for, so the
  fix is either a clearer heading or one more alias.
- The rule is simple to state and to test, and the same heading gives the same result in every report.
- A report written in another language, or with headings that only describe their content ("What could go wrong"),
  needs its own phrases in the configuration.
- A title that is a level 2 heading, or a report whose first file starts with a section, has no title; every heading is
  then a section.
