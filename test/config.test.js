import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG_LIMITS, ConfigError, DEFAULT_ANGLES, DEFAULT_RULES, KEYS, RULES, defaultConfig, defaultsAsConfig, distance, kindOf, readConfig, validateConfig, withAngles } from '../src/index.js';

// The configuration file: every key with a good value and a bad one, the list forms, and the errors with their lines.

const problemsOf = (text) => {
  try {
    readConfig(text, 'c.json');
  } catch (error) {
    assert.ok(error instanceof ConfigError, error.message);
    return error.problems;
  }
  assert.fail(`not refused: ${text}`);
};

test('config: the defaults, and the defaults written as a file read back to the same configuration', () => {
  const d = defaultConfig();
  assert.deepEqual(d.required, ['technical', 'financial', 'operational', 'schedule', 'legal']);
  assert.deepEqual(d.angles.map((a) => a.id), DEFAULT_ANGLES.map((a) => a.id));
  assert.equal(d.minSeverity, 'notice');
  assert.deepEqual(Object.keys(d.rules), RULES.map((r) => r.key));
  assert.deepEqual(Object.keys(DEFAULT_RULES), RULES.map((r) => r.key));
  const back = readConfig(JSON.stringify(defaultsAsConfig()), 'd.json');
  assert.deepEqual({ ...back, file: null, name: null }, d);
  assert.equal(back.name, 'built-in defaults');
});

test('config: a list as an array replaces, and an object adds, removes or replaces, in that order', () => {
  assert.deepEqual(readConfig('{"headings": {"risks": ["risk log"]}}', 'c.json').headings.risks, ['risk log']);
  assert.deepEqual(readConfig('{"headings": {"risks": {"add": ["Risk-Log"]}}}', 'c.json').headings.risks, ['risk', 'risks', 'risk log']);
  assert.deepEqual(readConfig('{"headings": {"risks": {"remove": ["risk"]}}}', 'c.json').headings.risks, ['risks']);
  assert.deepEqual(readConfig('{"headings": {"risks": {"replace": ["hazards"], "add": ["threats"]}}}', 'c.json').headings.risks, ['hazards', 'threats']);
  assert.deepEqual(readConfig('{"words": {"ratings": {"add": ["acceptable"]}}, "verdicts": {"go": {"add": ["green light"]}}}', 'c.json').verdicts.go, ['go', 'proceed', 'go ahead', 'green light']);
  assert.deepEqual(readConfig('{"ignoreFiles": ["NOTES.md", " index.md "]}', 'c.json').ignoreFiles, ['NOTES.md', 'index.md']);
});

test('config: angles of its own with aliases, the required list, and --angles over it', () => {
  const c = readConfig('{"aliases": {"security": ["Security", "privacy"], "technical": {"add": ["engineering"]}}, "angles": {"add": ["security"], "remove": ["schedule"]}}', 'c.json');
  assert.deepEqual(c.required, ['technical', 'financial', 'operational', 'legal', 'security']);
  assert.deepEqual(c.angles.find((a) => a.id === 'security'), { id: 'security', title: 'Security', aliases: ['security', 'privacy'], basis: [] });
  assert.ok(c.angles.find((a) => a.id === 'technical').aliases.includes('engineering'));
  assert.deepEqual(withAngles(c, ['security', 'legal', 'security']).required, ['security', 'legal']);
  assert.throws(() => withAngles(c, ['secrity']), (e) => e instanceof ConfigError && /--angles: the angle "secrity" is not known .*; did you mean "security"\?/.test(e.problems[0]));
  assert.deepEqual(readConfig('{"angles": []}', 'c.json').required, [], 'no angle is required');
});

test('config: every unknown key is an error with its line and a suggestion', () => {
  const p = problemsOf('{\n  "agnles": [],\n  "headings": {\n    "risk": ["x"]\n  },\n  "rules": {\n    "singleEstimat": "off"\n  },\n  "words": {"ratings": {"ad": ["x"]}}\n}');
  assert.deepEqual(p, [
    'c.json: line 2: "agnles" is not a key of the configuration; did you mean "angles"?',
    'c.json: line 4: "risk" is not a key of headings; did you mean "risks"?',
    'c.json: line 7: "singleEstimat" is not a key of rules; did you mean "singleEstimate"?',
    'c.json: line 9: "ad" is not a key of words.ratings (replace, add, remove); did you mean "add"?'
  ]);
  assert.match(problemsOf('{"zzzzzz": 1}')[0], /"zzzzzz" is not a key of the configuration$/, 'no suggestion when nothing is close');
});

