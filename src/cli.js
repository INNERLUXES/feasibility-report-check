// Command line: feasibility-report-check <file-or-folder> [options]

import { readFileSync } from 'node:fs';
import { InputError, LIMITS, checkPaths } from './check.js';
import { defaultsAsConfig } from './config.js';
import { LEVELS } from './data.js';
import { toGithub, toJson, toText } from './report.js';
import { RULES } from './rules.js';
import { safeText } from './text.js';

export const VERSION = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')).version;

const FORMATS = { text: toText, json: toJson, github: toGithub };

export const USAGE = `Usage: feasibility-report-check <file-or-folder> [options]

Checks a software feasibility study report written in Markdown, one file or the Markdown files of a folder read as one
report: a verdict of go, go with changes or stop; a section with a rating for each feasibility angle (technical,
financial, operational, schedule and legal by default); a risks section where every risk has a response (accept,
reduce, mitigate, avoid, transfer, design around) and an owner; an assumptions section, with assumptions that are not
tested yet flagged; a cost section, with costs and times given as ranges rather than one number; a results or limits
section for a prototype that is mentioned; and next steps. It opens no network connection, follows no symbolic link
and writes nothing to disk.

Options:
  --config <file>           a configuration file (JSON) that changes the angles, the headings, the words or the
                            rules (default: the built-in configuration; --print-defaults shows it)
  --format <name>           text, json or github (default: text); github writes workflow commands that GitHub shows
                            as annotations on the files
  --json                    the same as --format json
  --min-severity <level>    the lowest level of a finding that is shown: ${LEVELS.join(', ')} (default: minSeverity of
                            the configuration, else notice)
  --angles <list>           the angles the report must cover, by id, separated by commas, such as
                            technical,financial,legal (default: angles of the configuration)
  --each                    with a folder, check every Markdown file as a report of its own
  --explain                 show the rule and the public sources behind each finding
  --print-defaults          print the built-in configuration as a configuration file and exit
  --help                    show this text
  --version                 show the version

Rules: ${RULES.map((r) => `${r.id} (rules.${r.key})`).join(', ')}.

Exit codes: 0 no finding at the level error, 1 a finding at the level error, 2 usage or input error.
`;

const isUrl = (f) => /^[a-z][a-z0-9+.-]*:\/\//i.test(f);
const ANGLE_ID = /^[a-z][a-zA-Z0-9]*$/;

export function parseArgs(argv) {
  const o = { input: null, config: null, format: null, json: false, minSeverity: null, angles: null, each: false, explain: false, printDefaults: false, help: false, version: false };
  const once = (name, current, value) => {
    if (current !== null) throw new Error(`${name} was given twice`);
    return value;
  };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    const next = () => {
      const v = argv[i + 1];
      if (v === undefined || (v.startsWith('--') && v.length > 2)) throw new Error(`${a} needs a value`);
      if (v === '-') throw new Error('reading from standard input is not supported; give a file');
      i += 1;
      return v;
    };
    if (a === '--help' || a === '-h') o.help = true;
    else if (a === '--version' || a === '-v') o.version = true;
    else if (a === '--explain') o.explain = true;
    else if (a === '--each') o.each = true;
    else if (a === '--json') o.json = true;
    else if (a === '--print-defaults') o.printDefaults = true;
    else if (a === '--config') o.config = once(a, o.config, next());
    else if (a === '--format') o.format = once(a, o.format, next());
    else if (a === '--min-severity') o.minSeverity = once(a, o.minSeverity, next());
    else if (a === '--angles') o.angles = once(a, o.angles, next());
    else if (a === '-') throw new Error('reading from standard input is not supported; give a file or a folder');
    else if (a.startsWith('-')) throw new Error(`unknown argument ${a}`);
    else if (o.input !== null) throw new Error(`one file or folder at a time; ${a} is a second one`);
    else o.input = a;
  }
  if (o.json) {
    if (o.format !== null && o.format !== 'json') throw new Error(`--json and --format ${o.format} ask for two formats; give one`);
    o.format = 'json';
  }
  if (o.format === null) o.format = 'text';
  if (o.angles !== null) {
    const ids = o.angles.split(',').map((s) => s.trim()).filter(Boolean);
    if (!ids.length) throw new Error('--angles needs at least one angle id, such as technical,financial');
    const bad = ids.find((id) => !ANGLE_ID.test(id));
    if (bad) throw new Error(`--angles: "${bad}" is not an angle id (a letter a to z followed by letters and digits)`);
    o.angles = ids;
  }
  if (!o.help && !o.version && !o.printDefaults) {
    if (!o.input) throw new Error('give the report to check, a Markdown file or a folder, such as feasibility-report-check docs/feasibility.md');
    for (const p of [o.input, o.config].filter(Boolean)) if (isUrl(p)) throw new Error('give a local path; the tool never fetches a URL');
    if (!Object.hasOwn(FORMATS, o.format)) throw new Error(`unknown format ${o.format} (text, json or github)`);
    if (o.minSeverity !== null && !LEVELS.includes(o.minSeverity)) throw new Error(`unknown level ${o.minSeverity} (${LEVELS.join(', ')})`);
  }
  return o;
}

const clean = (text) => safeText(text, 1500);

// Exit code: 0 no finding at the level error, 1 a finding at the level error, 2 usage or input error.
export async function main(argv, io = { out: (t) => process.stdout.write(t), err: (t) => process.stderr.write(t) }, limits = undefined, base = process.cwd()) {
  let o;
  try {
    o = parseArgs(argv);
  } catch (error) {
    io.err(`feasibility-report-check: ${clean(error.message)}\n\n${USAGE}`);
    return 2;
  }
  if (o.help) {
    io.out(USAGE);
    return 0;
  }
  if (o.version) {
    io.out(`${VERSION}\n`);
    return 0;
  }
  if (o.printDefaults) {
    io.out(`${JSON.stringify(defaultsAsConfig(), null, 2)}\n`);
    return 0;
  }
  let report;
  try {
    report = await checkPaths({ input: o.input, config: o.config, angles: o.angles, minSeverity: o.minSeverity, each: o.each, version: VERSION, limits: { ...LIMITS, ...(limits ?? {}) }, base });
  } catch (error) {
    if (error instanceof InputError) io.err(`feasibility-report-check: no result, the input has ${error.problems.length === 1 ? 'a problem' : 'problems'}:\n${error.problems.map((p) => `  ${clean(p)}`).join('\n')}\n`);
    else io.err(`feasibility-report-check: ${clean(error.message)}\n`);
    return 2;
  }
  io.out(FORMATS[o.format](report, { explain: o.explain }));
  return report.result.pass ? 0 : 1;
}
