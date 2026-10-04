# 1. Read no clock, and keep dates out of the repository

## Status

Accepted

## Context

A feasibility report is full of time: a deadline, a start, a duration, the month a prototype ran. It is tempting to
check these against today: a start that is already past, a study that is old. Doing so would make the same report give
a different result on a different day, so a pipeline that passed yesterday could fail today with no change to the
repository. It would also make the tool read dates in every format a team writes them, and guess the time zone of the
person who wrote them.

The checks that matter here do not need a date. Whether a cost or a time is given as a range, whether the study says
what its prototype showed, whether an assumption is still open: all of these can be read from the report as it is.

## Decision

1. The tool reads no clock, no time zone and no locale. The same report gives the same output on every machine and on
   every day.
2. A date in a report is text like any other. The only amounts the tool reads are money and durations, to see whether
   they are given as ranges (`single-estimate`); a duration is a number of hours, days, weeks, months, sprints,
   quarters or years, never a date.
3. No file of this repository holds a date or a number that reads like a year: not the licence, not the changelog, not
   the examples, not the documents. The made-up reports in `examples/` give durations, not dates. `npm run check` and
   a test fail on any number that reads like a year.

## Consequences

- A report whose dates are wrong, or whose plan has already slipped, passes as long as its structure is sound. The
  limits in docs/limits.md say so.
- The output of a run can be saved in the repository (`examples/output`) and compared on every change, because it does
  not move with the calendar.
- The README, the documents and the examples can be read in any year without being out of date about a date.
