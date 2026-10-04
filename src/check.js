// A run: read the configuration and the report (one file, or the Markdown files directly in a folder), run the checks
// on the whole report or on each file, and build the report of the run. An input that cannot be read stops the run with
// an InputError and no result, so a run never passes because a file was skipped.

import { join } from 'node:path';
import { analyse } from './analyse.js';
import { ConfigError, defaultConfig, readConfig, withAngles } from './config.js';
import { LEVELS, NOTICE, POINTS, pointPage } from './data.js';
import { FILE_LIMITS, inspectPath, listFolder, readText, readTextFile } from './files.js';
import { MARKDOWN_LIMITS, readMarkdown } from './markdown.js';
import { RULES, atOrAbove, decide } from './rules.js';
import { grouped, listText, plural } from './size.js';
import { safeText } from './text.js';
import { asciiLower } from './words.js';

export const LIMITS = { ...FILE_LIMITS, maxLines: MARKDOWN_LIMITS.maxLines, maxFindingsPerRule: 500 };
export const MAX_PROBLEMS = 20;
export const MARKDOWN_EXTENSIONS = ['.md', '.markdown'];

export class InputError extends Error {
  constructor(problems) {
    super(problems.join('; '));
    this.problems = problems;
  }
}

// A copy of a value with every text in it cleaned by safeText, for the parts of the report that come from the input.
export function cleanTexts(value) {
  if (typeof value === 'string') return safeText(value, 300);
  if (Array.isArray(value)) return value.map(cleanTexts);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, cleanTexts(v)]));
  return value;
}

// A list of problems for an error message: the first twenty, then a count.
function capped(problems) {
  return problems.length > MAX_PROBLEMS ? [...problems.slice(0, MAX_PROBLEMS), `and ${grouped(problems.length - MAX_PROBLEMS)} more`] : problems;
}

// True when a name ends with a Markdown extension, compared without case.
export const isMarkdownName = (name) => MARKDOWN_EXTENSIONS.some((e) => asciiLower(name).endsWith(e));

// One file read as Markdown: { file, lines, headings, notes }.
export function readDocument(file, text, limits = LIMITS) {
  const md = readMarkdown(text, { maxLines: limits.maxLines });
  return { file, lines: md.lines, headings: md.headings, notes: md.notes };
}

// The run as a report object. groups is a list of reports, each a list of documents; input says what was read.
export function buildReport({ input, groups, config, minSeverity, version, limits = LIMITS }) {
  const reports = [];
  const all = [];
  const notes = [];
  const fileOrder = new Map(input.files.map((f, i) => [f, i]));
  groups.forEach((docs, gi) => {
    const path = input.kind === 'folder' && groups.length === 1 ? input.path : docs[0].file;
    const { summary, findings } = analyse(docs, config);
    reports.push(cleanTexts({ path, files: docs.map((d) => d.file), ...summary }));
    for (const d of docs) for (const n of d.notes) notes.push(`${safeText(d.file)}: ${n}`);
    for (const f of findings) {
      const rule = RULES.find((r) => r.id === f.rule);
      const level = config.rules[rule.key];
      if (level === 'off') continue;
      const at = f.file ? `${f.file}${f.line ? `:${f.line}${f.column ? `:${f.column}` : ''}` : ''}` : path;
      all.push({ rule: f.rule, level, report: safeText(path), file: f.file === null ? null : safeText(f.file), line: f.line, column: f.column, at: safeText(at), found: safeText(f.found, 400), group: gi, order: fileOrder.get(f.file) ?? -1 });
    }
  });
  const ruleOrder = new Map(RULES.map((r, i) => [r.id, i]));
  all.sort((a, b) => LEVELS.indexOf(b.level) - LEVELS.indexOf(a.level) || a.group - b.group || a.order - b.order || (a.line ?? 0) - (b.line ?? 0) || ruleOrder.get(a.rule) - ruleOrder.get(b.rule));
  const shown = all.filter((f) => atOrAbove(f.level, minSeverity));
  const hidden = all.length - shown.length;
  const perRule = new Map();
  const findings = [];
  let cut = 0;
  for (const f of shown) {
    const n = (perRule.get(f.rule) ?? 0) + 1;
    perRule.set(f.rule, n);
    if (n > limits.maxFindingsPerRule) cut += 1;
    else {
      const rule = RULES.find((r) => r.id === f.rule);
      findings.push({ rule: f.rule, level: f.level, report: f.report, file: f.file, line: f.line, column: f.column, at: f.at, found: f.found, basis: rule.basis.map((k) => ({ text: POINTS[k].text, source: pointPage(k).title, url: pointPage(k).url })), own: rule.own });
    }
  }
  // The result counts every finding at or above the minimum severity, including the ones past the limit of a rule.
  const result = decide(shown);
  if (cut) notes.push(`${plural(cut, 'finding')} past the limit of ${grouped(limits.maxFindingsPerRule)} per rule ${cut === 1 ? 'is' : 'are'} counted but not listed`);
  if (hidden) notes.push(`${plural(hidden, 'finding')} below ${minSeverity} ${hidden === 1 ? 'is' : 'are'} not shown`);
  if (input.ignored.length) notes.push(`not read as part of the report: ${listText(input.ignored.map((n) => safeText(n, 120)), 5)}`);
  if (input.folders.length) notes.push(`${plural(input.folders.length, 'subfolder')} not read: ${listText(input.folders.map((n) => safeText(n, 120)), 5)}`);
  if (input.links.length) notes.push(`${plural(input.links.length, 'entry', 'entries')} of the folder ${input.links.length === 1 ? 'is a symbolic link' : 'are symbolic links'} and ${input.links.length === 1 ? 'was' : 'were'} not followed: ${listText(input.links.map((n) => safeText(n, 120)), 5)}`);
  const byLevel = { error: 0, warning: 0, notice: 0 };
  for (const f of shown) byLevel[f.level] += 1;
  return {
    tool: 'feasibility-report-check',
    version,
    input: cleanTexts({ path: input.path, kind: input.kind, mode: input.mode, files: input.files, ignored: input.ignored, subfolders: input.folders.length, symbolicLinks: input.links.length }),
    config: {
      file: config.file === null ? null : safeText(config.file),
      name: config.name === null ? null : safeText(config.name, 120),
      angles: config.angles.map((a) => ({ id: a.id, title: a.title, aliases: a.aliases, required: config.required.includes(a.id) })),
      required: config.required,
      minSeverity,
      rules: RULES.map((r) => ({ id: r.id, key: r.key, level: config.rules[r.key], rule: safeText(r.rule(config), 600) }))
    },
    reports,
    findings,
    totals: { reports: reports.length, files: input.files.length, findings: shown.length, byLevel, hidden, notListed: cut },
    result,
    notes,
    notice: NOTICE
  };
}

