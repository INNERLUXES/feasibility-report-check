import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cp, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { EXPECTED, GOOD, UNWANTED, WEAK, run } from '../tools/example.mjs';

const root = resolve(fileURLToPath(import.meta.url), '..', '..');
const saved = (name) => readFile(resolve(root, 'examples/output', name), 'utf8');

test('examples: the weak report fails with the report that is saved in examples/output', async () => {
  const r = await run(WEAK);
  assert.equal(r.code, 1);
  assert.equal(r.err, '');
  assert.equal(r.out, await saved('weak.txt'));
  for (const e of EXPECTED) assert.ok(r.out.includes(e), e);
  for (const u of UNWANTED) assert.ok(!r.out.includes(u), u);
});

test('examples: the good report, a folder of four files, passes with the report that is saved', async () => {
  const r = await run(GOOD);
  assert.equal(r.code, 0);
  assert.equal(r.out, await saved('good.txt'));
  assert.match(r.out, /findings: 0\n/);
  assert.equal((await run(['examples/good'])).code, 0, 'with the built-in configuration too');
});

test('examples: --explain, JSON, the GitHub commands and the defaults are the reports that are saved', async () => {
  assert.equal((await run([...WEAK, '--explain'])).out, await saved('weak-explain.txt'));
  assert.equal((await run([...WEAK, '--json', '--explain'])).out, await saved('weak.json'));
  assert.equal((await run([...WEAK, '--format', 'github'])).out, await saved('weak-github.txt'));
  assert.equal((await run(['--print-defaults'])).out, await saved('defaults.json'));
});

test('examples: the rules that fire on the weak report, each on the line built for it', async () => {
  const report = JSON.parse((await run([...WEAK, '--json'])).out);
  const byRule = {};
  for (const f of report.findings) (byRule[f.rule] ??= []).push(f.line);
  const text = await readFile(resolve(root, 'examples/weak/feasibility-report.md'), 'utf8');
  const line = (needle) => text.split('\n').findIndex((l) => l.includes(needle)) + 1;
  assert.deepEqual(byRule, {
    'missing-angle': [null, null],
    'missing-cost': [null],
    'missing-next-steps': [null],
    'missing-rating': [line('## Technical'), line('Rating: TBD')],
    'risk-without-response': [line('The API may'), line('The key developer')],
    'risk-without-owner': [line('The API may'), line('The key developer')],
    'conflicting-verdict': [line('Stop the work')],
    'unknown-verdict': [line('Final verdict')],
    'prototype-without-results': [line('proof of concept')],
    'single-estimate': [line('Budget:'), line('16 weeks')],
    'unknown-rating': [line('probably fine')],
    'untested-assumption': [line('Customers want'), line('Status: open')]
  });
});

test('examples: the same reports written with CRLF line ends give the same output', async () => {
  const dir = await mkdtemp(resolve(tmpdir(), 'feasibility-report-check-crlf-'));
  try {
    await cp(resolve(root, 'examples'), resolve(dir, 'examples'), { recursive: true });
    for (const sub of ['examples/weak', 'examples/good']) {
      for (const f of await readdir(resolve(dir, sub))) {
        const text = (await readFile(resolve(dir, sub, f), 'utf8')).split('\r\n').join('\n');
        await writeFile(resolve(dir, sub, f), text.split('\n').join('\r\n'));
      }
    }
    assert.equal((await run([...WEAK, '--explain'], dir)).out, await saved('weak-explain.txt'));
    assert.equal((await run(GOOD, dir)).out, await saved('good.txt'));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
