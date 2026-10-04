# Limits

The tool checks the structure of a feasibility report: that it gives a verdict, covers the angles with a rating, lists
risks with a response and an owner, lists assumptions, has a cost section, gives estimates as ranges, reports what a
prototype showed, and ends with next steps. It does not read what the report means, and a report with no finding can
still be a poor study, or a good study of the wrong question. Every report ends with a sentence that says so.

## What it cannot see

- **Meaning.** The tool finds headings, labels, words and numbers. It cannot tell whether a rating is honest, whether
  the verdict follows from the angles, whether a response would work, or whether a range is wide enough.
- **Sections under other headings.** A section is found by whole words in its heading. An angle discussed under a
  heading with none of its aliases is reported missing; add the heading to the aliases in the configuration.
- **A verdict in prose.** "We think the team should go ahead" is not read as a verdict. Start the line under the
  verdict heading with the verdict, write it in bold, or write `Verdict: go`.
- **Responses in context.** "We cannot mitigate this" counts as a response, because the word is there.
- **Who an owner is.** `Owner: someone` counts; only empty values such as TBD do not.
- **Every way to write a number.** Amounts are read with digits grouped by commas ("$120,000"); "120 000" or
  "120.000" is read as smaller numbers, and an amount written in words ("forty thousand dollars") is not read. A step
  number before a duration ("Phase 1 - 6 weeks") reads as a range.
- **Estimates outside the cost and estimate sections.** A line elsewhere is checked only when it is labelled as an
  estimate (`Budget: $180,000`).
- **A prototype that is planned, not built,** outside the next steps: "we could build a prototype" in another section
  counts as a mention.
- **Markdown beyond the subset.** Setext headings of more than one line, indented code blocks, HTML blocks other than
  comments and block quotes are not read as CommonMark reads them (docs/method.md).
- **Words beyond ASCII.** Words are compared as the letters A to Z and digits; a heading written in another script, or
  with accented letters, is read as the ASCII letters in it.
- **Files in subfolders.** Only the files directly in the folder are read. Run the tool once for each subfolder.
- **Symbolic links.** A file kept as a symbolic link in the folder is not read; the note names it.

## Size limits

Past a limit, the input is refused with exit code `2` and no result, or, where the limit is on the work and not the
input, the report says so in a note.

| What | Limit |
| --- | --- |
| entries in the folder | 5,000 |
| one file | 1 MB, 200,000 lines |
| all files together | 32 MB |
| configuration file | 1 MB; 50 angles; 500 entries in a list; 120 characters for an entry |
| JSON of the configuration | nesting 32 deep, 100,000 values, 4,096 characters in a string |
| front matter | 200 lines between the opening and the closing line |
| a line read for labels | the first 4,000 characters |
| a line read for amounts | the first 2,000 characters |
| items of one section | 5,000 |
| findings of one rule | 500 listed; the rest are counted in a note and still count for the result |
| problems of the input | 20 listed; the rest are counted |

The tests read reports with five thousand risks, assumptions and estimates, a line of megabytes, forty thousand
headings, and lines full of colons, pipes, dashes, digits, comment openers and bold marks, each with a time check.
