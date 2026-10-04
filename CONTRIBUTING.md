# Contributing

Every change goes through a pull request and is reviewed before it is merged. The pipeline runs the tests on Linux, Windows and macOS with Node 22 and 24, the tests with coverage, the repository checks, CodeQL, and a secure development check of the repository itself.

Commit messages in this repository follow Conventional Commits: `feat:`, `fix:`, `docs:`, `test:`, `ci:`, `chore:`, with `!` for a breaking change.

## Changing a rule

1. Describe the change in docs/method.md first: what the rule looks at and what it can and cannot see. Where the tool makes its own choice, say so in `own` in src/rules.js and say why.
2. Keep the rules conservative. A finding must point at something a reader can check in the report: a heading that is not there, a label with no value, a word, a number. Never add a rule that guesses what a sentence means.
3. A run must never pass because something could not be read: an input that cannot be read stops the run with exit code `2`.
4. Never read the clock or a date ([decision 1](docs/decisions/0001-read-no-clock-and-keep-dates-out-of-the-repository.md)).
5. Add a test with the report written inline (`report()` and `reportOf()` in test/helpers.js build one from sections that pass every check), small enough that the result can be worked out by hand, with a near miss on each side.
6. A rule id, once released, keeps its meaning: pipelines and other tools read it from the JSON output and the GitHub annotations.

## Changing a default word or heading

1. Sections are found by whole words in their headings ([decision 2](docs/decisions/0002-find-sections-by-whole-words-in-headings.md)). A new phrase must not make an ordinary heading match: test it against a heading that should not match.
2. An alias belongs to one angle only, and a verdict phrase to one verdict only; the configuration refuses both.
3. Describe the change in docs/inputs.md and in the README.

## Changing the configuration file

1. A new key is added to `KEYS` in src/config.js, documented in docs/inputs.md, and tested with a good value and a bad one. Every key the tool does not know stays an error, and an object that names a key twice stays refused.
2. A list keeps the array form and `replace`, `add` and `remove`; removing an entry that is not there stays an error.
3. Never add a key that takes a regular expression.

## Changing a source

1. Every point the reports show is in src/data.js, written in this project's own words, with the page it comes from. A short phrase of a page may be named; a long quotation may not.
2. research/sources.md lists every page with a note on what it says, and docs/rules-and-sources.md lists every rule with its points. A test checks all three against each other.

## Changing a reader

1. The tool reads; it never follows. A symbolic link in the folder is never read, and nothing outside the inputs is opened.
2. Keep the work bounded: the limits of docs/limits.md, and a hostile test with a large input and a time check.
3. A time check in a test widens under coverage: read `process.env.NODE_V8_COVERAGE`, which the test runner sets only when coverage is on, and allow four times the time. Never read the flags of the process for this, because they hold the coverage flags of the runner in every run. Run `npm run test:coverage` before you open the pull request.
4. A report written with LF and with CRLF line ends, with or without a byte order mark, must give the same output. The example reports are stored as written (`.gitattributes`), and a test reads them both ways.
5. Where the reader is simpler than CommonMark, say so in docs/method.md.

## Tests that depend on the system

A test that depends on the operating system (a symbolic link, a device, file permissions) is guarded with `process.platform`, says why in its `t.skip`, and asserts no line or column of its own: a line or column is asserted only in a test that runs on every system, and is worked out there with `lineOf()` or `columnIn()` of test/helpers.js or from the text itself, never written by hand. `test/repo.test.js` fails when a guarded test asserts a line or a column. Every other test builds its paths with `resolve()` from names with forward slashes.

A test never reads the clock, the time zone or the locale.

## Rules for the code

- No runtime dependencies. Node 22 or newer and nothing else.
- The tool reads the report and the configuration it is given and writes only to standard output and standard error. It opens no network connection and runs no program.
- Text from the input, file names included, goes through `safeText` before it reaches the output or an error message.
- Source files stay ASCII; write any other character as a Unicode escape, or build it from its code point.
- Never commit a real secret, even as a fixture. `npm run check` fails on anything that looks like a credential.
- No file carries a date, and no file holds a number that reads like a year. Version numbers (Node 22, 1.0.0) and the numbers of a standard (RFC 8259, ISO/IEC 25010) are fine.
- Examples and tests use made-up teams, companies and projects, never a real study of a real company.
- Plain words in the documents: `npm run check` fails on a short list of words that say little.

## Before you open the pull request

```
npm test
npm run test:coverage
npm run check
npm run example
```
