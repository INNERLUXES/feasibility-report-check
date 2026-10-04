// The parts of a Markdown file the checks need, read line by line in one pass: front matter at the top, fenced code
// blocks (their content is literal text and is never checked), HTML comments on lines of their own, ATX headings
// ("## Risks"), setext headings (a line underlined with = or -), thematic breaks, list items and the rows of pipe
// tables. It is a subset of CommonMark: indented code blocks, HTML blocks other than comments, and block quotes are read
// as plain text, and a setext heading is one line long. docs/method.md lists what is simpler than the spec.

export const MARKDOWN_LIMITS = { maxLines: 200000, maxFrontMatterLines: 200 };

// The lines of a text; a line ends at LF, CR LF or CR, and a final line end does not start another line.
export function splitLines(text) {
  const lines = text.split(/\r\n|\r|\n/);
  if (lines.length > 1 && lines.at(-1) === '') lines.pop();
  return lines;
}

const ATX = /^ {0,3}(#{1,6})(?:[ \t]+(.*?))?[ \t]*$/;
const ATX_CLOSE = /(?:^|[ \t]+)#+[ \t]*$/;
const FENCE_OPEN = /^( {0,3})(`{3,}|~{3,})(.*)$/;
const FENCE_CLOSE = /^ {0,3}(`{3,}|~{3,})[ \t]*$/;
const SETEXT = /^ {0,3}(?:=+|-+)[ \t]*$/;
const THEMATIC = /^ {0,3}(?:(?:-[ \t]*){3,}|(?:\*[ \t]*){3,}|(?:_[ \t]*){3,})$/;
const LIST = /^([ \t]*)([-*+]|\d{1,9}[.)])(?:[ \t]+(.*))?$/;
const TABLE_SEPARATOR = /^[ \t]*\|?[ \t]*:?-+:?[ \t]*(?:\|[ \t]*:?-+:?[ \t]*)*\|?[ \t]*$/;

// The heading of a line written as an ATX heading: { level, text, column }, or null.
export function atxHeading(line) {
  const m = ATX.exec(line);
  if (!m) return null;
  const raw = m[2] ?? '';
  const text = raw.replace(ATX_CLOSE, '');
  return { level: m[1].length, text, column: /^ {0,3}#{1,6}[ \t]*/.exec(line)[0].length + 1 };
}

// The list marker of a line: { indent, content, column }, or null. A tab counts as one character.
export function listMarker(line) {
  const m = LIST.exec(line);
  if (!m) return null;
  const content = m[3] ?? '';
  return { indent: m[1].length, content, column: content ? line.length - content.length + 1 : m[1].length + 1 };
}

export const isThematicBreak = (line) => THEMATIC.test(line);
export const isTableSeparator = (line) => line.includes('-') && line.includes('|') && TABLE_SEPARATOR.test(line);

// The cells of a table row: the outer pipes left out, split at every pipe that is not escaped with a backslash.
export function tableCells(line) {
  let s = line.trim();
  if (s.startsWith('|')) s = s.slice(1);
  if (s.endsWith('|') && !s.endsWith('\\|')) s = s.slice(0, -1);
  const cells = [];
  let cell = '';
  for (let i = 0; i < s.length; i += 1) {
    if (s[i] === '\\' && s[i + 1] === '|') {
      cell += '|';
      i += 1;
    } else if (s[i] === '|') {
      cells.push(cell.trim());
      cell = '';
    } else cell += s[i];
  }
  cells.push(cell.trim());
  return cells;
}

const indentOf = (line) => line.length - line.trimStart().length;

// Reads a Markdown text: { lines, headings, notes }. Every line is { n, text, kind, indent, list, heading } where kind
// is blank, text, code, fence, heading, underline, rule, comment or meta (front matter). A heading line also holds
// { level, text, column }.
export function readMarkdown(text, limits = MARKDOWN_LIMITS) {
  const lim = { ...MARKDOWN_LIMITS, ...limits };
  const raw = splitLines(text);
  if (raw.length > lim.maxLines) throw Object.assign(new Error(`holds ${raw.length.toLocaleString('en-US')} lines, more than the ${lim.maxLines.toLocaleString('en-US')} read`), { reason: 'too many lines' });
  const lines = raw.map((t, i) => ({ n: i + 1, text: t, kind: t.trim() === '' ? 'blank' : 'text', indent: indentOf(t), list: null, heading: null }));
  const notes = [];
  let i = 0;
  // Front matter: a first line of three dashes, closed by three dashes or three dots within the limit.
  if (lines.length && lines[0].text.trim() === '---') {
    const last = Math.min(lines.length - 1, lim.maxFrontMatterLines + 1);
    for (let k = 1; k <= last; k += 1) {
      const t = lines[k].text.trim();
      if (t === '---' || t === '...') {
        for (let j = 0; j <= k; j += 1) lines[j].kind = 'meta';
        i = k + 1;
        break;
      }
    }
  }
  let fence = null;
  let comment = false;
  for (; i < lines.length; i += 1) {
    const line = lines[i];
    const t = line.text;
    if (fence) {
      const close = FENCE_CLOSE.exec(t);
      if (close && close[1][0] === fence.char && close[1].length >= fence.length) {
        line.kind = 'fence';
        fence = null;
      } else line.kind = 'code';
      continue;
    }
    if (comment) {
      line.kind = 'comment';
      if (t.includes('-->')) comment = false;
      continue;
    }
    if (line.kind === 'blank') continue;
    const open = FENCE_OPEN.exec(t);
    if (open && !(open[2][0] === '`' && open[3].includes('`'))) {
      line.kind = 'fence';
      fence = { char: open[2][0], length: open[2].length, line: line.n };
      continue;
    }
    if (t.trimStart().startsWith('<!--')) {
      line.kind = 'comment';
      if (!t.slice(t.indexOf('<!--') + 4).includes('-->')) comment = true;
      continue;
    }
    const atx = line.indent < 4 ? atxHeading(t) : null;
    if (atx) {
      line.kind = 'heading';
      line.heading = atx;
      continue;
    }
    const prev = i > 0 ? lines[i - 1] : null;
    if (SETEXT.test(t) && prev && prev.kind === 'text' && !prev.list && prev.indent < 4 && !prev.text.includes('|')) {
      const level = t.trim()[0] === '=' ? 1 : 2;
      const title = prev.text.trim();
      prev.kind = 'heading';
      prev.heading = { level, text: title, column: prev.indent + 1 };
      line.kind = 'underline';
      continue;
    }
    if (isThematicBreak(t)) {
      line.kind = 'rule';
      continue;
    }
    line.list = listMarker(t);
  }
  if (fence) notes.push(`a code fence opened on line ${fence.line} is never closed, so the rest of the file is read as code`);
  if (comment) notes.push('an HTML comment is never closed, so the rest of the file is left out');
  return { lines, headings: lines.filter((l) => l.kind === 'heading'), notes };
}
