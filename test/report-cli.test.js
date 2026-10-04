import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdir } from 'node:fs/promises';
import { NOTICE, USAGE, VERSION, escapeData, escapeProperty, parseArgs, toGithub, toJson, toText } from '../src/index.js';
import { md, report, reportOf, run, withFiles, cli } from './helpers.js';

const GOOD = { 'study.md': report() };
const BAD = { 'study.md': report({ next: null, cost: md('## Cost', '', 'Build: $120,000') }) };

test('cli: exit 0 with no error, 1 with an error, and a warning alone does not fail the run', async () => {
  const good = await run(GOOD, ['study.md']);
  assert.equal(good.code, 0, good.err);
  assert.match(good.out, /^feasibility-report-check: study\.md\ninput: study\.md \(1 file, read as one report\)\nconfig: built-in defaults: angles technical, financial, operational, schedule, legal; minimum severity notice\n/);
  assert.match(good.out, /RESULT: PASS - no error\n$/);
  assert.equal(good.err, '');
  const bad = await run(BAD, ['study.md']);
  assert.equal(bad.code, 1);
  assert.match(bad.out, /RESULT: FAIL - 1 error \(and 1 warning\)\n$/);
  const warning = await run({ 'study.md': report({ cost: md('## Cost', '', 'Build: $120,000') }) }, ['study.md']);
  assert.equal(warning.code, 0);
  assert.match(warning.out, /RESULT: PASS - no error \(1 warning\)\n$/);
  const raised = await run({ ...warning.files, 'study.md': report({ cost: md('## Cost', '', 'Build: $120,000') }), 'c.json': '{"rules": {"singleEstimate": "error"}}' }, ['study.md', '--config', 'c.json']);
  assert.equal(raised.code, 1);
});

test('cli: exit 2 for usage errors, with the usage and nothing on standard output', async () => {
  for (const [args, message] of [
    [[], /give the report to check, a Markdown file or a folder/],
    [['a.md', 'b.md'], /one file or folder at a time; b\.md is a second one/],
    [['study.md', '--bogus'], /unknown argument --bogus/],
    [['study.md', '--format', 'html'], /unknown format html \(text, json or github\)/],
    [['study.md', '--format', 'json', '--format', 'text'], /--format was given twice/],
    [['study.md', '--json', '--format', 'github'], /--json and --format github ask for two formats; give one/],
    [['study.md', '--min-severity', 'fatal'], /unknown level fatal/],
    [['study.md', '--min-severity', 'error', '--min-severity', 'error'], /--min-severity was given twice/],
    [['study.md', '--config'], /--config needs a value/],
    [['study.md', '--config', '--json'], /--config needs a value/],
    [['study.md', '--angles', ' , '], /--angles needs at least one angle id/],
    [['study.md', '--angles', 'technical,Legal'], /--angles: "Legal" is not an angle id/],
    [['-'], /reading from standard input is not supported/],
    [['study.md', '--config', '-'], /reading from standard input is not supported/],
    [['https://example.com/study.md'], /give a local path; the tool never fetches a URL/]
  ]) {
    const r = await run(GOOD, args);
    assert.equal(r.code, 2, args.join(' '));
    assert.match(r.err, message);
    assert.ok(r.err.includes('Usage: feasibility-report-check'), args.join(' '));
    assert.equal(r.out, '');
  }
  assert.equal(parseArgs(['a.md', '--json', '--format', 'json']).format, 'json');
  assert.deepEqual(parseArgs(['a.md', '--angles', 'technical, legal,']).angles, ['technical', 'legal']);
});

test('cli: exit 2 for input errors, with every problem and no result', async () => {
  const missing = await run(GOOD, ['nowhere.md']);
  assert.equal(missing.code, 2);
  assert.equal(missing.err, 'feasibility-report-check: no result, the input has a problem:\n  nowhere.md: no such file or folder\n');
  assert.equal(missing.out, '');
  assert.match((await run({ 'docs/notes.txt': 'x' }, ['docs'])).err, /docs: holds no Markdown file \(\.md or \.markdown\) to read/);
  assert.match((await run({ ...GOOD, 'c.json': '{"nmae": 1}' }, ['study.md', '--config', 'c.json'])).err, /c\.json: line 1: "nmae" is not a key of the configuration; did you mean "name"\?/);
  assert.match((await run(GOOD, ['study.md', '--config', 'none.json'])).err, /none\.json: no such file/);
  assert.match((await run(GOOD, ['study.md', '--angles', 'security'])).err, /--angles: the angle "security" is not known/);
  assert.match((await run({ 'study.md': Buffer.from([35, 32, 0, 1]) }, ['study.md'])).err, /study\.md: holds binary data \(a null byte\); only text is read/);
  const two = await run({ 'r/a.md': Buffer.from([0xff, 0xfe, 35, 0]), 'r/b.md': Buffer.from([0x63, 0xe9, 0x0a]) }, ['r']);
  assert.equal(two.code, 2);
  assert.match(two.err, /the input has problems:\n {2}r\/a\.md: is UTF-16; only UTF-8 is read\n {2}r\/b\.md: is not valid UTF-8; only UTF-8 text is read\n/);
});

