import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { atOrAbove, cleanTexts, decide, decodeText, displayPath, fileError, flat, grouped, inspectPath, isBinary, isMarkdownName, lineStarts, listFolder, listText, plural, positionOf, readBounded, readTextFile, ruleById, safeText } from '../src/index.js';
import { withFiles } from './helpers.js';

// The small helpers: numbers and lists, text cleaning, lines and columns, the result, and the files the tool reads.

test('size: grouped numbers, lists and plurals', () => {
  assert.equal(grouped(1234567), '1,234,567');
  assert.equal(listText([]), '');
  assert.equal(listText(['a']), 'a');
  assert.equal(listText(['a', 'b']), 'a and b');
  assert.equal(listText(['a', 'b', 'c']), 'a, b and c');
  assert.equal(listText(['a', 'b', 'c', 'd'], 2), 'a, b and 2 more');
  assert.equal(plural(1, 'risk'), '1 risk');
  assert.equal(plural(2, 'risk'), '2 risks');
  assert.equal(plural(2, 'entry', 'entries'), '2 entries');
});

test('text: control, line separator and direction characters become spaces; long text is cut; every text of a value is cleaned', () => {
  assert.equal(safeText(`a${String.fromCharCode(27)}b${String.fromCharCode(0x202e)}c${String.fromCharCode(0x2028)}d${String.fromCharCode(0x9b)}e`), 'a b c d e');
  assert.equal(safeText('x'.repeat(20), 10), 'xxxxxxx...');
  assert.equal(flat(' a \n\t b '), 'a b');
  assert.deepEqual(cleanTexts({ a: [`x${String.fromCharCode(7)}`], b: 1, c: null }), { a: ['x '], b: 1, c: null });
});

test('lines: LF, CRLF and a lone CR each end a line; positions count from 1', () => {
  const starts = lineStarts('a\nb\r\nc\rd');
  assert.deepEqual(starts, [0, 2, 5, 7]);
  assert.deepEqual(positionOf(starts, 6), { line: 3, column: 2 });
});

test('result: only an error fails the run, and the levels compare from notice up', () => {
  assert.deepEqual(decide([]), { pass: true, errors: 0, byLevel: { error: 0, warning: 0, notice: 0 }, text: 'PASS - no error' });
  assert.equal(decide([{ level: 'warning' }, { level: 'notice' }]).text, 'PASS - no error (1 warning, 1 notice)');
  assert.equal(decide([{ level: 'error' }, { level: 'error' }, { level: 'warning' }]).text, 'FAIL - 2 errors (and 1 warning)');
  assert.equal(atOrAbove('error', 'warning'), true);
  assert.equal(atOrAbove('notice', 'warning'), false);
  assert.equal(ruleById('missing-cost').key, 'missingCost');
});

test('files: a path relative to the base with forward slashes, Markdown names, and an error that names the file', async () => {
  const base = resolve('base');
  assert.equal(displayPath(resolve(base, 'a/b.md'), base), 'a/b.md');
  assert.equal(displayPath(base, base), '.');
  assert.ok(displayPath(resolve(base, '../x.md'), base).endsWith('/x.md'));
  assert.equal(fileError('a.md', 'why').message, 'a.md: why');
  assert.equal(fileError('a.md', 'why').reason, 'why');
  assert.equal(isMarkdownName('A.MD'), true);
  assert.equal(isMarkdownName('notes.markdown'), true);
  assert.equal(isMarkdownName('notes.txt'), false);
  await withFiles({ 'a.txt': 'hello', 'd/b.md': 'x', 'd/sub/c.md': 'y' }, async (dir) => {
    assert.equal((await readBounded(resolve(dir, 'a.txt'), 10)).toString(), 'hello');
    await assert.rejects(readBounded(resolve(dir, 'a.txt'), 2), /5 bytes is over the 2 byte limit/);
    await assert.rejects(readBounded(resolve(dir, 'none.txt'), 2), /no such file/);
    await assert.rejects(readBounded(dir, 2), /not a regular file|cannot be read/);
    assert.deepEqual(await inspectPath('d', dir), { full: resolve(dir, 'd'), shown: 'd', kind: 'folder' });
    assert.equal((await inspectPath('a.txt', dir)).kind, 'file');
    await assert.rejects(inspectPath('none', dir), /none: no such file or folder/);
    assert.deepEqual(await listFolder(resolve(dir, 'd'), 'd', 10), { files: ['b.md'], folders: ['sub'], links: [], other: [] });
    await assert.rejects(listFolder(resolve(dir, 'none'), 'none', 10), /none: cannot be read/);
  });
});

test('files: a text file is read as UTF-8 without its byte order mark; UTF-16 and binary files are refused', async () => {
  const bom = Buffer.from([0xef, 0xbb, 0xbf]);
  assert.equal(decodeText(Buffer.concat([bom, Buffer.from('a,b')])), 'a,b');
  assert.equal(isBinary(Buffer.from([65, 0, 66])), true);
  assert.equal(isBinary(Buffer.from('plain')), false);
  assert.equal(decodeText(Buffer.from([0xc3, 0x28])), null, 'bytes that are not UTF-8');
  await withFiles({ 'u8.md': Buffer.concat([bom, Buffer.from('x\n')]), 'u16.md': Buffer.from([0xff, 0xfe, 0x61, 0]), 'bin.md': Buffer.from([0x61, 0, 0x62]), 'latin1.md': Buffer.from([0x63, 0x61, 0x66, 0xe9, 0x0a]) }, async (dir) => {
    const r = await readTextFile('u8.md', dir, 100);
    assert.deepEqual({ file: r.file, size: r.size, text: r.text }, { file: 'u8.md', size: 5, text: 'x\n' });
    await assert.rejects(readTextFile('u16.md', dir, 100), /u16.md: is UTF-16; only UTF-8 is read/);
    await assert.rejects(readTextFile('bin.md', dir, 100), /bin\.md: holds binary data \(a null byte\); only text is read/);
    await assert.rejects(readTextFile('u8.md', dir, 2), /u8.md: 5 bytes is over the 2 byte limit/);
    await assert.rejects(readTextFile('latin1.md', dir, 100), /latin1.md: is not valid UTF-8; only UTF-8 text is read/);
  });
});
