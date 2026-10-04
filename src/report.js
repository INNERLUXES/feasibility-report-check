// The three reports: text for a terminal, JSON for other tools, and GitHub workflow commands that turn each finding into
// an annotation on its file and line. Every text from a report (a heading, a value, a file name) was cleaned by safeText
// before it reached the report object. The GitHub commands also escape the characters a command gives a meaning to, as
// the GitHub documentation lists them, so a heading cannot end a command early or start another one.

import { grouped, plural } from './size.js';
import { safeText } from './text.js';

const clean = (t, max = 200) => safeText(t, max);

function configLine(r) {
  const c = r.config;
  const where = c.file ? `${c.file}${c.name ? ` (${clean(c.name, 120)})` : ''}` : 'built-in defaults';
  return `${where}: angles ${c.required.join(', ') || 'none'}; minimum severity ${c.minSeverity}`;
}

function inputLine(r) {
  const i = r.input;
  const how = i.mode === 'each file' ? 'each file read as a report of its own' : 'read as one report';
  return `${i.path} (${plural(i.files.length, 'file')}, ${how})`;
}

const rulesLine = (r) => r.config.rules.map((x) => `${x.id} (${x.level})`).join('; ');

function findingsLine(r) {
  const b = r.totals.byLevel;
  const parts = ['error', 'warning', 'notice'].filter((l) => b[l]).map((l) => `${grouped(b[l])} ${l}`);
  return `${grouped(r.totals.findings)}${parts.length ? ` (${parts.join(', ')})` : ''}${r.totals.hidden ? `; ${grouped(r.totals.hidden)} below ${r.config.minSeverity} not shown` : ''}`;
}

// Where a section is: its line, with its file when the report has more than one.
function place(rep, at) {
  const file = rep.files.length > 1 ? `${at.file.split('/').at(-1)}:` : 'line ';
  return `${file}${at.line}`;
}

const sectionText = (rep, s) => `"${clean(s.text, 80)}", ${place(rep, s)}`;

// The lines that say what was found in one report.
function reportLines(rep) {
  const rows = [];
  rows.push(['verdict', rep.verdict ? `${rep.verdict.name}, ${place(rep, rep.verdict)}` : 'none']);
  for (const a of rep.angles) {
    rows.push([a.id, a.section ? `${sectionText(rep, a.section)}: ${a.rating ? `rated ${clean(a.rating.value, 60)}` : a.unread ? `the rating "${clean(a.unread.value, 60)}" is not a rating word` : 'no rating'}` : 'missing']);
  }
  const r = rep.risks;
  rows.push(['risks', r ? `${sectionText(rep, r.sections[0])}${r.sections.length > 1 ? ` and ${plural(r.sections.length - 1, 'more section')}` : ''}: ${plural(r.items, 'risk')}, ${grouped(r.withoutResponse)} without a response, ${grouped(r.withoutOwner)} without an owner` : 'missing']);
  const a = rep.assumptions;
  rows.push(['assumptions', a ? `${sectionText(rep, a.sections[0])}${a.sections.length > 1 ? ` and ${plural(a.sections.length - 1, 'more section')}` : ''}: ${plural(a.items, 'assumption')}, ${grouped(a.untested)} untested` : 'missing']);
  rows.push(['cost', rep.cost ? `${sectionText(rep, rep.cost.sections[0])}: ${plural(rep.estimates.lines, 'line')} with an amount, ${grouped(rep.estimates.single)} with one number only` : 'missing']);
  const p = rep.prototype;
  rows.push(['prototype', p ? `"${clean(p.phrase, 40)}" mentioned, ${place(rep, p)}; ${p.results ? `results in ${sectionText(rep, p.results)}` : 'no results section'}` : 'not mentioned']);
  rows.push(['next steps', rep.nextSteps ? sectionText(rep, rep.nextSteps.sections[0]) : 'missing']);
  const width = Math.max(...rows.map((x) => x[0].length));
  return rows.map(([k, v]) => `  ${k.padEnd(width)}  ${v}`);
}

export function toText(r, { explain = false } = {}) {
  const out = [];
  out.push(`feasibility-report-check: ${r.input.path}`);
  out.push(`input: ${inputLine(r)}`);
  out.push(`config: ${configLine(r)}`);
  out.push(`rules: ${rulesLine(r)}`);
  out.push(`findings: ${findingsLine(r)}`);
  out.push('', `Findings (${grouped(r.findings.length)})`, '');
  if (!r.findings.length) out.push('  none', '');
  const width = Math.max(...r.config.rules.map((x) => x.id.length));
  const pad = ' '.repeat(11);
  for (const f of r.findings) {
    out.push(`  ${f.level.toUpperCase().padEnd(8)} ${f.rule.padEnd(width)}  ${f.at}`);
    out.push(`${pad}${f.found}`);
    if (explain) {
      out.push(`${pad}rule: ${r.config.rules.find((x) => x.id === f.rule).rule}`);
      for (const b of f.basis) out.push(`${pad}basis: ${b.text} (${b.source}, ${b.url})`);
      if (f.own) out.push(`${pad}the tool's own choice: ${f.own}`);
    }
    out.push('');
  }
  for (const rep of r.reports) {
    out.push(`Report: ${rep.path}${rep.title ? ` ("${clean(rep.title, 100)}")` : ''}`, '');
    out.push(...reportLines(rep), '');
  }
  for (const n of r.notes) out.push(`note: ${n}`);
  if (r.notes.length) out.push('');
  out.push(r.notice, '');
  out.push(`RESULT: ${r.result.text}`);
  return `${out.join('\n')}\n`;
}

export function toJson(r, { explain = false } = {}) {
  const out = { ...r, findings: r.findings.map((f) => (explain ? f : { ...f, basis: undefined, own: undefined })) };
  return `${JSON.stringify(out, null, 2)}\n`;
}

// The message of a workflow command: %, CR and LF escaped.
export const escapeData = (t) => String(t).replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A');

// A property of a workflow command: also : and , escaped.
export const escapeProperty = (t) => escapeData(t).replace(/:/g, '%3A').replace(/,/g, '%2C');

const COMMANDS = { error: 'error', warning: 'warning', notice: 'notice' };

export function toGithub(r) {
  const out = [];
  for (const f of r.findings) {
    const props = [];
    if (f.file) props.push(`file=${escapeProperty(f.file)}`);
    if (f.file && f.line) props.push(`line=${f.line}`);
    if (f.file && f.line && f.column) props.push(`col=${f.column}`);
    props.push(`title=${escapeProperty(`feasibility-report-check ${f.rule}`)}`);
    const message = f.file ? f.found : `${f.report}: ${f.found}`;
    out.push(`::${COMMANDS[f.level]} ${props.join(',')}::${escapeData(message)}`);
  }
  out.push(`feasibility-report-check: ${r.input.path}: ${grouped(r.totals.findings)} ${r.totals.findings === 1 ? 'finding' : 'findings'}; RESULT: ${r.result.text}`);
  return `${out.join('\n')}\n`;
}
