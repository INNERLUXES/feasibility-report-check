import { test } from 'node:test';
import assert from 'node:assert/strict';
import { atxHeading, isTableSeparator, isThematicBreak, listMarker, readMarkdown, splitLines, tableCells } from '../src/index.js';
import { md } from './helpers.js';

// The Markdown reader: the parts of a file the checks need, line by line, with the subset of CommonMark it reads.

const kinds = (text) => readMarkdown(text).lines.map((l) => l.kind);

test('markdown: lines end at LF, CR LF and CR, and a final line end starts no new line', () => {
  assert.deepEqual(splitLines('a\nb\r\nc\rd\n'), ['a', 'b', 'c', 'd']);
  assert.deepEqual(splitLines(''), ['']);
  assert.deepEqual(splitLines('\n'), ['']);
});

test('markdown: ATX headings with one to six #, a space or the end after them, and the closing # left out', () => {
  assert.deepEqual(atxHeading('## Risks'), { level: 2, text: 'Risks', column: 4 });
  assert.deepEqual(atxHeading('   ### Next steps ###'), { level: 3, text: 'Next steps', column: 8 });
  assert.deepEqual(atxHeading('#'), { level: 1, text: '', column: 2 });
  assert.deepEqual(atxHeading('###### Six'), { level: 6, text: 'Six', column: 8 });
  assert.equal(atxHeading('####### Seven'), null);
  assert.equal(atxHeading('#hashtag'), null);
  assert.equal(atxHeading('    # indented code'), null);
  assert.equal(atxHeading('## C# notes').text, 'C# notes');
});

test('markdown: setext headings of one line, thematic breaks, and an underline under a list item that is a break', () => {
  const r = readMarkdown(md('Risks', '=====', '', 'Next steps', '---', '', '- item', '---', '', '***', '', 'a | b', '---'));
  assert.deepEqual(r.headings.map((h) => [h.n, h.heading.level, h.heading.text]), [[1, 1, 'Risks'], [4, 2, 'Next steps']]);
  assert.deepEqual(kinds(md('- item', '---')), ['text', 'rule']);
  assert.equal(isThematicBreak('* * *'), true);
  assert.equal(isThematicBreak('--'), false);
  assert.equal(r.lines[12].kind, 'rule', 'a line with a pipe is not underlined into a heading');
});

test('markdown: fenced code blocks of backticks and tildes are literal text until a fence of the same kind and length', () => {
  assert.deepEqual(kinds(md('```js', '## not a heading', '```', '## Heading')), ['fence', 'code', 'fence', 'heading']);
  assert.deepEqual(kinds(md('````', '```', '## still code', '````')), ['fence', 'code', 'code', 'fence']);
  assert.deepEqual(kinds(md('~~~', '```', '~~~')), ['fence', 'code', 'fence']);
  assert.deepEqual(kinds(md('``` a ` b', '## Heading')), ['text', 'heading'], 'a backtick fence whose info string holds a backtick is not a fence');
  const open = readMarkdown(md('text', '```', '## gone'));
  assert.deepEqual(open.notes, ['a code fence opened on line 2 is never closed, so the rest of the file is read as code']);
});

test('markdown: HTML comments on lines of their own are left out, over several lines too', () => {
  assert.deepEqual(kinds(md('<!-- a -->', '## H', '<!--', '## hidden', '-->', 'text')), ['comment', 'heading', 'comment', 'comment', 'comment', 'text']);
  assert.deepEqual(readMarkdown(md('<!--', '## hidden')).notes, ['an HTML comment is never closed, so the rest of the file is left out']);
});

test('markdown: front matter at the top is meta, and three dashes that are never closed are not front matter', () => {
  assert.deepEqual(kinds(md('---', 'verdict: go', '---', '# Title')), ['meta', 'meta', 'meta', 'heading']);
  assert.deepEqual(kinds(md('---', 'verdict: go', '...', 'text')), ['meta', 'meta', 'meta', 'text']);
  assert.deepEqual(kinds(md('---', 'no close', 'text')), ['rule', 'text', 'text']);
});

test('markdown: list markers with their indent and the column of their text; tables with escaped pipes', () => {
  assert.deepEqual(listMarker('- Owner: PM'), { indent: 0, content: 'Owner: PM', column: 3 });
  assert.deepEqual(listMarker('  12) Twelve'), { indent: 2, content: 'Twelve', column: 7 });
  assert.deepEqual(listMarker('*'), { indent: 0, content: '', column: 1 });
  assert.equal(listMarker('**bold**'), null);
  assert.equal(listMarker('1234567890. too long'), null);
  assert.deepEqual(tableCells('| a | b \\| c | |'), ['a', 'b | c', '']);
  assert.deepEqual(tableCells('a|b'), ['a', 'b']);
  assert.equal(isTableSeparator('| --- | :---: |'), true);
  assert.equal(isTableSeparator('---|---'), true);
  assert.equal(isTableSeparator('---'), false);
  assert.equal(isTableSeparator('| a | b |'), false);
});

test('markdown: a file over the line limit is refused with the counts', () => {
  assert.throws(() => readMarkdown('a\nb\nc\n', { maxLines: 2 }), /holds 3 lines, more than the 2 read/);
});
