import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ancestorsOf, buildOutline, headingHolds, headingWords, headingsNaming, holdsText, isInside, itemsOf, labelled, outermost, readDocument, sectionLines, tableValue, tablesIn } from '../src/index.js';
import { md } from './helpers.js';

// Sections: headings and their words, how far a section runs, the items it lists, and labelled values.

const outlineOf = (...files) => buildOutline(files.map((t, i) => readDocument(`f${i + 1}.md`, t)));

test('headings: numbering, sections and parts are left out, and links keep their text', () => {
  for (const [text, words] of [['3.1 Technical feasibility', 'technical feasibility'], ['A) Technical', 'technical'], ['B. Legal and compliance', 'legal and compliance'], ['Section 2: Risks', 'risks'], ['Part 3 Next steps', 'next steps'], ['Technical [feasibility](x.md)', 'technical feasibility'], ['A risk register', 'a risk register'], ['1', '1']]) {
    assert.equal(headingWords(text).join(' '), words, text);
  }
  assert.equal(headingHolds(['legal', 'and', 'compliance'], ['compliance']), true);
  assert.equal(headingHolds(['legality'], ['legal']), false);
  assert.equal(headingHolds(['next', 'big', 'steps'], ['next steps']), false);
});

test('outline: a section runs to the next heading at its level or above, in its file; the first level 1 heading is the title', () => {
  const o = outlineOf(md('# Title', '## A', 'a', '### A1', 'a1', '## B', 'b'), md('# Other', '## C'));
  const [title, a, a1, b, other, c] = o.headings;
  assert.equal(title.title, true);
  assert.equal(other.title, false, 'only the first heading of the first file');
  assert.deepEqual(sectionLines(o, a).map((l) => l.text), ['a', '### A1', 'a1']);
  assert.equal(isInside(a, a1), true);
  assert.equal(isInside(a, b), false);
  assert.equal(isInside(title, c), false, 'a section never runs into another file');
  assert.deepEqual(ancestorsOf(o, a1).map((h) => h.text), ['A', 'Title']);
  assert.deepEqual(outermost([a, a1, b]).map((h) => h.text), ['A', 'B']);
  assert.deepEqual(headingsNaming(o, ['title', 'c']).map((h) => h.text), ['C'], 'the title is never a section');
  assert.equal(holdsText(o, c), false);
  assert.equal(holdsText(o, a1), true);
  assert.equal(outlineOf(md('## Not a title', '# Late')).headings[1].title, false);
});

test('items: table rows, top-level list items with their continuation, and subheadings when there is neither', () => {
  const o = outlineOf(md('## Risks', '', '| Risk | Owner |', '| --- | --- |', '| Vendor | PM |', '', '- One', '  more of one', '- Two', 'lazy line of two', '', 'A paragraph after the list.', '', '1. Three'));
  const items = itemsOf(o, o.headings[0]);
  assert.deepEqual(items.map((i) => [i.title, i.lines.length]), [['Vendor', 1], ['One', 2], ['Two', 2], ['Three', 1]]);
  assert.deepEqual(tableValue(items[0].table, ['owner']), { label: 'owner', value: 'PM' });
  assert.equal(tableValue(items[0].table, ['response']), null);
  assert.equal(tableValue(null, ['owner']), null);
  const s = outlineOf(md('## Risks', '', '### Vendor', 'Accept.', '#### Detail', 'more', '### Staff', 'Reduce.'));
  assert.deepEqual(itemsOf(s, s.headings[0]).map((i) => [i.title, i.lines.length]), [['Vendor', 3], ['Staff', 2]]);
  const none = outlineOf(md('## Risks', '', 'Only prose.'));
  assert.deepEqual(itemsOf(none, none.headings[0]), []);
  assert.equal(itemsOf(o, o.headings[0], { maxItems: 2 }).length, 2);
});

test('tables: a row with a pipe followed by a separator row, running while lines hold a pipe', () => {
  const lines = readDocument('t.md', md('| A | B |', '| - | - |', '| 1 | 2 |', '| 3 | 4 |', 'after', '| not | a table |')).lines;
  const t = tablesIn(lines);
  assert.equal(t.length, 1);
  assert.deepEqual(t[0].header, ['A', 'B']);
  assert.deepEqual(t[0].rows.map((r) => r.cells), [['1', '2'], ['3', '4']]);
});

test('labelled: labelled lines, two-cell rows, and table columns only when asked', () => {
  const lines = readDocument('t.md', md('Rating: green', '', '| Part | Rating |', '| --- | --- |', '| API | High |', '', '| Key | Value |', '| --- | --- |', '| Rating | Low |', '```', 'Rating: red', '```')).lines;
  assert.deepEqual(labelled(lines, ['rating'], 't.md').map((v) => [v.line, v.value]), [[1, 'green'], [9, 'Low']]);
  assert.deepEqual(labelled(lines, ['rating'], 't.md', { columns: true }).map((v) => [v.line, v.value]), [[1, 'green'], [5, 'High'], [9, 'Low']]);
});
