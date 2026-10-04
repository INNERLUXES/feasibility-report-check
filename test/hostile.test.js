import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chmod, symlink } from 'node:fs/promises';
import { resolve } from 'node:path';
import { FILE_LIMITS, LIMITS, MAX_PROBLEMS, labelValues, parseJson, readDocument } from '../src/index.js';
import { cli, md, report, reportOf, run, withFiles } from './helpers.js';

// Hostile input: reports built to exhaust the memory or the time, to make the tool follow a link, to rewrite the
// terminal, to start a second workflow command or to change how objects behave. Each heavy test also checks the time,
// because work that grows faster than the input is a failure even when the answer is right. Tests that need a symbolic
// link, a device or file permissions are guarded with process.platform, and none of them asserts a line or a column:
// those are asserted in the tests that run everywhere.

const LIMIT = { timeout: 180000 };
// Coverage counting slows every line of the tool several times over, so a run with --experimental-test-coverage gets a
// wider time limit. A plain `npm test` keeps the tight one, and that is the run that guards against slow growth.
// The runner sets NODE_V8_COVERAGE for its test processes only when coverage is on.
const COVERAGE = Boolean(process.env.NODE_V8_COVERAGE);
const fast = async (fn, ms = 5000) => {
  const limit = COVERAGE ? ms * 4 : ms;
  const start = Date.now();
  const result = await fn();
  assert.ok(Date.now() - start < limit, `took ${Date.now() - start} ms`);
  return result;
};

const GOOD = { 'r/01.md': report() };

test('hostile: a file over the size limit is refused before it is read, and so is a folder over the total or the entry limit', LIMIT, async () => {
  const big = await fast(() => run({ 'r/big.md': `# Big\n\n${'x'.repeat(FILE_LIMITS.maxFileBytes + 1)}` }, ['r']));
  assert.equal(big.code, 2);
  assert.match(big.err, /r\/big\.md: [\d,]+ bytes is over the 1 MB limit/);
  const total = await run({ ...GOOD, 'r/02.md': report() }, ['r'], { maxTotalBytes: 1500 });
  assert.equal(total.code, 2);
  assert.match(total.err, /r: the files together are over the 1,500 byte limit; check fewer files/);
  const entries = await run({ ...GOOD, 'r/02.md': 'x', 'r/03.md': 'y' }, ['r'], { maxEntries: 2 });
  assert.equal(entries.code, 2);
  assert.match(entries.err, /r: holds more than 2 entries; check a smaller folder/);
  const lines = await run(GOOD, ['r'], { maxLines: 5 });
  assert.equal(lines.code, 2);
  assert.match(lines.err, /r\/01\.md: holds \d+ lines, more than the 5 read/);
  assert.equal(LIMITS.maxEntries, 5000);
});

test('hostile: thousands of risks, assumptions and estimates in tables and lists are checked in seconds', LIMIT, async () => {
  const rows = Array.from({ length: 5000 }, (_, i) => `| Risk ${i} | ${i % 3 ? 'Accept' : 'Watch'} | ${i % 5 ? 'PM' : ''} |`);
  const items = Array.from({ length: 5000 }, (_, i) => `- Assumption ${i}. Status: ${i % 2 ? 'open' : 'tested'}`);
  const costs = Array.from({ length: 5000 }, (_, i) => `- Part ${i}: $${i + 1},000${i % 2 ? ' to $9,000' : ''}`);
  const text = report({ risks: md('## Risks', '', '| Risk | Response | Owner |', '| --- | --- | --- |', ...rows), assumptions: md('## Assumptions', '', ...items), cost: md('## Cost', '', ...costs) });
  const r = await fast(() => run({ 'study.md': text }, ['study.md', '--json']), 20000);
  const json = JSON.parse(r.out);
  assert.equal(json.reports[0].risks.items, 5000);
  assert.equal(json.reports[0].assumptions.untested, 2500);
  assert.equal(json.totals.findings, 1667 + 1000 + 2500 + 2500);
  assert.equal(json.findings.filter((f) => f.rule === 'untested-assumption').length, LIMITS.maxFindingsPerRule, 'every rule lists at most its limit');
  assert.ok(json.notes.some((n) => /findings past the limit of 500 per rule are counted but not listed/.test(n)));
});

