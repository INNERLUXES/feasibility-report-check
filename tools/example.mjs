// Runs the README examples, checks that they report what the README shows, and writes the reports of the two made-up
// feasibility studies to examples/output. CI runs it and then fails if those files changed, so the example output in
// the repository is always the real output.

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { main } from '../src/index.js';

const root = resolve(fileURLToPath(import.meta.url), '..', '..');

// The arguments of the examples; every path is relative to the root of the repository.
export const WEAK = ['examples/weak/feasibility-report.md'];
export const GOOD = ['examples/good', '--config', 'examples/config.json'];

// Runs the tool on files of the repository; the paths shown in the report are relative to the root of the repository.
export async function run(argv, base = root) {
  let out = '';
  let err = '';
  const code = await main(argv, { out: (t) => { out += t; }, err: (t) => { err += t; } }, undefined, base);
  return { code, out, err };
}

// What the README says of the weak report: the counts, one finding of most kinds it shows, and the result.
export const EXPECTED = [
  'input: examples/weak/feasibility-report.md (1 file, read as one report)',
  'findings: 18 (12 error, 6 warning)',
  'no section for the financial angle',
  'the report gives 2 different verdicts: go on line 3 and stop here',
  'the verdict "maybe later in the quarter" is not "go", "go with changes" or "stop"',
  'the rating of the schedule angle is "TBD", which says nothing',
  'the owner of the risk "The key developer may leave. Owner: TBD" is "TBD", which names no one',
  'the estimate "16 weeks" is one number; give a range',
  'the report mentions a proof of concept but has no section for its results or limits',
  'RESULT: FAIL - 12 errors (and 6 warnings)'
];
export const UNWANTED = ['RESULT: PASS', 'ERROR    missing-risks', 'ERROR    missing-assumptions', 'ERROR    missing-verdict'];

const problems = [];
function expect(name, result, code, expected, unwanted) {
  const missing = expected.filter((e) => !result.out.includes(e));
  const wrong = unwanted.filter((e) => result.out.includes(e));
  if (result.code !== code || missing.length || wrong.length) {
    problems.push(`${name}: unexpected report (exit code ${result.code}, expected ${code}; missing: ${missing.join(' / ') || 'none'}; should not appear: ${wrong.join(' / ') || 'none'})${result.err ? `\n${result.err}` : ''}`);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const weak = await run(WEAK);
  process.stdout.write(weak.out);
  expect('weak report', weak, 1, EXPECTED, UNWANTED);

  const good = await run(GOOD);
  expect('good report', good, 0, ['input: examples/good (4 files, read as one report)', 'findings: 0', 'RESULT: PASS - no error'], ['  WARNING  ', '  ERROR  ', '  NOTICE  ', 'RESULT: FAIL']);

  // The good report passes with the built-in configuration too, and the weak one fails with the configuration of the
  // example, which adds a security angle and makes a single estimate an error.
  expect('good, built-in configuration', await run(['examples/good']), 0, ['config: built-in defaults:', 'findings: 0'], []);
  expect('weak, example configuration', await run([...WEAK, '--config', 'examples/config.json']), 1, ['no section for the security angle', 'ERROR    single-estimate'], []);

  // Only the errors, and the angles given on the command line.
  expect('weak, errors only', await run([...WEAK, '--min-severity', 'error', '--angles', 'technical,schedule']), 1, ['findings: 10 (10 error); 5 below error not shown'], ['WARNING', 'no section for the financial angle']);

  // The README shows the whole report of the weak study, the --explain lines of one finding, the GitHub annotations of
  // the first findings, and the report of the good study.
  const readme = (await readFile(resolve(root, 'README.md'), 'utf8')).split('\r\n').join('\n');
  if (!readme.includes(weak.out)) problems.push('README: the sample output of the weak report differs from a real run');
  if (!readme.includes(good.out)) problems.push('README: the sample output of the good report differs from a real run');

  await mkdir(resolve(root, 'examples/output'), { recursive: true });
  await writeFile(resolve(root, 'examples/output/weak.txt'), weak.out);
  await writeFile(resolve(root, 'examples/output/good.txt'), good.out);
  const explain = await run([...WEAK, '--explain']);
  if (explain.code !== 1) problems.push(`explain: exit code ${explain.code}, expected 1`);
  const lines = explain.out.split('\n');
  const at = lines.findIndex((l) => l.includes('single-estimate') && l.includes('feasibility-report.md:24:'));
  const sample = lines.slice(at, at + 5).join('\n');
  if (at < 0 || !readme.includes(sample)) problems.push('README: the --explain sample of the single estimate differs from a real run');
  await writeFile(resolve(root, 'examples/output/weak-explain.txt'), explain.out);
  const github = await run([...WEAK, '--format', 'github']);
  if (github.code !== 1) problems.push(`github: exit code ${github.code}, expected 1`);
  for (const l of github.out.split('\n').filter((x) => x.includes('line=12,') || x.includes('line=22,'))) if (!readme.includes(l)) problems.push('README: the GitHub sample differs from a real run');
  await writeFile(resolve(root, 'examples/output/weak-github.txt'), github.out);
  const json = await run([...WEAK, '--json', '--explain']);
  if (json.code !== 1) problems.push(`json: exit code ${json.code}, expected 1`);
  await writeFile(resolve(root, 'examples/output/weak.json'), json.out);
  const defaults = await run(['--print-defaults']);
  if (defaults.code !== 0) problems.push(`--print-defaults: exit code ${defaults.code}, expected 0`);
  await writeFile(resolve(root, 'examples/output/defaults.json'), defaults.out);

  if (problems.length) {
    for (const p of problems) console.error(`example: ${p}`);
    process.exit(1);
  }
}
