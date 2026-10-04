// The checks of one report. A report is one or more files read with readMarkdown, in the order of their names. The
// checks find the verdict, the section and the rating of every required angle, the risks with their responses and
// owners, the assumptions with their status, the cost section, the estimates, the prototype and its results, and the
// next steps, and return a summary of what was found and the findings, each with its rule id, its file, line and
// column (or none, for something missing from the whole report) and a sentence that says what was found.

import { VERDICT_NAMES } from './defaults.js';
import { amountsIn, singleEstimate } from './estimates.js';
import { tableCells } from './markdown.js';
import { ancestorsOf, buildOutline, headingHolds, headingWords, headingsNaming, holdsText, itemsOf, outermost, sectionLines, tableValue, tablesIn } from './sections.js';
import { listText, plural } from './size.js';
import { asciiLower, cleanValue, compilePhrases, excerpt, findPhrase, isEmptyValue, labelValues, startPhrase, tokens } from './words.js';

const quoted = (list, max = 4, joiner = 'or') => listText(list.map((p) => `"${p}"`), max).replace(/ and (?=[^,]*$)/, ` ${joiner} `);
const isTextLine = (l) => l.kind === 'text' || l.kind === 'meta';
const STRONG = /\*\*([^*\n]{1,120})\*\*|__([^_\n]{1,120})__/g;

// Labelled values in a run of lines: "Label: value" in a line, a row of a table whose first cell is the label, and,
// with columns, every row of a table that has a column headed by the label. { file, line, column, label, value }.
export function labelled(lines, labels, file, { columns = false } = {}) {
  const out = [];
  const inTable = new Set();
  for (const t of tablesIn(lines)) {
    const col = columns ? t.header.findIndex((c) => labels.includes(tokens(c).join(' '))) : -1;
    for (const row of t.rows) {
      inTable.add(row.line);
      if (col >= 0 && row.cells[col] !== undefined) out.push({ file, line: row.line, column: row.column, label: tokens(t.header[col]).join(' '), value: cleanValue(row.cells[col]), cells: row.cells });
      else if (row.cells.length >= 2 && labels.includes(tokens(row.cells[0]).join(' '))) out.push({ file, line: row.line, column: row.column, label: tokens(row.cells[0]).join(' '), value: cleanValue(row.cells[1]), cells: row.cells });
    }
  }
  for (const l of lines) {
    if (!isTextLine(l) || inTable.has(l.n)) continue;
    const v = labelValues(l.text, labels)[0];
    if (v) out.push({ file, line: l.n, column: v.column, label: v.label, value: v.value, cells: null });
  }
  return out.sort((a, b) => a.line - b.line);
}

// The text of a heading after a colon, or inside its last parentheses: "Technical feasibility: amber".
function headingSuffix(text) {
  const colon = text.indexOf(':');
  if (colon >= 0) return text.slice(colon + 1);
  const m = /\(([^()]*)\)\s*$/.exec(text);
  return m ? m[1] : '';
}

// The verdict of a value: go, change or stop, or null.
function verdictOf(value, compiled) {
  const p = startPhrase(tokens(value), compiled.phrases);
  return p ? compiled.classOf.get(p) : null;
}

