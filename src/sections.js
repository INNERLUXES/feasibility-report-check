// Sections of a report: which headings name a kind of section, how far each section runs, and the items listed in it.
// A report is one or more files read in the order of their names; a section runs from its heading to the next heading
// at its level or above in the same file. The first heading of the first file is the title of the report when it is a
// level 1 heading, and it never counts as a section, so a title such as "Feasibility study: cost tracking" does not
// make the whole report the cost section. docs/decisions/0002 says why headings are matched by whole words.

import { isTableSeparator, tableCells } from './markdown.js';
import { tokens } from './words.js';

export const SECTION_LIMITS = { maxItems: 5000 };

// The words of a heading with its numbering left out: "3.1 Technical feasibility" and "A) Technical feasibility" are
// both "technical feasibility". Links keep their text.
export function headingWords(text) {
  const plain = text.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1');
  const t = tokens(plain);
  let k = 0;
  if (t.length > 1 && (t[0] === 'section' || t[0] === 'part' || t[0] === 'chapter')) k = 1;
  if (t.length > k + 1 && /^\s*(?:(?:section|part|chapter)\s+)?[A-Za-z][.)]\s/i.test(plain)) k += 1;
  else while (t.length > k + 1 && /^\d+$/.test(t[k])) k += 1;
  return t.slice(k);
}

// True when the words of a heading hold one of the phrases as whole words in order.
export function headingHolds(words, phrases) {
  return phrases.some((p) => {
    const w = p.split(' ');
    for (let i = 0; i + w.length <= words.length; i += 1) {
      let k = 0;
      while (k < w.length && words[i + k] === w[k]) k += 1;
      if (k === w.length) return true;
    }
    return false;
  });
}

// A report made of files read with readMarkdown: { files: [{ file, lines, headings }], headings } where every heading
// knows its file, its index in the lines of that file, its words, where its section ends, and whether it is the title.
export function buildOutline(files) {
  const headings = [];
  files.forEach((f, fi) => {
    const hs = f.lines.map((l, i) => [l, i]).filter(([l]) => l.kind === 'heading');
    hs.forEach(([l, i], k) => {
      let end = f.lines.length;
      for (let j = k + 1; j < hs.length; j += 1) {
        if (hs[j][0].heading.level <= l.heading.level) {
          end = hs[j][1];
          break;
        }
      }
      headings.push({ fileIndex: fi, file: f.file, index: i, line: l.n, column: l.heading.column, level: l.heading.level, text: l.heading.text, words: headingWords(l.heading.text), end, title: false });
    });
  });
  if (headings.length && headings[0].fileIndex === 0 && headings[0].level === 1) headings[0].title = true;
  return { files, headings };
}

// The headings of the outline, other than the title, that hold one of the phrases.
export function headingsNaming(outline, phrases) {
  return outline.headings.filter((h) => !h.title && headingHolds(h.words, phrases));
}

// True when heading b lies inside the section of heading a.
export const isInside = (a, b) => a !== b && a.fileIndex === b.fileIndex && b.index > a.index && b.index < a.end;

// The headings of a list in the order of the outline that do not lie inside the section of another heading of the list.
// One pass: a heading is inside another only when it comes before the end of the last outer heading of its file.
export function outermost(list) {
  const out = [];
  let open = null;
  for (const h of list) {
    if (open && isInside(open, h)) continue;
    out.push(h);
    open = h;
  }
  return out;
}

// The headings above a heading: the chain of sections it lies in, nearest first.
export function ancestorsOf(outline, h) {
  return outline.headings.filter((o) => isInside(o, h)).reverse();
}

// The lines of a section: every line after its heading up to the end of the section, subsections included.
export function sectionLines(outline, h) {
  return outline.files[h.fileIndex].lines.slice(h.index + 1, h.end);
}

// True when a section holds some text: a line that is not blank, a heading, a comment or code.
export const holdsText = (outline, h) => sectionLines(outline, h).some((l) => l.kind === 'text');

// The tables in a run of lines: { header, rows: [{ line, cells, text }] }. A table is a row with a pipe followed by a
// separator row such as |---|---|, and runs while its lines hold a pipe.
export function tablesIn(lines) {
  const out = [];
  for (let i = 0; i + 1 < lines.length; i += 1) {
    const head = lines[i];
    const sep = lines[i + 1];
    if (head.kind !== 'text' || sep.kind !== 'text' || !head.text.includes('|') || !isTableSeparator(sep.text)) continue;
    const table = { header: tableCells(head.text), headerLine: head.n, rows: [], lines: [head.n, sep.n] };
    let j = i + 2;
    for (; j < lines.length && lines[j].kind === 'text' && lines[j].text.includes('|'); j += 1) {
      table.rows.push({ line: lines[j].n, column: lines[j].indent + 1, cells: tableCells(lines[j].text), text: lines[j].text });
      table.lines.push(lines[j].n);
    }
    out.push(table);
    i = j - 1;
  }
  return out;
}

// The items a section lists, for the risks and the assumptions: { line, column, title, lines: [{ n, text }], table }.
// The rows of every table in the section and the top-level items of its lists are items. A section that holds neither
// takes its subheadings as items, each with the text under it.
export function itemsOf(outline, h, limits = SECTION_LIMITS) {
  const lines = sectionLines(outline, h);
  const tables = tablesIn(lines);
  const inTable = new Set(tables.flatMap((t) => t.lines));
  const items = [];
  for (const t of tables) {
    for (const row of t.rows) {
      const first = row.cells.find((c) => tokens(c).length) ?? '';
      items.push({ line: row.line, column: row.column, title: first, lines: [{ n: row.line, text: row.text }], table: { header: t.header, cells: row.cells } });
    }
  }
  const markers = lines.filter((l) => l.kind === 'text' && l.list && !inTable.has(l.n));
  if (markers.length) {
    const top = Math.min(...markers.map((l) => l.list.indent));
    let current = null;
    let blank = false;
    for (const l of lines) {
      if (l.kind === 'heading' || inTable.has(l.n)) {
        current = null;
        continue;
      }
      if (l.kind === 'blank') {
        blank = true;
        continue;
      }
      if (l.kind !== 'text') continue;
      if (l.list && l.list.indent <= top) {
        current = { line: l.n, column: l.list.column, title: l.list.content, lines: [{ n: l.n, text: l.list.content }], table: null };
        items.push(current);
      } else if (current && (l.indent > top || !blank)) current.lines.push({ n: l.n, text: l.text });
      else current = null;
      blank = false;
    }
  }
  if (!items.length) {
    const subs = outline.headings.filter((o) => isInside(h, o));
    const level = Math.min(...subs.map((s) => s.level));
    for (const s of subs.filter((o) => o.level === level)) {
      const body = sectionLines(outline, s).filter((l) => l.kind === 'text' || l.kind === 'meta');
      items.push({ line: s.line, column: s.column, title: s.text, lines: [{ n: s.line, text: s.text }, ...body.map((l) => ({ n: l.n, text: l.text }))], table: null });
    }
  }
  items.sort((a, b) => a.line - b.line);
  return items.slice(0, limits.maxItems);
}

// The value of the column of a table row whose header is one of the labels: { value, label }, or null.
export function tableValue(table, labels) {
  if (!table) return null;
  const col = table.header.findIndex((c) => labels.includes(tokens(c).join(' ')));
  if (col >= 0) return { label: tokens(table.header[col]).join(' '), value: table.cells[col] ?? '' };
  return null;
}
