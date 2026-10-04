// Words, phrases and labels. Text is compared as whole ASCII words in lowercase: every character that is not a letter A
// to Z or a digit is read as a space, an apostrophe is dropped ("don't" is "dont"), and HTML comments are left out. No
// pattern is ever built from the configuration or from a report: a phrase is a list of words, compared word by word.

export const WORD_LIMITS = { maxLabelLine: 4000 };

// The letters A to Z in lowercase, and nothing else changed, so the result never depends on the locale.
export const asciiLower = (s) => s.replace(/[A-Z]/g, (c) => String.fromCharCode(c.charCodeAt(0) + 32));

// Text with its HTML comments left out; a comment that is not closed runs to the end.
export function stripComments(text) {
  let out = '';
  let from = 0;
  for (;;) {
    const open = text.indexOf('<!--', from);
    if (open < 0) return out + text.slice(from);
    out += text.slice(from, open);
    const close = text.indexOf('-->', open + 4);
    if (close < 0) return out;
    from = close + 3;
  }
}

const APOSTROPHES = /['\u2019]/g;

// The words of a text, in lowercase.
export function tokens(text) {
  return asciiLower(stripComments(String(text))).replace(APOSTROPHES, '').split(/[^a-z0-9]+/).filter(Boolean);
}

// A phrase as the tool keeps it: its words joined by one space.
export const normalizePhrase = (phrase) => tokens(phrase).join(' ');

const SUFFIXES = ['s', 'es', 'd', 'ed', 'ing', 'ion', 'tion', 'ance', 'ment'];

// The forms of a word that count as the word: the word itself, with an ending, with a final e dropped before the
// ending, and with a doubled last consonant before -ed and -ing ("transferred").
export function variants(word) {
  const out = new Set([word]);
  const base = word.endsWith('e') ? word.slice(0, -1) : word;
  for (const s of SUFFIXES) {
    out.add(word + s);
    out.add(base + s);
  }
  const last = word.at(-1);
  if (word.length > 2 && 'bdfgklmnprtv'.includes(last)) {
    out.add(`${word}${last}ed`);
    out.add(`${word}${last}ing`);
  }
  return out;
}

// Phrases ready to be found: their words, and for an inflected phrase the forms of its last word.
export function compilePhrases(phrases, inflect = false) {
  return phrases.map((text) => {
    const words = text.split(' ');
    return { text, words, last: inflect ? variants(words.at(-1)) : new Set([words.at(-1)]) };
  });
}

function matchesAt(toks, i, p) {
  const n = p.words.length;
  if (i + n > toks.length) return false;
  for (let k = 0; k < n - 1; k += 1) if (toks[i + k] !== p.words[k]) return false;
  return p.last.has(toks[i + n - 1]);
}

// The first place where one of the phrases appears in the words: { phrase, index }, or null.
export function findPhrase(toks, compiled) {
  for (let i = 0; i < toks.length; i += 1) {
    for (const p of compiled) if (matchesAt(toks, i, p)) return { phrase: p.text, index: i };
  }
  return null;
}

// The longest of the phrases that the words start with, or null.
export function startPhrase(toks, compiled) {
  let best = null;
  for (const p of compiled) if (matchesAt(toks, 0, p) && (!best || p.words.length > best.words.length)) best = p;
  return best ? best.text : null;
}

// True when the words hold the phrase (a string of words joined by spaces) as whole words in order.
export function holdsPhrase(toks, phrase) {
  const words = phrase.split(' ');
  for (let i = 0; i + words.length <= toks.length; i += 1) {
    let k = 0;
    while (k < words.length && toks[i + k] === words[k]) k += 1;
    if (k === words.length) return true;
  }
  return false;
}

// A value as a report shows it: comments, emphasis and code marks left out, white space as one space, and a final full
// stop or comma dropped.
export function cleanValue(value) {
  return stripComments(value).replace(/[*_`~]/g, '').replace(/\s+/g, ' ').trim().replace(/[.,]+$/, '').trim();
}

// The values of the labels in a line: every place where a label stands as whole words and is followed by a colon, with
// the text after the colon up to a semicolon, a pipe or the end of the line. { label, value, column }, by column.
export function labelValues(text, labels) {
  const s = text.length > WORD_LIMITS.maxLabelLine ? text.slice(0, WORD_LIMITS.maxLabelLine) : text;
  let map = '';
  for (let i = 0; i < s.length; i += 1) {
    const c = s.charCodeAt(i);
    if ((c >= 97 && c <= 122) || (c >= 48 && c <= 57) || c === 58) map += s[i];
    else if (c >= 65 && c <= 90) map += String.fromCharCode(c + 32);
    else map += ' ';
  }
  const out = [];
  for (const label of labels) {
    let from = 0;
    for (;;) {
      const at = map.indexOf(label, from);
      if (at < 0) break;
      from = at + 1;
      if (at > 0 && map[at - 1] !== ' ') continue;
      let j = at + label.length;
      while (j < map.length && map[j] === ' ' && s[j] !== '|') j += 1;
      if (map[j] !== ':') continue;
      let end = s.length;
      for (const stop of [';', '|']) {
        const k = s.indexOf(stop, j + 1);
        if (k >= 0 && k < end) end = k;
      }
      out.push({ label, value: cleanValue(s.slice(j + 1, end)), column: at + 1 });
    }
  }
  return out.sort((a, b) => a.column - b.column || b.label.length - a.label.length);
}

// True when a value says nothing: empty, a dash or a question mark, or one of the empty values such as TBD.
export function isEmptyValue(value, emptyValues) {
  const t = tokens(value).join(' ');
  return t === '' || emptyValues.includes(t);
}

// A short piece of a text for a message: white space as one space, at most max characters.
export function excerpt(text, max = 60) {
  const t = cleanValue(text);
  return t.length > max ? `${t.slice(0, max - 3)}...` : t;
}