test('config: wrong values are errors: types, levels, ids, empty entries, repeats, and entries that are or are not on a list', () => {
  for (const [text, pattern] of [
    ['[]', /the configuration must be a JSON object, not a list/],
    ['{"name": 3}', /name must be a text of 1 to 120 characters/],
    ['{"minSeverity": "fatal"}', /minSeverity must be one of notice, warning, error/],
    ['{"rules": {"missingCost": "loud"}}', /rules.missingCost must be one of notice, warning, error, off, not "loud"/],
    ['{"rules": {"missingCost": {"level": "off"}}}', /rules.missingCost must be one of .*, not an object/],
    ['{"rules": []}', /rules must be an object, not a list/],
    ['{"headings": {"risks": "risk"}}', /headings.risks must be a list or an object with replace, add or remove, not a string/],
    ['{"headings": {"risks": [3]}}', /headings.risks\[0\] must be a text, not a number/],
    ['{"headings": {"risks": [""]}}', /headings.risks\[0\] must hold 1 to 120 characters/],
    ['{"headings": {"risks": ["--"]}}', /headings.risks\[0\] holds no letter or digit/],
    ['{"headings": {"risks": ["a", "A"]}}', /headings.risks names "a" twice/],
    ['{"headings": {"risks": {"add": ["risk"]}}}', /headings.risks.add names "risk", which is already on the list/],
    ['{"headings": {"risks": {"remove": ["hazard"]}}}', /headings.risks.remove names "hazard", which is not on the list/],
    ['{"headings": {"risks": {"add": "x"}}}', /headings.risks.add must be a list, not a string/],
    ['{"aliases": {"Security": ["x"]}}', /the angle id "Security" must be a letter a to z/],
    ['{"aliases": {"security": []}}', /the angle security has no alias left/],
    ['{"aliases": {"security": ["technical"]}}', /the alias "technical" names both technical and security/],
    ['{"aliases": 3}', /aliases must be an object, not a number/],
    ['{"angles": ["security"]}', /the angle "security" is not known \(technical, financial, operational, schedule, legal\); give its aliases under aliases.security/],
    ['{"verdicts": {"stop": {"add": ["go"]}}}', /the phrase "go" is a verdict of both go and stop/],
    ['{"verdicts": {"go": []}}', /the verdict go has no phrase left/],
    [`{"words": {"ratings": [${Array(CONFIG_LIMITS.maxEntries + 1).fill('"x"').join(',')}]}}`, /holds more than 500 entries/],
    [`{"headings": {"risks": ["${'x'.repeat(121)}"]}}`, /must hold 1 to 120 characters/]
  ]) assert.match(problemsOf(text).join('\n'), pattern, text.slice(0, 80));
});

test('config: JSON that is not valid, and a key named twice, are refused with the line and column', () => {
  assert.deepEqual(problemsOf('{"name": "a",}'), ['c.json: line 1, column 14: a comma before the closing brace; JSON has no trailing comma']);
  assert.match(problemsOf('{\n "rules": {},\n "rules": {}\n}')[0], /^c\.json: line 3, column 2: the name "rules" appears twice in one object/);
});

test('config: every problem of a file is listed at once, and an id such as __proto__ is refused as an id', () => {
  const p = problemsOf('{"name": "", "minSeverity": 1, "aliases": {"__proto__": ["x"]}}');
  assert.equal(p.length, 3);
  assert.equal({}.x, undefined);
  assert.throws(() => validateConfig('x'), /must be a JSON object, not a string/);
});

test('config: the keys of the file, and the small helpers', () => {
  assert.deepEqual(Object.keys(KEYS), ['name', 'angles', 'aliases', 'headings', 'words', 'verdicts', 'ignoreFiles', 'rules', 'minSeverity']);
  assert.deepEqual(Object.keys(KEYS.rules), Object.keys(DEFAULT_RULES));
  assert.equal(distance('angles', 'agnles'), 1);
  assert.equal(distance('name', 'nmae'), 1);
  assert.equal(distance('kitten', 'sitting'), 3);
  assert.equal(distance('', 'abc'), 3);
  assert.equal(kindOf(null), 'null');
  assert.equal(kindOf([]), 'a list');
  assert.equal(kindOf({}), 'an object');
  assert.equal(kindOf(1), 'a number');
});
