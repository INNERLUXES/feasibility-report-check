import { test } from 'node:test';
import assert from 'node:assert/strict';
import { asciiLower, cleanValue, compilePhrases, excerpt, findPhrase, holdsPhrase, isEmptyValue, labelValues, normalizePhrase, startPhrase, stripComments, tokens, variants } from '../src/index.js';

// Words, phrases and labels: whole ASCII words in lowercase, never a pattern built from the input.

test('words: the words of a text are its ASCII letters and digits in lowercase, with apostrophes dropped and comments left out', () => {
  assert.deepEqual(tokens("Go/No-go: Don't proceed <!-- hidden --> 3.1"), ['go', 'no', 'go', 'dont', 'proceed', '3', '1']);
  assert.deepEqual(tokens(`it${String.fromCharCode(0x2019)}s`), ['its']);
  assert.deepEqual(tokens(''), []);
  assert.equal(asciiLower('ABC xyz'), 'abc xyz');
  assert.equal(asciiLower(String.fromCharCode(0x130)), String.fromCharCode(0x130), 'only A to Z change, whatever the locale');
  assert.equal(normalizePhrase('  Design-Around '), 'design around');
  assert.equal(stripComments('a <!-- b --> c <!-- d'), 'a  c ');
});

test('words: the forms of a word that count as the word', () => {
  for (const [word, forms] of [['mitigate', ['mitigates', 'mitigated', 'mitigating', 'mitigation']], ['reduce', ['reduces', 'reduced', 'reducing', 'reduction']], ['avoid', ['avoids', 'avoided', 'avoiding', 'avoidance']], ['transfer', ['transfers', 'transferred', 'transferring']], ['accept', ['accepts', 'accepted', 'accepting', 'acceptance']], ['prototype', ['prototypes', 'prototyped', 'prototyping']]]) {
    for (const f of forms) assert.ok(variants(word).has(f), `${word}: ${f}`);
  }
  assert.equal(variants('avoid').has('avoidable'), false);
  assert.equal(variants('poc').has('pocket'), false);
});

test('words: a phrase is found as whole words in order, inflected on its last word only when asked', () => {
  const plain = compilePhrases(['design around', 'accept']);
  assert.deepEqual(findPhrase(tokens('We will design around it'), plain), { phrase: 'design around', index: 2 });
  assert.equal(findPhrase(tokens('a designed around b'), plain), null);
  assert.equal(findPhrase(tokens('accepted'), plain), null);
  assert.deepEqual(findPhrase(tokens('accepted'), compilePhrases(['accept'], true)), { phrase: 'accept', index: 0 });
  assert.equal(startPhrase(tokens('Go with changes now'), compilePhrases(['go', 'go with changes'])), 'go with changes');
  assert.equal(startPhrase(tokens('Going'), compilePhrases(['go'])), null);
  assert.equal(holdsPhrase(tokens('Next steps and owners'), 'next steps'), true);
  assert.equal(holdsPhrase(tokens('Next big steps'), 'next steps'), false);
});

test('labels: a label as whole words followed by a colon, its value up to a semicolon or a pipe, in bold or after a list marker', () => {
  assert.deepEqual(labelValues('- **Owner:** Dana; Response: accept', ['owner', 'response']), [{ label: 'owner', value: 'Dana', column: 5 }, { label: 'response', value: 'accept', column: 20 }]);
  assert.deepEqual(labelValues('Risk owner : head of partnerships.', ['owner', 'risk owner']).map((v) => [v.label, v.value]), [['risk owner', 'head of partnerships'], ['owner', 'head of partnerships']]);
  assert.deepEqual(labelValues('Go/no-go: go', ['go no go']).map((v) => v.value), ['go']);
  assert.deepEqual(labelValues('The owners: none', ['owner']), [], 'a longer word is not the label');
  assert.deepEqual(labelValues('Co-owner: Sam', ['owner']).map((v) => v.value), ['Sam'], 'a hyphen separates words');
  assert.deepEqual(labelValues('owner Sam', ['owner']), [], 'no colon, no label');
  assert.deepEqual(labelValues('Owner:', ['owner']).map((v) => v.value), ['']);
  assert.equal(labelValues(`${'x'.repeat(5000)} Owner: Sam`, ['owner']).length, 0, 'a label past the read part of a long line is not read');
});

test('values: a value is cleaned of marks, an empty value says nothing, and an excerpt is short', () => {
  assert.equal(cleanValue(' **Feasible**, <!-- note --> '), 'Feasible');
  assert.equal(cleanValue('`Amber`.'), 'Amber');
  for (const v of ['', '-', '?', 'TBD', 'n/a', 'None', 'to do']) assert.equal(isEmptyValue(v, ['tbd', 'none', 'n a']), v !== 'to do', v);
  assert.equal(excerpt('a'.repeat(100)), `${'a'.repeat(57)}...`);
  assert.equal(excerpt('short'), 'short');
});
