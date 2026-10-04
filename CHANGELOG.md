# Changes

## 1.0.0

First release.

- Checks a software feasibility study report written in Markdown, one file or the Markdown files of a folder read as one report, or with `--each` as reports of their own, and reports what keeps it from being a usable study: no verdict, angles with no section or no rating, risks with no response or no owner, no assumptions or assumptions still open, no cost section, costs and times given as one number, a prototype with no results or limits, and no next steps.
- Fifteen rules: `missing-verdict`, `unknown-verdict`, `conflicting-verdict`, `missing-angle`, `missing-rating`, `unknown-rating`, `missing-risks`, `risk-without-response`, `risk-without-owner`, `missing-assumptions`, `untested-assumption`, `missing-cost`, `single-estimate`, `prototype-without-results` and `missing-next-steps`, each with a level of its own (`error`, `warning`, `notice` or `off`) and the points of the public pages it rests on.
- Five default angles, technical, financial, operational, schedule and legal, each found by whole words in a heading, with angles of your own and `--angles` to set the list for one run. A verdict is go, go with changes or stop, read from a verdict heading, a labelled line, a table row or the front matter. A rating is read from a labelled line, a table column, the heading itself or a rating table anywhere in the report.
- A configuration file in strict JSON over documented defaults: every heading list, word list, verdict phrase and rule level can be replaced, added to or removed from; a key the tool does not know is an error with its line and a suggestion, and a key named twice is refused.
- Reports as text, JSON and GitHub workflow commands (`--format github`) that show each finding as an annotation on its file and line, with `--min-severity` to hide the findings below a level and `--explain` to show the rule and the sources behind each finding. Exit code `0` when no finding is at the level error, `1` when one is, `2` for a usage or input error, with no result.
- Reads no clock, follows no symbolic link, fetches nothing, writes nothing to disk, and refuses binary, UTF-16 and invalid UTF-8 input; every input has a size limit.
- Release packages come with a CycloneDX SBOM, SHA-256 checksums and a build provenance attestation, after the SSDF gate of the repository.
