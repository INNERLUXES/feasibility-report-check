# Threat model

## What the tool touches

- It reads the file named on the command line, or lists the folder named on the command line once and reads the
  Markdown files directly in it, and reads the configuration file named with `--config`. Nothing else is opened.
- It writes the report to standard output and its errors to standard error. It writes nothing to disk.
- It opens no network connection, follows no symbolic link in the folder, evaluates nothing it reads and starts no
  program.

## What the input may hold

A feasibility report lives in a repository that many people change. In a pipeline that checks every pull request, the
report is written by whoever opened the pull request, and so is the configuration.

Through the inputs, a person can try to:

- make the tool read a file outside the folder: a symbolic link in the folder named like a report that points at a key
  file, a symbolic link to the parent folder, a file swapped for a link between the listing and the read;
- make the tool fetch something: a path written as a web address;
- make a weak report pass: a verdict heading with nothing under it, a rating of TBD, an owner of TBD, a risks section
  of prose, a cost section with no text, a second verdict that contradicts the first, a heading hidden in a code block
  or a comment;
- move the result through the configuration: a key named twice, an unknown key that looks like a known one, a rule
  set to off, an angle removed, a word added to the empty values or to the known figures;
- exhaust the memory or the time: thousands of entries, a file of gigabytes, a line of megabytes, tens of thousands of
  headings, thousands of table rows, long runs of colons, pipes, dashes, digits, comment openers and bold marks, JSON
  nested a million deep;
- slip in something that is not text: a binary file named `.md`, a file in UTF-16, bytes that are not UTF-8;
- rewrite the terminal or break the output: control characters, ANSI escapes, direction controls and line separators in
  a file name, a heading or a value;
- start a second workflow command: a heading or a value that holds `::error`, `%`, a comma, a colon or a line break,
  which the GitHub format writes into a command;
- change how objects behave: a heading, a value, a label or an angle id such as `__proto__`, `constructor` or
  `toString`;
- make the output change from day to day: a date in the report.

## What could go wrong, and what stops it

| Risk | Control |
| --- | --- |
| A symbolic link makes the tool read a file outside the folder | The listing does not follow entries; a symbolic link is never read and is named in a note. Each file is opened with `O_NOFOLLOW` where the system has it, and its type is taken from the open handle, so a file swapped for a link after the listing is refused. A test links a report outside the folder and the parent folder in; neither is read |
| The tool fetches a web address | No module of the network is imported; a path that looks like an address is refused. A test checks the imports of src |
| A part that says nothing passes as present | A rating, an owner or a status that is empty, a dash or one of the empty values counts as missing; a section with nothing under it counts as missing; a verdict heading with nothing under it is a finding; two verdicts that differ are a finding |
| A heading in code or a comment counts | Fenced code and HTML comments are read as such and never hold a heading, a label or an item |
| A key named twice or an unknown key moves the result | The JSON reader refuses a repeated key; an unknown key stops the run with its line and a suggestion; removing an entry that is not on a list, a shared alias and a shared verdict phrase are refused |
| The memory or the time is exhausted | The folder listing stops at 5,000 entries; every file has a size limit checked on the open handle before it is read; lines are capped; labels are read from the first 4,000 characters of a line and amounts from the first 2,000; one pass finds the outer sections; findings are capped per rule. Tests check the time, with limits that widen under coverage only |
| A pattern from the input is slow | No regular expression is built from a report or the configuration; phrases are compared word by word; a test looks for `new RegExp` of anything but fixed text in src |
| A binary or UTF-16 file is read as text | A null byte, a UTF-16 byte order mark or bytes that are not valid UTF-8 stop the run with exit code `2` |
| Text from the input rewrites the terminal | Every text, file names included, goes through `safeText`, which removes control, line separator and direction characters and caps the length. A test puts ANSI escapes and direction controls in a file name, a heading and a value, in every format |
| A heading starts a second workflow command | The GitHub format escapes `%`, CR and LF in a message and `:` and `,` in a property; a line break never reaches a command. A test writes `::error` and `%` into a risk |
| `__proto__` changes how objects behave | The JSON reader defines own properties; an angle id must be a letter followed by letters and digits. A test uses `__proto__`, `constructor` and `toString` as a verdict, a rating, an owner and angle ids |
| A device or a pipe hangs the tool | A device, a pipe or a socket in the folder is passed over; a report or a configuration that is not a regular file is refused |
| The tool leaves files behind | Nothing is written to disk; there is no cache, no temporary file and no log. A test checks that a run leaves the folder as it was |
| The output changes with the clock | The tool reads no clock, no time zone and no locale ([decision 1](decisions/0001-read-no-clock-and-keep-dates-out-of-the-repository.md)) |

## Out of scope

Whether the project is feasible, whether the numbers are right, who may change the configuration in your repository,
and where your pipeline keeps the output.