test('cli: --help, --version and --print-defaults exit 0 and need no input', async () => {
  const help = await run({}, ['--help']);
  assert.equal(help.code, 0);
  assert.equal(help.out, USAGE);
  for (const option of ['--config', '--format', '--json', '--min-severity', '--angles', '--each', '--explain', '--print-defaults', '--help', '--version']) assert.ok(USAGE.includes(option), option);
  assert.equal((await run({}, ['--version'])).out, `${VERSION}\n`);
  const defaults = await run({}, ['--print-defaults']);
  assert.equal(defaults.code, 0);
  assert.equal(JSON.parse(defaults.out).name, 'built-in defaults');
  assert.equal((await run({ 'c.json': defaults.out, ...GOOD }, ['study.md', '--config', 'c.json'])).code, 0, 'the printed defaults read back as a configuration');
});

test('cli: a folder is read as one report in the order of the names; README.md, other files and subfolders are not read', async () => {
  const files = { 'r/01-a.md': md('# Study', '', '## Verdict', '', 'Go.'), 'r/02-b.markdown': report({ title: null, verdict: null }), 'r/README.md': md('## Next steps'), 'r/notes.txt': 'x', 'r/old/03.md': md('## Verdict', '', 'Stop.') };
  const r = await run(files, ['r']);
  assert.equal(r.code, 0, r.out + r.err);
  assert.match(r.out, /input: r \(2 files, read as one report\)/);
  assert.match(r.out, /note: not read as part of the report: README\.md and notes\.txt\n/);
  assert.match(r.out, /note: 1 subfolder not read: old\n/);
  assert.match(r.out, /verdict {6}go, 01-a\.md:5\n/);
  const each = await run(files, ['r', '--each', '--json']);
  assert.equal(each.code, 1);
  const json = JSON.parse(each.out);
  assert.equal(json.input.mode, 'each file');
  assert.deepEqual(json.reports.map((x) => x.path), ['r/01-a.md', 'r/02-b.markdown']);
  assert.ok(json.findings.some((f) => f.rule === 'missing-verdict' && f.report === 'r/02-b.markdown' && f.at === 'r/02-b.markdown'));
  const cfg = await run({ ...files, 'c.json': '{"ignoreFiles": ["NOTES.TXT"]}' }, ['r', '--config', 'c.json']);
  assert.match(cfg.out, /input: r \(3 files, read as one report\)/, 'a README.md that is not ignored is read');
});

test('cli: --min-severity hides findings below it, and --angles sets the angles the report must cover', async () => {
  const text = report({ legal: null, cost: md('## Cost', '', 'Build: $120,000') });
  const all = await run({ 'study.md': text }, ['study.md']);
  assert.match(all.out, /findings: 2 \(1 error, 1 warning\)/);
  const errors = await run({ 'study.md': text }, ['study.md', '--min-severity', 'error']);
  assert.match(errors.out, /findings: 1 \(1 error\); 1 below error not shown/);
  assert.match(errors.out, /note: 1 finding below error is not shown/);
  assert.ok(!errors.out.includes('WARNING'));
  const angles = await run({ 'study.md': text }, ['study.md', '--angles', 'technical,financial']);
  assert.equal(angles.code, 0);
  assert.match(angles.out, /angles technical, financial;/);
  const cfg = await run({ 'study.md': text, 'c.json': '{"minSeverity": "error"}' }, ['study.md', '--config', 'c.json', '--min-severity', 'warning']);
  assert.match(cfg.out, /findings: 2 \(1 error, 1 warning\)/, 'the command line wins over the configuration');
});

