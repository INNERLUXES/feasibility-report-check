// Amounts of money and of time in a line, and whether the line gives them as a range. An amount of money is a number
// with a currency sign or code ("$120,000", "EUR 40k", "90 000 pounds" is not read: digits are grouped with commas); an
// amount of time is a number with a unit from hours to years ("6 weeks", "40 person-days"). A line gives a range when
// two numbers are joined by a dash, "to" or "..", when it says "between ... and ...", when it gives a margin ("+/- 2
// weeks"), or, in a table row, when two cells hold an amount of the same kind. Only the first 2,000 characters of a line
// are read, so the patterns below stay bounded however long a line is. Every pattern is fixed: none is built from the
// configuration or from a report.

export const ESTIMATE_LIMITS = { maxLine: 2 * 1000 };

const MULTIPLIER = '(?:k|m|bn|million|thousand|billion)';
const CODES = '(?:usd|eur|gbp|aud|cad|chf)';
const MONEY = new RegExp(`(?:[$\\u00a3\\u20ac]\\s?|\\b${CODES}\\s?)\\d[\\d,]*(?:\\.\\d+)?(?:\\s?${MULTIPLIER}\\b)?|\\b\\d[\\d,]*(?:\\.\\d+)?(?:\\s?${MULTIPLIER})?\\s?(?:${CODES}|dollars|euros|pounds)\\b`, 'gi');
const TIME = /\b\d+(?:\.\d+)?\s?(?:(?:person|man|engineer|developer|team|calendar|working)[- ])?(?:hours?|days?|weeks?|months?|sprints?|quarters?|years?)\b/gi;
const RANGE = new RegExp(`\\d[\\d,.]*\\s?${MULTIPLIER}?\\s*(?:[a-z]+(?:[- ][a-z]+)?\\s*)?(?:-|\\u2013|\\u2014|\\bto\\b|\\.\\.)\\s*(?:[$\\u00a3\\u20ac]\\s?|${CODES}\\s?)?\\d`, 'i');
const BETWEEN = /\bbetween\b[^.;|]{0,80}?\d[^.;|]{0,80}?\band\b[^.;|]{0,80}?\d/i;
const MARGIN = new RegExp(`(?:\\u00b1|\\+\\/-|\\+-|\\bplus or minus\\b)\\s?[$\\u00a3\\u20ac]?\\s?\\d`, 'i');

const cut = (line) => (line.length > ESTIMATE_LIMITS.maxLine ? line.slice(0, ESTIMATE_LIMITS.maxLine) : line);

// The amounts in a line: { text, kind: 'money' | 'time', column }, by column.
export function amountsIn(line) {
  const s = cut(line);
  const out = [];
  for (const [kind, pattern] of [['money', MONEY], ['time', TIME]]) {
    pattern.lastIndex = 0;
    for (const m of s.matchAll(pattern)) out.push({ text: m[0].trim(), kind, column: m.index + 1 });
  }
  // A number read both as money and as time ("40k USD over 6 weeks" holds one of each) is kept once, as found first.
  out.sort((a, b) => a.column - b.column);
  return out.filter((a, i) => i === 0 || a.column >= out[i - 1].column + out[i - 1].text.length);
}

// True when the line gives a range.
export function hasRange(line) {
  const s = cut(line);
  return RANGE.test(s) || BETWEEN.test(s) || MARGIN.test(s);
}

// True when two cells of a table row hold an amount of the same kind: a low and a high column.
export function rangeAcrossCells(cells) {
  const kinds = cells.map((c) => new Set(amountsIn(c).map((a) => a.kind)));
  for (const kind of ['money', 'time']) if (kinds.filter((k) => k.has(kind)).length >= 2) return true;
  return false;
}

// The first amount of a line that gives an estimate as one number, or null: the line holds an amount, gives no range,
// and is not a table row with a low and a high cell.
export function singleEstimate(line, cells = null) {
  const amounts = amountsIn(line);
  if (!amounts.length || hasRange(line)) return null;
  if (cells && rangeAcrossCells(cells)) return null;
  return amounts[0];
}
