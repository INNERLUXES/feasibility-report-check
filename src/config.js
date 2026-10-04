// The configuration file: a JSON object that changes the built-in configuration key by key. A list is either a JSON
// array, which replaces the built-in list, or an object with "replace", "add" and "remove". Every key the tool does not
// know is an error with its line and a suggestion, so a typo cannot leave a default in place unnoticed; the JSON reader
// refuses a name given twice in one object. Phrases are kept as lowercase words joined by one space, as they are
// compared (src/words.js).

import { LEVELS } from './data.js';
import { DEFAULT_ANGLES, DEFAULT_HEADINGS, DEFAULT_IGNORE_FILES, DEFAULT_MIN_SEVERITY, DEFAULT_REQUIRED, DEFAULT_RULES, DEFAULT_VERDICTS, DEFAULT_WORDS } from './defaults.js';
import { JsonError, jsonProblem, parseJson } from './json.js';
import { asciiLower, normalizePhrase } from './words.js';

export const CONFIG_LIMITS = { maxEntries: 500, maxEntryLength: 120, maxAngles: 50, maxIdLength: 40 };

// Every key of the configuration file, with the kind of its value. docs/inputs.md describes each of them.
export const KEYS = {
  name: 'text',
  angles: 'list of angle ids',
  aliases: 'object: angle id to a list of phrases',
  headings: Object.fromEntries(Object.keys(DEFAULT_HEADINGS).map((k) => [k, 'list of phrases'])),
  words: Object.fromEntries(Object.keys(DEFAULT_WORDS).map((k) => [k, 'list of phrases'])),
  verdicts: Object.fromEntries(Object.keys(DEFAULT_VERDICTS).map((k) => [k, 'list of phrases'])),
  ignoreFiles: 'list of file names',
  rules: Object.fromEntries(Object.keys(DEFAULT_RULES).map((k) => [k, 'level or off'])),
  minSeverity: 'level'
};

const LIST_OPS = ['replace', 'add', 'remove'];
const ID = /^[a-z][a-zA-Z0-9]*$/;

export class ConfigError extends Error {
  constructor(problems) {
    super(problems.join('; '));
    this.problems = problems;
  }
}

// The edit distance of two short names, for a suggestion: an insertion, a deletion, a change or two neighbours swapped
// ("nmae" for "name") each count one.
export function distance(a, b) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)));
  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
  }
  return d[a.length][b.length];
}

// The closest of the known names, when it is close enough to be a typo.
function suggestion(name, known) {
  let best = null;
  for (const k of known) {
    const d = distance(asciiLower(name), asciiLower(k));
    if (d <= Math.max(1, Math.floor(k.length / 3)) && (!best || d < best.d)) best = { k, d };
  }
  return best ? `; did you mean "${best.k}"?` : '';
}

export function kindOf(value) {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'a list';
  if (typeof value === 'object') return 'an object';
  return `a ${typeof value}`;
}

const isObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const own = (o) => Object.keys(o);

// The built-in configuration, as the checks use it.
export function defaultConfig() {
  return {
    file: null,
    name: null,
    angles: DEFAULT_ANGLES.map((a) => ({ id: a.id, title: a.title, aliases: a.aliases.map(normalizePhrase), basis: [...a.basis] })),
    required: [...DEFAULT_REQUIRED],
    headings: Object.fromEntries(Object.entries(DEFAULT_HEADINGS).map(([k, v]) => [k, v.map(normalizePhrase)])),
    words: Object.fromEntries(Object.entries(DEFAULT_WORDS).map(([k, v]) => [k, v.map(normalizePhrase)])),
    verdicts: Object.fromEntries(Object.entries(DEFAULT_VERDICTS).map(([k, v]) => [k, v.map(normalizePhrase)])),
    ignoreFiles: [...DEFAULT_IGNORE_FILES],
    rules: { ...DEFAULT_RULES },
    minSeverity: DEFAULT_MIN_SEVERITY
  };
}

// The built-in configuration written as a configuration file, for --print-defaults. Read back, it gives the defaults.
export function defaultsAsConfig() {
  const d = defaultConfig();
  return {
    name: 'built-in defaults',
    angles: d.required,
    aliases: Object.fromEntries(d.angles.map((a) => [a.id, a.aliases])),
    headings: d.headings,
    words: d.words,
    verdicts: d.verdicts,
    ignoreFiles: d.ignoreFiles,
    rules: d.rules,
    minSeverity: d.minSeverity
  };
}