test('text: the findings with their level, rule and place, what was found in the report, the notice and the result', () => {
  const r = reportOf(report({ legal: null, risks: md('## Risks', '', '- Vendor late. Owner: PM') }));
  const out = toText(r);
  assert.match(out, /\n {2}ERROR {4}missing-angle {14}report\.md\n {11}no section for the legal angle/);
  assert.match(out, /\n {2}ERROR {4}risk-without-response {6}report\.md:\d+:3\n/);
  assert.match(out, /\nReport: report\.md \("Feasibility study: booking service"\)\n\n {2}verdict {6}go, line 5\n {2}technical {4}"Technical feasibility", line 7: rated feasible\n/);
  assert.match(out, /\n {2}legal {8}missing\n {2}risks {8}"Risks", line \d+: 1 risk, 1 without a response, 0 without an owner\n/);
  assert.match(out, /\n {2}prototype {4}not mentioned\n {2}next steps {3}"Next steps", line \d+\n/);
  assert.ok(out.includes(`\n${NOTICE}\n\nRESULT: FAIL - 2 errors\n`));
  const explained = toText(r, { explain: true });
  assert.match(explained, /\n {11}rule: an angle of the list \(technical, financial, operational, schedule, legal\) that no heading other than the title names/);
  assert.match(explained, /\n {11}basis: a common way to frame a feasibility study is five areas.* \(Feasibility study \(Wikipedia\), the TELOS areas, https:\/\/en\.wikipedia\.org\/wiki\/Feasibility_study\)\n/);
  assert.match(explained, /\n {11}the tool's own choice: the response words are the tool's own/);
});

test('json: the whole report, with the basis of each finding only when asked', () => {
  const r = reportOf(report({ next: null }));
  const plain = JSON.parse(toJson(r));
  assert.equal(plain.tool, 'feasibility-report-check');
  assert.deepEqual(Object.keys(plain), ['tool', 'version', 'input', 'config', 'reports', 'findings', 'totals', 'result', 'notes', 'notice']);
  assert.deepEqual(plain.findings[0], { rule: 'missing-next-steps', level: 'error', report: 'report.md', file: null, line: null, column: null, at: 'report.md', found: plain.findings[0].found });
  assert.deepEqual(plain.result, { pass: false, errors: 1, byLevel: { error: 1, warning: 0, notice: 0 }, text: 'FAIL - 1 error' });
  assert.equal(plain.config.rules.length, 15);
  const explained = JSON.parse(toJson(r, { explain: true }));
  assert.deepEqual(explained.findings[0].basis[0], { text: 'a team that decides to move on should know what it will test first, who it needs and how it will measure success', source: 'How the discovery phase works (GOV.UK Service Manual)', url: 'https://www.gov.uk/service-manual/agile-delivery/how-the-discovery-phase-works' });
  assert.equal(explained.findings[0].own, null);
});

test('github: one workflow command per finding at its level, with the file, line and column, then a summary line', () => {
  const r = reportOf(report({ next: null, cost: md('## Cost', '', 'Build: $120,000') }));
  const lines = toGithub(r).trimEnd().split('\n');
  assert.equal(lines.length, 3);
  assert.equal(lines[0], '::error title=feasibility-report-check missing-next-steps::report.md: no next steps: no heading names "next steps", "next step", "action plan", "actions" or 3 more');
  assert.match(lines[1], /^::warning file=report\.md,line=\d+,col=8,title=feasibility-report-check single-estimate::the estimate "\$120,000" is one number/);
  assert.equal(lines[2], 'feasibility-report-check: report.md: 2 findings; RESULT: FAIL - 1 error (and 1 warning)');
  assert.equal(toGithub(reportOf(report())), 'feasibility-report-check: report.md: 0 findings; RESULT: PASS - no error\n');
});

test('github: the characters a workflow command gives a meaning to are escaped, so a finding cannot start another command', () => {
  assert.equal(escapeData('a%b\r\nc'), 'a%25b%0D%0Ac');
  assert.equal(escapeProperty('dir/a,b:c.md'), 'dir/a%2Cb%3Ac.md');
  const r = reportOf({ 'a,b:c.md': report({ risks: md('## Risks', '', '- 100% sure::error file=x::owned. Owner: PM') }) });
  const out = toGithub(r);
  assert.match(out, /^::error file=a%2Cb%3Ac\.md,line=\d+,col=3,title=feasibility-report-check risk-without-response::the risk "100%25 sure::error file=x::owned/m);
  assert.equal(out.split('\n').filter((l) => l.startsWith('::')).length, 1);
});

test('cli: a run reads its inputs and writes nothing to the folder', async () => {
  await withFiles({ 'r/a.md': report() }, async (dir) => {
    for (const format of ['text', 'json', 'github']) assert.equal((await cli(['r', '--format', format], dir)).code, 0);
    assert.deepEqual(await readdir(dir), ['r']);
    assert.deepEqual(await readdir(`${dir}/r`), ['a.md']);
  });
});