export function analyse(files, config) {
  const outline = buildOutline(files);
  const findings = [];
  const add = (rule, at, found) => findings.push({ rule, file: at ? at.file : null, line: at ? at.line : null, column: at ? at.column : null, found });
  const where = (h) => ({ file: h.file, line: h.line, column: h.column });
  const w = config.words;
  const compiled = {
    phrases: compilePhrases(Object.values(config.verdicts).flat()),
    classOf: new Map(Object.entries(config.verdicts).flatMap(([k, list]) => list.map((p) => [p, k]))),
    ratings: compilePhrases(w.ratings),
    responses: compilePhrases(w.responses, true),
    openStatuses: compilePhrases(w.openStatuses),
    openWords: compilePhrases(w.openWords, true),
    prototype: compilePhrases(w.prototype, true),
    exact: compilePhrases(w.exact)
  };
  const summary = { title: null, verdict: null, angles: [], risks: null, assumptions: null, cost: null, estimates: { lines: 0, single: 0 }, prototype: null, nextSteps: null };
  const title = outline.headings.find((h) => h.title);
  if (title) summary.title = title.text;

  // The verdict: verdict headings, then labelled lines anywhere. A line labelled with a recommendation counts only
  // when it gives a verdict, because "Recommendation:" also starts ordinary advice.
  const candidates = [];
  const used = new Set();
  for (const h of outline.headings) {
    if (h.title) continue;
    const colon = h.text.indexOf(':');
    const head = colon >= 0 ? headingWords(h.text.slice(0, colon)).join(' ') : h.words.join(' ');
    if (!config.headings.verdict.includes(head)) continue;
    if (colon >= 0 && cleanValue(h.text.slice(colon + 1))) {
      const value = cleanValue(h.text.slice(colon + 1));
      candidates.push({ ...where(h), value, verdict: verdictOf(value, compiled), strict: true, heading: h.text });
      continue;
    }
    const lines = [];
    for (const l of sectionLines(outline, h)) {
      if (l.kind === 'heading') break;
      lines.push(l);
    }
    const first = lines.findIndex(isTextLine);
    if (first < 0) {
      candidates.push({ ...where(h), value: '', verdict: null, strict: true, heading: h.text, empty: true });
      continue;
    }
    const l = lines[first];
    used.add(`${h.file}:${l.n}`);
    let value = cleanValue(l.list ? l.list.content : l.text);
    let verdict = verdictOf(value, compiled);
    if (!verdict) {
      // The first paragraph may name the verdict in bold: "We recommend **go with changes**."
      const paragraph = [];
      for (const p of lines.slice(first)) {
        if (!isTextLine(p)) break;
        paragraph.push(p.text);
      }
      for (const m of paragraph.join(' ').matchAll(STRONG)) {
        const v = verdictOf(m[1] ?? m[2], compiled);
        if (v) {
          verdict = v;
          value = cleanValue(m[1] ?? m[2]);
          break;
        }
      }
    }
    candidates.push({ file: h.file, line: l.n, column: (l.list ? l.list.column : l.indent + 1), value, verdict, strict: true, heading: h.text });
  }
  for (const f of files) {
    for (const v of labelled(f.lines, [...w.verdictLabels, ...w.recommendationLabels], f.file)) {
      if (used.has(`${f.file}:${v.line}`)) continue;
      const strict = w.verdictLabels.includes(v.label);
      const verdict = verdictOf(v.value, compiled);
      if (strict || verdict) candidates.push({ file: v.file, line: v.line, column: v.column, value: v.value, verdict, strict, label: v.label });
    }
  }
  candidates.sort((a, b) => files.findIndex((f) => f.file === a.file) - files.findIndex((f) => f.file === b.file) || a.line - b.line);
  const known = candidates.filter((c) => c.verdict);
  if (!candidates.length) add('missing-verdict', null, `no verdict: no heading or line named ${quoted([...config.headings.verdict.slice(0, 2)], 2)} gives ${quoted(Object.values(VERDICT_NAMES), 3)}`);
  for (const c of candidates.filter((x) => !x.verdict)) {
    if (c.empty) add('unknown-verdict', c, `the heading "${excerpt(c.heading)}" holds no verdict; write ${quoted(Object.values(VERDICT_NAMES), 3)} on the line under it`);
    else add('unknown-verdict', c, `the verdict "${excerpt(c.value)}" is not ${quoted(Object.values(VERDICT_NAMES), 3)}; start the line with one of them, or write it in bold`);
  }
  const classes = [...new Set(known.map((c) => c.verdict))];
  if (classes.length > 1) {
    const second = known.find((c) => c.verdict !== known[0].verdict);
    add('conflicting-verdict', second, `the report gives ${plural(classes.length, 'different verdict')}: ${VERDICT_NAMES[known[0].verdict]} on line ${known[0].line}${files.length > 1 ? ` of ${known[0].file}` : ''} and ${VERDICT_NAMES[second.verdict]} here`);
  }
  if (known.length) summary.verdict = { verdict: known[0].verdict, name: VERDICT_NAMES[known[0].verdict], value: known[0].value, file: known[0].file, line: known[0].line };

  // The angles. Of the headings that name an angle, the section is the one that also says "feasibility" or a word like
  // it, then the one at the highest level, then the first.
  const ratingTables = [];
  for (const f of files) {
    for (const t of tablesIn(f.lines)) {
      const col = t.header.findIndex((c) => w.ratingLabels.includes(tokens(c).join(' ')));
      if (col < 0) continue;
      for (const row of t.rows) ratingTables.push({ file: f.file, line: row.line, column: row.column, first: tokens(row.cells[0] ?? ''), value: cleanValue(row.cells[col] ?? '') });
    }
  }
  const hints = config.headings.feasibility;
  const order = new Map(outline.headings.map((h, i) => [h, i]));
  for (const id of config.required) {
    const angle = config.angles.find((a) => a.id === id);
    const name = angle.title.toLowerCase();
    const found = headingsNaming(outline, angle.aliases);
    if (!found.length) {
      add('missing-angle', null, `no section for the ${name} angle: no heading names ${quoted(angle.aliases, 4)}`);
      summary.angles.push({ id, title: angle.title, section: null, rating: null, unread: null });
      continue;
    }
    const rank = (h) => (headingHolds(h.words, hints) ? 0 : 1);
    const h = [...found].sort((a, b) => rank(a) - rank(b) || a.level - b.level || order.get(a) - order.get(b))[0];
    const values = [];
    const suffix = cleanValue(headingSuffix(h.text));
    if (suffix && startPhrase(tokens(suffix), compiled.ratings)) values.push({ ...where(h), value: suffix });
    values.push(...labelled(sectionLines(outline, h), w.ratingLabels, h.file, { columns: true }));
    for (const r of ratingTables) {
      const rest = r.first.filter((t) => !hints.includes(t)).join(' ');
      if (angle.aliases.includes(rest)) values.push(r);
    }
    const good = values.find((v) => startPhrase(tokens(v.value), compiled.ratings));
    const entry = { id, title: angle.title, section: { text: h.text, file: h.file, line: h.line }, rating: good ? { value: good.value, file: good.file, line: good.line } : null, unread: null };
    summary.angles.push(entry);
    if (good) continue;
    const said = values.find((v) => !isEmptyValue(v.value, w.emptyValues));
    if (said) entry.unread = { value: said.value, file: said.file, line: said.line };
    if (said) add('unknown-rating', said, `the rating "${excerpt(said.value)}" of the ${name} angle is not one of ${quoted(w.ratings, 6)}`);
    else if (values.length) add('missing-rating', values[0], `the rating of the ${name} angle is "${excerpt(values[0].value) || 'empty'}", which says nothing; rate it, such as "Rating: feasible"`);
    else add('missing-rating', where(h), `the ${name} section "${excerpt(h.text)}" has no rating, such as "Rating: feasible", "RAG: amber" or a rating table row`);
  }

  // Risks: every item of every risk section that does not lie inside another.
  const riskHeads = outermost(headingsNaming(outline, config.headings.risks));
  if (!riskHeads.length) add('missing-risks', null, `no risks section: no heading names ${quoted(config.headings.risks)}`);
  else {
    const items = riskHeads.flatMap((h) => itemsOf(outline, h).map((it) => ({ ...it, file: h.file })));
    summary.risks = { sections: riskHeads.map((h) => ({ text: h.text, file: h.file, line: h.line })), items: items.length, withoutResponse: 0, withoutOwner: 0 };
    if (!items.length) add('missing-risks', where(riskHeads[0]), `the section "${excerpt(riskHeads[0].text)}" lists no risk; write each risk as a list item, a table row or a subheading`);
    for (const it of items) {
      const text = it.lines.map((l) => l.text).join(' ');
      const name = excerpt(it.title) || `on line ${it.line}`;
      if (!findPhrase(tokens(text), compiled.responses)) {
        summary.risks.withoutResponse += 1;
        add('risk-without-response', it, `the risk "${name}" has no response: none of ${quoted(w.responses.slice(0, 6), 6)}`);
      }
      const owner = tableValue(it.table, w.ownerLabels) ?? it.lines.map((l) => labelValues(l.text, w.ownerLabels)[0]).find(Boolean) ?? null;
      if (!owner || isEmptyValue(owner.value, w.emptyValues)) {
        summary.risks.withoutOwner += 1;
        add('risk-without-owner', it, owner ? `the owner of the risk "${name}" is "${excerpt(cleanValue(owner.value)) || 'empty'}", which names no one` : `the risk "${name}" has no owner, such as "Owner: <a name or a role>"`);
      }
    }
  }

  // Assumptions, and the ones that are not tested yet.
  const assumptionHeads = outermost(headingsNaming(outline, config.headings.assumptions));
  if (!assumptionHeads.length) add('missing-assumptions', null, `no assumptions section: no heading names ${quoted(config.headings.assumptions)}`);
  else {
    const items = assumptionHeads.flatMap((h) => itemsOf(outline, h).map((it) => ({ ...it, file: h.file })));
    summary.assumptions = { sections: assumptionHeads.map((h) => ({ text: h.text, file: h.file, line: h.line })), items: items.length, untested: 0 };
    if (!items.length) add('missing-assumptions', where(assumptionHeads[0]), `the section "${excerpt(assumptionHeads[0].text)}" lists no assumption; write each one as a list item, a table row or a subheading`);
    for (const it of items) {
      const text = it.lines.map((l) => l.text).join(' ');
      const status = tableValue(it.table, w.statusLabels) ?? it.lines.map((l) => labelValues(l.text, w.statusLabels)[0]).find(Boolean) ?? null;
      let open = null;
      if (status) open = startPhrase(tokens(status.value), compiled.openStatuses);
      else {
        for (const m of text.matchAll(/[[(]([^\])\n]{1,40})[\])]/g)) {
          const t = tokens(m[1]).join(' ');
          if (w.openStatuses.includes(t)) {
            open = t;
            break;
          }
        }
        if (!open) open = findPhrase(tokens(text), compiled.openWords)?.phrase ?? null;
      }
      if (open) {
        summary.assumptions.untested += 1;
        add('untested-assumption', it, `the assumption "${excerpt(it.title) || `on line ${it.line}`}" is ${open}; test it, or say how and when it will be tested`);
      }
    }
  }

  // The cost section.
  const costHeads = headingsNaming(outline, config.headings.cost);
  const costWithText = costHeads.filter((h) => holdsText(outline, h));
  summary.cost = costHeads.length ? { sections: costHeads.map((h) => ({ text: h.text, file: h.file, line: h.line })), withText: costWithText.length } : null;
  if (!costHeads.length) add('missing-cost', null, `no cost section: no heading names ${quoted(config.headings.cost)}`);
  else if (!costWithText.length) add('missing-cost', where(costHeads[0]), `the cost section "${excerpt(costHeads[0].text)}" holds no text`);

  // Estimates: every line of a cost or estimate section, and every line labelled as an estimate, that holds an amount.
  const scope = new Set();
  for (const h of headingsNaming(outline, [...config.headings.cost, ...config.headings.estimates])) {
    for (const l of sectionLines(outline, h)) scope.add(`${h.fileIndex}:${l.n}`);
  }
  files.forEach((f, fi) => {
    for (const l of f.lines) {
      if (!isTextLine(l)) continue;
      if (!scope.has(`${fi}:${l.n}`) && !labelValues(l.text, w.estimateLabels).length) continue;
      if (!amountsIn(l.text).length) continue;
      summary.estimates.lines += 1;
      if (findPhrase(tokens(l.text), compiled.exact)) continue;
      const single = singleEstimate(l.text, l.text.includes('|') ? tableCells(l.text) : null);
      if (single) {
        summary.estimates.single += 1;
        add('single-estimate', { file: f.file, line: l.n, column: single.column }, `the estimate "${single.text}" is one number; give a range, such as a low and a high figure`);
      }
    }
  });

  // A prototype mentioned outside the next steps needs a section for its results or its limits.
  const nextHeads = headingsNaming(outline, config.headings.nextSteps);
  const inNext = new Set();
  for (const h of nextHeads) {
    inNext.add(`${h.fileIndex}:${h.line}`);
    for (const l of sectionLines(outline, h)) inNext.add(`${h.fileIndex}:${l.n}`);
  }
  let mention = null;
  files.forEach((f, fi) => {
    for (const l of f.lines) {
      if (mention) return;
      if (!(isTextLine(l) || l.kind === 'heading') || inNext.has(`${fi}:${l.n}`)) continue;
      const text = l.kind === 'heading' ? l.heading.text : l.text;
      const toks = tokens(text);
      const hit = findPhrase(toks, compiled.prototype);
      if (hit) {
        const at = asciiLower(text).indexOf(toks[hit.index]);
        mention = { file: f.file, line: l.n, column: at >= 0 ? at + 1 : 1, phrase: hit.phrase };
      }
    }
  });
  if (mention) {
    const results = outline.headings.find((h) => !h.title && headingHolds(h.words, config.headings.results) && holdsText(outline, h) && (findPhrase(h.words, compiled.prototype) || ancestorsOf(outline, h).some((a) => findPhrase(a.words, compiled.prototype))));
    summary.prototype = { phrase: mention.phrase, file: mention.file, line: mention.line, results: results ? { text: results.text, file: results.file, line: results.line } : null };
    if (!results) add('prototype-without-results', mention, `the report mentions a ${mention.phrase} but has no section for its results or limits, such as "Prototype results"`);
  }

  // The next steps.
  const nextWithText = nextHeads.filter((h) => holdsText(outline, h));
  summary.nextSteps = nextHeads.length ? { sections: nextHeads.map((h) => ({ text: h.text, file: h.file, line: h.line })), withText: nextWithText.length } : null;
  if (!nextHeads.length) add('missing-next-steps', null, `no next steps: no heading names ${quoted(config.headings.nextSteps)}`);
  else if (!nextWithText.length) add('missing-next-steps', where(nextHeads[0]), `the section "${excerpt(nextHeads[0].text)}" holds no text`);

  return { summary, findings, outline };
}
