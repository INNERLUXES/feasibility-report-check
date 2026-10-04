# Secure defaults

The default run is the safe run. Nothing in the first section needs a flag, and none of it can be switched off. The rest
of the document is about what the tool cannot do for you: where the reports come from, where the output goes, and who
may change the configuration.

## How the tool behaves by default

- **Reads, never follows.** The tool reads the file it is given, or lists the folder once and reads the Markdown files
  in it. It follows no symbolic link in the folder, reads no subfolder, fetches no web address, refuses an argument
  that looks like an address, starts no program and writes nothing to disk.
- **The five angles from the first run.** Without a configuration, the technical, financial, operational, schedule and
  legal angles are required, and every rule is on.
- **Unknown keys are errors.** A key in the configuration that the tool does not know stops the run, with its line and
  a suggestion, so a typo cannot leave a default in place unnoticed. A key named twice stops the run. Removing an
  entry that is not on a list, adding one that is already there, an alias shared by two angles and a phrase shared by
  two verdicts stop the run too.
- **Fail closed on what it cannot read.** An input that cannot be read stops the run with exit code `2` and no result:
  a missing file, a folder with no Markdown file, a file over its limit, a binary file, UTF-16, bytes that are not
  UTF-8, too many entries, too many lines.
- **Empty is not found.** A rating, an owner or a status that says nothing (TBD, a dash, an empty cell) counts as
  missing, and a section with nothing under it counts as missing.
- **No regular expression from the input.** No pattern is built from a report or the configuration. Phrases are lists
  of words compared word by word, and the patterns for amounts are fixed and read at most 2,000 characters of a line.
- **No prototype tricks.** JSON objects are built with own properties, an angle id is a letter followed by letters and
  digits, and a name such as `__proto__` stays data.
- **Clean output.** Text from the input, file names included, has control characters, line separators and direction
  controls removed and its length capped before it reaches a report or an error message. The GitHub format escapes
  `%`, CR and LF in a message and also `:` and `,` in a property, as the GitHub documentation lists them, so a heading
  cannot end a workflow command early or start another one.
- **The same report gives the same output.** The tool reads no clock, no time zone, no locale and no random number
  ([decision 1](decisions/0001-read-no-clock-and-keep-dates-out-of-the-repository.md)). Files are taken in the order
  of their names by code units, and case is changed for the letters A to Z only.
- **No dependencies.** Node 22 or newer and nothing else.

## Settings that make the check stricter

- **`"rules": { "singleEstimate": "error", "untestedAssumption": "error" }`.** A single number or an open assumption
  fails the run.
- **`"rules": { "unknownRating": "error", "prototypeWithoutResults": "error" }`.** A rating that is not a rating word,
  or a prototype with no results, fails the run.
- **An angle of your own.** `"aliases": { "security": ["security"] }, "angles": { "add": ["security"] }` makes every
  report carry a rated security section.
- **`"words": { "exact": [] }`.** No line is taken as a known figure; every amount in a cost section needs a range.

## Running it in a pipeline

```yaml
permissions:
  contents: read
steps:
  - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
  - uses: actions/setup-node@820762786026740c76f36085b0efc47a31fe5020 # v7.0.0
    with:
      node-version: 22
  - name: Feasibility report check
    run: npx --yes github:INNERLUXES/feasibility-report-check docs/feasibility --format github
```

- Give the job read access to the contents and nothing more. The tool needs no secret.
- Pin every action to a full commit, as above, and pin the tool to a release commit or a tag you have read, because
  `npx` runs what it downloads.
- Do not hide the exit code with a trailing `|| true`.
- A feasibility report can name budgets, vendors and plans. Post the output only where the people who may read the
  report read it.

## Protecting the configuration

The configuration decides which angles are required, which words count as a rating, a response or a verdict, and which
rules fail the run. Keep it in the repository, in its own path, and put the path in `CODEOWNERS` with the people who
own the review of feasibility studies; require their review in branch protection. Review a change that removes an
angle, sets a rule to off or lower, adds an empty value, or adds a word to `exact` like a change to code: each of them
can let a weak report pass.

## SSDF

The repository is checked against NIST SP 800-218 (SSDF) in its own pipeline and before every release, with
`ssdf-repo-check` pinned to its release commit. The evidence it looks for is in these files:

| Practice | Evidence in this repository |
| --- | --- |
| PO.1 Define security requirements | CONTRIBUTING.md, docs/secure-defaults.md |
| PO.2 Roles and responsibilities | .github/CODEOWNERS |
| PO.3 Toolchain | .github/workflows/ci.yml, codeql.yml, release.yml |
| PO.4 Criteria for security checks | CodeQL with the security-extended queries, the SSDF gate in ci.yml and release.yml |
| PO.5 Secure environments | a `permissions:` block in every workflow, actions pinned to commits |
| PS.1 Protect the code | .gitignore for keys and `.env`, `npm run check` for committed secrets |
| PS.2 Integrity of releases | SHA-256 checksums and a build provenance attestation in release.yml |
| PS.3 Archive and provenance | a CycloneDX SBOM and the CHANGELOG with every release |
| PW.1 Design for security | docs/threat-model.md |
| PW.2 Review the design | docs/decisions |
| PW.4 Reuse secure components | no runtime dependencies, a lock file, Dependabot |
| PW.5 Secure coding | CONTRIBUTING.md, `npm run check` |
| PW.6 Build settings | `npm ci` from the lock file |
| PW.7 Code review | the pull request template and CODEOWNERS |
| PW.8 Testing | `npm test` on Linux, Windows and macOS with Node 22 and 24, `npm run test:coverage`, hostile input tests |
| PW.9 Secure defaults | this document |
| RV.1 Find vulnerabilities | SECURITY.md, Dependabot |
| RV.2 Respond to vulnerabilities | SECURITY.md |