test('hostile: a line of megabytes, forty thousand headings, and lines full of label openers and pipes are read in one pass', LIMIT, async () => {
  await fast(() => reportOf(report({}, md('', `Verdict: ${'go '.repeat(500000)}`))));
  await fast(() => reportOf(`# T\n\n${Array.from({ length: 40000 }, (_, i) => `## Risks ${i}\n\n- r${i}`).join('\n\n')}\n`), 15000);
  await fast(() => labelValues(':'.repeat(1000000), ['owner']));
  await fast(() => labelValues('owner '.repeat(200000), ['owner']));
  await fast(() => reportOf(report({ cost: md('## Cost', '', '|'.repeat(300000), `${'1-'.repeat(200000)}`, `$${'9'.repeat(300000)}`) })));
  await fast(() => reportOf(report({}, md('', `${'<!--'.repeat(100000)}`, `${'**'.repeat(200000)}`, `${'['.repeat(100000)}(`))));
  await fast(() => readDocument('x.md', `${'```\n'.repeat(50000)}`));
});

test('hostile: JSON nested very deep or very long is refused in one pass', LIMIT, async () => {
  for (const content of ['['.repeat(500000), `{"name": "${'x'.repeat(5000)}"}`, `{"words": {"ratings": {"add": [${'"a",'.repeat(100001)}"a"]}}}`]) {
    const r = await fast(() => run({ ...GOOD, 'c.json': content }, ['r', '--config', 'c.json']));
    assert.equal(r.code, 2);
    assert.ok(r.err.length < 3000, 'the error stays short');
  }
  await fast(async () => assert.throws(() => parseJson(`[${'1,'.repeat(300000)}1]`), /more than 100000 values/));
});

test('hostile: a hundred unreadable files list twenty problems and a count', LIMIT, async () => {
  const files = {};
  for (let i = 0; i < 100; i += 1) files[`r/${String(i).padStart(3, '0')}.md`] = Buffer.from([0, 1, 2]);
  const r = await fast(() => run(files, ['r']));
  assert.equal(r.code, 2);
  assert.match(r.err, /the input has problems:/);
  assert.ok(r.err.endsWith('\n  and 80 more\n'), r.err.slice(-200));
  assert.equal(MAX_PROBLEMS, 20);
});

test('hostile: CRLF, CR and a byte order mark give the same report as LF', async () => {
  const text = report({ legal: null, risks: md('## Risks', '', '- Vendor late. Owner: TBD') });
  const lf = await run({ 'study.md': text }, ['study.md', '--json']);
  for (const eol of ['\r\n', '\r']) {
    const r = await run({ 'study.md': `${String.fromCharCode(0xfeff)}${text.split('\n').join(eol)}` }, ['study.md', '--json']);
    assert.equal(r.out, lf.out, JSON.stringify(eol));
  }
});

test('hostile: control, escape and direction characters in names, headings and values never reach the reports', async () => {
  const esc = String.fromCharCode(27);
  const rlo = String.fromCharCode(0x202e);
  const ls = String.fromCharCode(0x2028);
  const files = { [`r/01${rlo}.md`]: report({ title: md(`# Study${esc}[31m${ls}`), technical: md('## Technical feasibility', '', `Rating: odd${esc}[2J`), risks: md('## Risks', '', `- Vendor${rlo} late. Owner: PM`) }) };
  for (const format of ['text', 'json', 'github']) {
    const r = await run(files, ['r', '--format', format, '--explain']);
    assert.equal(r.code, 1, r.err);
    for (const c of [esc, rlo, ls]) assert.ok(!r.out.includes(c) && !r.err.includes(c), `${format}: ${c.charCodeAt(0)}`);
  }
});

test('hostile: __proto__, constructor and toString as headings, values, labels and angle ids are only data', async () => {
  const text = report({ verdict: md('## Verdict', '', '__proto__'), technical: md('## Technical feasibility', '', 'Rating: constructor'), risks: md('## Risks', '', '- toString. Owner: __proto__. Accept.') });
  const r = reportOf(text, { aliases: { constructor: ['constructor'], toString: ['tostring'] } });
  assert.deepEqual(r.findings.map((f) => f.rule), ['unknown-verdict', 'unknown-rating']);
  assert.equal({}.toString.name, 'toString');
  assert.equal(Object.getPrototypeOf({}), Object.prototype);
  const ids = await run({ ...GOOD, 'c.json': '{"aliases": {"__proto__": ["x"]}}' }, ['r', '--config', 'c.json']);
  assert.equal(ids.code, 2);
  assert.match(ids.err, /the angle id "__proto__" must be a letter a to z/);
});

test('hostile: a file that is empty, only front matter, only a title, or a code fence that never closes is read without a crash', async () => {
  const r = await run({ 'r/a.md': '', 'r/b.md': '---\nverdict: go\n---\n', 'r/c.md': '# Only a title\n', 'r/d.md': md('```', '## Next steps') }, ['r', '--json']);
  assert.equal(r.code, 1, r.err);
  const json = JSON.parse(r.out);
  assert.equal(json.reports[0].verdict.verdict, 'go');
  assert.ok(json.notes.some((n) => n.includes('r/d.md: a code fence opened on line 1 is never closed')));
});

test('hostile: a symbolic link in the folder is not followed, even to a report outside it; no line or column', LIMIT, async (t) => {
  if (process.platform === 'win32') {
    t.skip('Windows needs extra rights to make a symbolic link');
    return;
  }
  await withFiles({ 'outside.md': md('## Verdict', '', 'Stop.', '## Secret heading'), ...GOOD }, async (dir) => {
    await symlink(resolve(dir, 'outside.md'), resolve(dir, 'r/02-linked.md'));
    await symlink(resolve(dir), resolve(dir, 'r/up'));
    const r = await fast(() => cli(['r', '--json'], dir));
    assert.equal(r.code, 0, r.err);
    const json = JSON.parse(r.out);
    assert.deepEqual(json.input.files, ['r/01.md']);
    assert.equal(json.input.symbolicLinks, 2);
    assert.ok(json.notes.some((n) => n.includes('are symbolic links and were not followed')));
    assert.ok(!r.out.includes('Secret heading'));
  });
});

test('hostile: the path named on the command line may be a link, because the person who runs the tool named it', async (t) => {
  if (process.platform === 'win32') {
    t.skip('Windows needs extra rights to make a symbolic link');
    return;
  }
  await withFiles(GOOD, async (dir) => {
    await symlink(resolve(dir, 'r'), resolve(dir, 'study'));
    const r = await cli(['study'], dir);
    assert.equal(r.code, 0, r.err);
    assert.match(r.out, /input: study \(1 file, read as one report\)/);
  });
});

test('hostile: a device named as the report or the configuration is refused', LIMIT, async (t) => {
  if (process.platform === 'win32') {
    t.skip('Windows has no /dev/zero to name as an input');
    return;
  }
  await withFiles(GOOD, async (dir) => {
    const config = await fast(() => cli(['r', '--config', '/dev/zero'], dir));
    assert.equal(config.code, 2);
    assert.match(config.err, /not a regular file/);
    const input = await fast(() => cli(['/dev/zero'], dir));
    assert.equal(input.code, 2);
    assert.match(input.err, /is not a file or a folder/);
  });
});

test('hostile: a file that cannot be opened stops the run with its reason, and is never passed over', async (t) => {
  if (process.platform === 'win32') {
    t.skip('Windows does not take away read access with chmod');
    return;
  }
  if (typeof process.getuid === 'function' && process.getuid() === 0) {
    t.skip('the root user can read a file without read access');
    return;
  }
  await withFiles({ ...GOOD, 'r/02.md': report() }, async (dir) => {
    await chmod(resolve(dir, 'r/02.md'), 0o000);
    try {
      const r = await cli(['r'], dir);
      assert.equal(r.code, 2);
      assert.match(r.err, /r\/02\.md: cannot be read \(EACCES\)/);
    } finally {
      await chmod(resolve(dir, 'r/02.md'), 0o644);
    }
  });
});