// Reads the configuration and the input and checks them: the report object of the run.
export async function checkPaths({ input, config: configPath = null, angles = null, minSeverity = null, each = false, version = '0.0.0', limits = LIMITS, base = process.cwd() }) {
  let config;
  try {
    if (configPath) {
      const c = await readTextFile(configPath, base, limits.maxConfigBytes);
      config = readConfig(c.text, c.file);
    } else config = defaultConfig();
    if (angles) config = withAngles(config, angles);
  } catch (error) {
    if (error instanceof ConfigError) throw new InputError(capped(error.problems));
    throw new InputError([error.message]);
  }
  let target;
  try {
    target = await inspectPath(input, base);
  } catch (error) {
    throw new InputError([error.message]);
  }
  const listing = { path: target.shown, kind: target.kind, mode: each && target.kind === 'folder' ? 'each file' : 'one report', files: [], ignored: [], folders: [], links: [] };
  const toRead = [];
  if (target.kind === 'file') {
    listing.files.push(target.shown);
    toRead.push({ full: target.full, shown: target.shown });
  } else {
    let entries;
    try {
      entries = await listFolder(target.full, target.shown, limits.maxEntries);
    } catch (error) {
      throw new InputError([error.message]);
    }
    const ignore = config.ignoreFiles.map(asciiLower);
    for (const name of entries.files) {
      if (isMarkdownName(name) && !ignore.includes(asciiLower(name))) {
        const shown = target.shown === '.' ? name : `${target.shown}/${name}`;
        listing.files.push(shown);
        toRead.push({ full: join(target.full, name), shown });
      } else listing.ignored.push(name);
    }
    listing.ignored.push(...entries.other);
    listing.folders = entries.folders;
    listing.links = entries.links;
    if (!toRead.length) throw new InputError([`${target.shown}: holds no Markdown file (${MARKDOWN_EXTENSIONS.join(' or ')}) to read`]);
  }
  const problems = [];
  const docs = [];
  let total = 0;
  for (const f of toRead) {
    try {
      const { size, text } = await readText(f.full, f.shown, limits.maxFileBytes);
      total += size;
      if (total > limits.maxTotalBytes) {
        problems.push(`${target.shown}: the files together are over the ${grouped(limits.maxTotalBytes)} byte limit; check fewer files`);
        break;
      }
      docs.push(readDocument(f.shown, text, limits));
    } catch (error) {
      problems.push(error.reason === 'too many lines' ? `${f.shown}: ${error.message}` : error.message);
    }
  }
  if (problems.length) throw new InputError(capped(problems));
  const groups = each ? docs.map((d) => [d]) : [docs];
  return buildReport({ input: listing, groups, config, minSeverity: minSeverity ?? config.minSeverity, version, limits });
}
