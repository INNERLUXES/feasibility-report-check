// Shared test helpers: reports and configurations built inline, checked in memory or written into a temporary folder
// that is removed after the test. Paths are built with resolve() from forward-slash names, so the same test runs on
// Linux, macOS and Windows. The line a test expects is found with lineOf(), which counts lines the way the tool does, so
// a test never holds a line number worked out by hand for one system only; columnIn() does the same for a column. No
// test reads the clock, the time zone or the locale.

import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { buildReport, defaultConfig, lineStarts, main, positionOf, readConfig, readDocument } from '../src/index.js';

export async function withFiles(files, fn) {
  const dir = await mkdtemp(resolve(tmpdir(), 'feasibility-report-check-'));
  try {
    for (const [rel, content] of Object.entries(files)) {
      await mkdir(dirname(resolve(dir, rel)), { recursive: true });
      await writeFile(resolve(dir, rel), content);
    }
    return await fn(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

function offsetOf(text, needle, n) {
  let at = -1;
  for (let i = 0; i < n; i += 1) {
    at = text.indexOf(needle, at + 1);
    if (at < 0) throw new Error(`${needle} is not in the text ${n} times`);
  }
  return at;
}

// The line (from 1) of the n-th place where needle starts in text.
export const lineOf = (text, needle, n = 1) => positionOf(lineStarts(text), offsetOf(text, needle, n)).line;

// The column (from 1) of the n-th place where needle starts in text, in its line.
export const columnIn = (text, needle, n = 1) => positionOf(lineStarts(text), offsetOf(text, needle, n)).column;

// A text from lines.
export const md = (...lines) => `${lines.join('\n')}\n`;

// The configuration of a configuration object, through the real reader, or the defaults.
export const configOf = (object) => (object ? readConfig(JSON.stringify(object), 'config.json') : defaultConfig());

// The sections of a complete report that passes every check, in order. A test replaces one of them, or sets it to null
// to leave it out.
export const SECTIONS = {
  title: md('# Feasibility study: booking service'),
  verdict: md('## Verdict', '', 'Go. The service fits the budget.'),
  technical: md('## Technical feasibility', '', 'Rating: feasible', '', 'The vendor interface covers the booking flow.'),
  financial: md('## Financial feasibility', '', 'Rating: feasible', '', 'It pays back in 14 to 20 months.'),
  operational: md('## Operational feasibility', '', 'Rating: amber', '', 'Staff restock the lockers twice a day.'),
  schedule: md('## Schedule feasibility', '', 'Rating: feasible', '', 'The first release takes 10 to 14 weeks.'),
  legal: md('## Legal feasibility', '', 'Rating: at risk', '', 'The vendor must sign the data terms.'),
  risks: md('## Risks', '', '- The vendor changes its interface. Reduce: fix the version in the contract. Owner: head of partnerships', '- Staff skip a restock. Mitigate: add it to the checklist. Owner: depot lead'),
  assumptions: md('## Assumptions', '', '- Customers collect within three days. Status: tested with a survey'),
  cost: md('## Cost estimate', '', '- Build: $90,000 to $130,000', '- Rental: $18,000 to $24,000 each year'),
  next: md('## Next steps', '', '1. Send the data terms to the vendor.')
};

// A report with some sections replaced; extra text goes at the end.
export function report(over = {}, extra = '') {
  const s = { ...SECTIONS, ...over };
  return Object.keys(SECTIONS).map((k) => s[k]).filter((v) => v !== null).join('\n') + extra;
}

// The report object of texts checked in memory: one text, or { name: text } read as one report in the order of the
// names, with a configuration object or none.
export function reportOf(texts, config = null, { minSeverity = 'notice', each = false } = {}) {
  const files = typeof texts === 'string' ? { 'report.md': texts } : texts;
  const names = Object.keys(files).sort();
  const docs = names.map((n) => readDocument(n, files[n]));
  const cfg = configOf(config);
  const input = { path: names.length === 1 ? names[0] : 'folder', kind: names.length === 1 ? 'file' : 'folder', mode: each ? 'each file' : 'one report', files: names, ignored: [], folders: [], links: [] };
  return buildReport({ input, groups: each ? docs.map((d) => [d]) : [docs], config: cfg, minSeverity, version: 'test' });
}

// The findings of a report, of one rule or of all.
export const findingsOf = (r, rule) => r.findings.filter((f) => !rule || f.rule === rule);

// The rule ids of the findings of a report, in order.
export const rulesOf = (r) => r.findings.map((f) => f.rule);

// Writes the files and runs the command line with these arguments (paths relative to the folder).
export async function run(files, args = [], limits) {
  return withFiles(files, async (dir) => {
    let out = '';
    let err = '';
    const code = await main(args, { out: (t) => { out += t; }, err: (t) => { err += t; } }, limits, dir);
    return { code, out, err, dir };
  });
}

// Runs the command line with exactly these arguments, in a folder.
export async function cli(argv, base) {
  let out = '';
  let err = '';
  const code = await main(argv, { out: (t) => { out += t; }, err: (t) => { err += t; } }, undefined, base);
  return { code, out, err };
}