// Checks a parsed configuration and builds the configuration the checks use, or throws ConfigError with every problem.
export function validateConfig(value, lines = new Map(), file = 'config') {
  const problems = [];
  const lineOf = (path) => {
    for (let p = path; p; p = p.replace(/(?:\.[^.[\]]+|\[\d+\])$/, '')) if (lines.has(p)) return lines.get(p);
    return 1;
  };
  const fail = (path, message) => problems.push({ line: lineOf(path), text: `${file}: line ${lineOf(path)}: ${message}` });
  // Records a problem and gives back the value to go on with.
  const refuse = (path, message, result) => {
    fail(path, message);
    return result;
  };
  const config = defaultConfig();
  config.file = file;
  if (!isObject(value)) throw new ConfigError([`${file}: line 1: the configuration must be a JSON object, not ${kindOf(value)}`]);

  // One entry of a list: a string of 1 to 120 characters that holds a word, kept in its compared form.
  const entryOf = (path, e, normalize) => {
    if (typeof e !== 'string') return refuse(path, `${path} must be a text, not ${kindOf(e)}`, null);
    if (e.length === 0 || e.length > CONFIG_LIMITS.maxEntryLength) return refuse(path, `${path} must hold 1 to ${CONFIG_LIMITS.maxEntryLength} characters`, null);
    const n = normalize(e);
    if (!n) return refuse(path, `${path} holds no letter or digit`, null);
    return n;
  };
  const entriesOf = (path, list, normalize) => {
    if (!Array.isArray(list)) return refuse(path, `${path} must be a list, not ${kindOf(list)}`, []);
    if (list.length > CONFIG_LIMITS.maxEntries) return refuse(path, `${path} holds more than ${CONFIG_LIMITS.maxEntries} entries`, []);
    const out = [];
    list.forEach((e, i) => {
      const n = entryOf(`${path}[${i}]`, e, normalize);
      if (n === null) return;
      if (out.includes(n)) fail(`${path}[${i}]`, `${path} names "${n}" twice`);
      else out.push(n);
    });
    return out;
  };
  // A list value: an array that replaces the list, or { replace, add, remove } applied to it in that order.
  const listOf = (path, v, base, normalize = normalizePhrase) => {
    if (Array.isArray(v)) return entriesOf(path, v, normalize);
    if (!isObject(v)) return refuse(path, `${path} must be a list or an object with replace, add or remove, not ${kindOf(v)}`, base);
    for (const k of own(v)) if (!LIST_OPS.includes(k)) fail(`${path}.${k}`, `"${k}" is not a key of ${path} (replace, add, remove)${suggestion(k, LIST_OPS)}`);
    let out = Object.hasOwn(v, 'replace') ? entriesOf(`${path}.replace`, v.replace, normalize) : [...base];
    if (Object.hasOwn(v, 'remove')) {
      for (const [i, n] of entriesOf(`${path}.remove`, v.remove, normalize).entries()) {
        if (!out.includes(n)) fail(`${path}.remove[${i}]`, `${path}.remove names "${n}", which is not on the list`);
        out = out.filter((x) => x !== n);
      }
    }
    if (Object.hasOwn(v, 'add')) {
      for (const [i, n] of entriesOf(`${path}.add`, v.add, normalize).entries()) {
        if (out.includes(n)) fail(`${path}.add[${i}]`, `${path}.add names "${n}", which is already on the list`);
        else out.push(n);
      }
    }
    if (out.length > CONFIG_LIMITS.maxEntries) fail(path, `${path} holds more than ${CONFIG_LIMITS.maxEntries} entries`);
    return out;
  };
  const sub = (path, v, keys, each) => {
    if (!isObject(v)) return fail(path, `${path} must be an object, not ${kindOf(v)}`);
    for (const k of own(v)) {
      if (!keys.includes(k)) fail(`${path}.${k}`, `"${k}" is not a key of ${path}${suggestion(k, keys)}`);
      else each(k, v[k], `${path}.${k}`);
    }
  };

  const top = Object.keys(KEYS);
  for (const k of own(value)) if (!top.includes(k)) fail(k, `"${k}" is not a key of the configuration${suggestion(k, top)}`);

  if (Object.hasOwn(value, 'name')) {
    if (typeof value.name !== 'string' || value.name.length === 0 || value.name.length > CONFIG_LIMITS.maxEntryLength) fail('name', `name must be a text of 1 to ${CONFIG_LIMITS.maxEntryLength} characters`);
    else config.name = value.name;
  }
  if (Object.hasOwn(value, 'aliases')) {
    const v = value.aliases;
    if (!isObject(v)) fail('aliases', `aliases must be an object, not ${kindOf(v)}`);
    else {
      for (const id of own(v)) {
        const path = `aliases.${id}`;
        if (!ID.test(id) || id.length > CONFIG_LIMITS.maxIdLength) {
          fail(path, `the angle id "${id.slice(0, 60)}" must be a letter a to z followed by letters and digits, at most ${CONFIG_LIMITS.maxIdLength} characters`);
          continue;
        }
        let angle = config.angles.find((a) => a.id === id);
        if (!angle) {
          if (config.angles.length >= CONFIG_LIMITS.maxAngles) {
            fail(path, `more than ${CONFIG_LIMITS.maxAngles} angles`);
            continue;
          }
          angle = { id, title: `${id[0].toUpperCase()}${id.slice(1)}`, aliases: [], basis: [] };
          config.angles.push(angle);
        }
        angle.aliases = listOf(path, v[id], angle.aliases);
        if (!angle.aliases.length) fail(path, `the angle ${id} has no alias left, so no heading could name it`);
      }
      const seen = new Map();
      for (const a of config.angles) {
        for (const alias of a.aliases) {
          if (seen.has(alias)) fail(`aliases.${a.id}`, `the alias "${alias}" names both ${seen.get(alias)} and ${a.id}`);
          else seen.set(alias, a.id);
        }
      }
    }
  }
  if (Object.hasOwn(value, 'angles')) {
    const ids = config.angles.map((a) => a.id);
    const list = listOf('angles', value.angles, config.required, (e) => e.trim());
    config.required = [];
    for (const [i, id] of list.entries()) {
      if (ids.includes(id)) config.required.push(id);
      else fail(`angles[${i}]`, `the angle "${id.slice(0, 60)}" is not known (${ids.join(', ')}); give its aliases under aliases.${ID.test(id) ? id : '<id>'}${suggestion(id, ids)}`);
    }
  }
  if (Object.hasOwn(value, 'headings')) sub('headings', value.headings, Object.keys(DEFAULT_HEADINGS), (k, v, path) => {
    config.headings[k] = listOf(path, v, config.headings[k]);
  });
  if (Object.hasOwn(value, 'words')) sub('words', value.words, Object.keys(DEFAULT_WORDS), (k, v, path) => {
    config.words[k] = listOf(path, v, config.words[k]);
  });
  if (Object.hasOwn(value, 'verdicts')) {
    sub('verdicts', value.verdicts, Object.keys(DEFAULT_VERDICTS), (k, v, path) => {
      config.verdicts[k] = listOf(path, v, config.verdicts[k]);
    });
    const seen = new Map();
    for (const [k, list] of Object.entries(config.verdicts)) {
      for (const p of list) {
        if (seen.has(p)) fail(`verdicts.${k}`, `the phrase "${p}" is a verdict of both ${seen.get(p)} and ${k}`);
        else seen.set(p, k);
      }
    }
  }
  if (Object.hasOwn(value, 'ignoreFiles')) config.ignoreFiles = listOf('ignoreFiles', value.ignoreFiles, config.ignoreFiles, (e) => e.trim());
  if (Object.hasOwn(value, 'rules')) sub('rules', value.rules, Object.keys(DEFAULT_RULES), (k, v, path) => {
    if (typeof v !== 'string' || ![...LEVELS, 'off'].includes(v)) fail(path, `${path} must be one of ${[...LEVELS, 'off'].join(', ')}, not ${typeof v === 'string' ? `"${v.slice(0, 40)}"` : kindOf(v)}`);
    else config.rules[k] = v;
  });
  if (Object.hasOwn(value, 'minSeverity')) {
    if (!LEVELS.includes(value.minSeverity)) fail('minSeverity', `minSeverity must be one of ${LEVELS.join(', ')}`);
    else config.minSeverity = value.minSeverity;
  }
  for (const [k, list] of Object.entries(config.verdicts)) if (!list.length) fail(`verdicts.${k}`, `the verdict ${k} has no phrase left`);
  // The problems in the order of their lines, so the list reads like the file.
  if (problems.length) throw new ConfigError(problems.sort((a, b) => a.line - b.line).map((p) => p.text));
  return config;
}

// Reads the text of a configuration file.
export function readConfig(text, file) {
  let parsed;
  try {
    parsed = parseJson(text, { linesUpTo: 4 });
  } catch (error) {
    if (error instanceof JsonError) throw new ConfigError([`${file}: ${jsonProblem(error, text)}`]);
    throw error;
  }
  return validateConfig(parsed.value, parsed.lines, file);
}

// The configuration with the angles a report must cover replaced, for --angles. Throws ConfigError for an unknown id.
export function withAngles(config, ids) {
  const known = config.angles.map((a) => a.id);
  const unknown = ids.filter((id) => !known.includes(id));
  if (unknown.length) throw new ConfigError(unknown.map((id) => `--angles: the angle "${id.slice(0, 60)}" is not known (${known.join(', ')})${suggestion(id, known)}`));
  return { ...config, required: [...new Set(ids)] };
}
