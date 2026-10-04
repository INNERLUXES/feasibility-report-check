import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ESTIMATE_LIMITS, amountsIn, hasRange, rangeAcrossCells, singleEstimate } from '../src/index.js';

// Amounts of money and time, ranges, and the one-number estimates the single-estimate rule reports.

test('amounts: money with a sign or a code before or after, and time from hours to years, with their columns', () => {
  assert.deepEqual(amountsIn('Build: $120,000 over 16 weeks'), [{ text: '$120,000', kind: 'money', column: 8 }, { text: '16 weeks', kind: 'time', column: 22 }]);
  for (const [line, text] of [['EUR 40k', 'EUR 40k'], ['40k USD', '40k USD'], ['3.5 million pounds', '3.5 million pounds'], ['40 person-days', '40 person-days'], ['2 sprints', '2 sprints'], ['1 quarter', '1 quarter'], [`${String.fromCharCode(0x20ac)}9,500`, `${String.fromCharCode(0x20ac)}9,500`]]) {
    assert.deepEqual(amountsIn(line).map((a) => a.text), [text], line);
  }
  for (const line of ['10% contingency', '24/7 support', 'Q3 to Q4', 'version 2.1', '0.8 seconds', 'a six-week trial']) assert.deepEqual(amountsIn(line), [], line);
});

test('ranges: a dash, an en dash, "to", "..", "between ... and", a margin, and two cells of one kind', () => {
  for (const line of ['$80k-$120k', '$80k - $120k', `6${String.fromCharCode(0x2013)}9 weeks`, '6 to 9 weeks', '6 weeks to 9 weeks', '90..130k USD', 'between $80,000 and $120,000', 'between 6 and 9 weeks', '8 weeks +/- 2', `8 weeks ${String.fromCharCode(0xb1)} 2`, '$100k plus or minus $20k', '8 to 12 person-weeks']) {
    assert.equal(hasRange(line), true, line);
    assert.equal(singleEstimate(line), null, line);
  }
  for (const line of ['$120,000', 'About 8 weeks', '6 weeks to deliver', 'Licences: $2,000 a month']) assert.equal(hasRange(line), false, line);
  assert.equal(rangeAcrossCells(['Build', '$90,000', '$130,000']), true);
  assert.equal(rangeAcrossCells(['Build', '$90,000', '6 weeks']), false, 'money and time are not a range');
  assert.equal(singleEstimate('| Build | $90,000 | $130,000 |', ['Build', '$90,000', '$130,000']), null);
  assert.deepEqual(singleEstimate('| Total | $100,000 |', ['Total', '$100,000']), { text: '$100,000', kind: 'money', column: 11 });
});

test('estimates: a known limit, a step number before a duration reads as a range', () => {
  assert.equal(hasRange('Phase 1 - 6 weeks'), true);
});

test('estimates: only the first part of a very long line is read, so the patterns stay bounded', () => {
  assert.equal(ESTIMATE_LIMITS.maxLine, 2 * 1000);
  assert.deepEqual(amountsIn(`${'x '.repeat(1500)}$120,000`), []);
  assert.equal(hasRange(`${'1'.repeat(5000)}-`), false);
});
