// The fifteen rules and the result. Each rule names the points of the public pages it rests on (src/data.js), and says
// where it is the tool's own choice; docs/method.md says exactly what each rule looks at and what it cannot see. A rule
// whose level is "off" is not run. The checks themselves are in src/analyse.js.

import { LEVELS } from './data.js';
import { VERDICT_NAMES } from './defaults.js';
import { grouped, listText, plural } from './size.js';

// A list of phrases in quotes, the last joined by "or": "a", "b" or 3 more.
const quoted = (list, max = 4) => listText(list.map((p) => `"${p}"`), max).replace(/ and (?=[^,]*$)/, ' or ');
const verdicts = () => listText(Object.values(VERDICT_NAMES)).replace(/ and /, ' or ');

export const RULES = [
  {
    id: 'missing-verdict',
    key: 'missingVerdict',
    title: 'a report with no verdict',
    basis: ['discoveryDecision'],
    own: 'the three verdicts, go, go with changes and stop, are the tool\'s own names for the decision a feasibility study ends with',
    rule: (c) => `a report in which no verdict heading (${quoted(c.headings.verdict, 2)}) and no line labelled ${quoted([...c.words.verdictLabels, ...c.words.recommendationLabels], 2)} gives ${verdicts()}`
  },
  {
    id: 'unknown-verdict',
    key: 'unknownVerdict',
    title: 'a verdict that is not go, go with changes or stop',
    basis: ['discoveryDecision'],
    own: null,
    rule: (c) => `a verdict heading whose first line, or a line labelled ${quoted(c.words.verdictLabels, 2)}, that does not start with a verdict phrase (${grouped(Object.values(c.verdicts).flat().length)} phrases) and holds none in bold`
  },
  {
    id: 'conflicting-verdict',
    key: 'conflictingVerdict',
    title: 'a report that gives two different verdicts',
    basis: ['discoveryDecision'],
    own: null,
    rule: () => 'two verdicts in one report that are not the same: go and stop, for example'
  },
  {
    id: 'missing-angle',
    key: 'missingAngle',
    title: 'a feasibility angle with no section',
    basis: ['telosAreas', 'discoveryConstraints'],
    own: null,
    rule: (c) => `an angle of the list (${c.required.join(', ') || 'none'}) that no heading other than the title names by one of its aliases`
  },
  {
    id: 'missing-rating',
    key: 'missingRating',
    title: 'an angle section with no rating',
    basis: ['telosAreas'],
    own: 'a rating is read from a labelled line, a table column or the heading itself; the rating words are the tool\'s own',
    rule: (c) => `the section of an angle with no rating: no line labelled ${quoted(c.words.ratingLabels, 3)}, no table column with such a header, and no row of a rating table anywhere in the report that names the angle, or a rating that says nothing (${quoted(c.words.emptyValues, 2)})`
  },
  {
    id: 'unknown-rating',
    key: 'unknownRating',
    title: 'a rating that is not one of the rating words',
    basis: ['telosAreas'],
    own: null,
    rule: (c) => `the section of an angle whose only ratings do not start with one of ${quoted(c.words.ratings, 6)}`
  },
  {
    id: 'missing-risks',
    key: 'missingRisks',
    title: 'a report with no risks listed',
    basis: ['orangeBookResponses'],
    own: null,
    rule: (c) => `a report with no heading that names ${quoted(c.headings.risks)}, or whose risk sections list no risk as a list item, a table row or a subheading`
  },
  {
    id: 'risk-without-response',
    key: 'riskWithoutResponse',
    title: 'a risk with no response',
    basis: ['orangeBookResponses'],
    own: 'the response words are the tool\'s own short list of the usual ways to treat a risk',
    rule: (c) => `a risk whose text holds none of ${quoted(c.words.responses, 6)}, in any form of the last word ("mitigated", "mitigation")`
  },
  {
    id: 'risk-without-owner',
    key: 'riskWithoutOwner',
    title: 'a risk with no owner',
    basis: ['orangeBookOwners'],
    own: null,
    rule: (c) => `a risk with no value for ${quoted(c.words.ownerLabels, 3)}, as a labelled line or a table column, or whose value names no one (${quoted(c.words.emptyValues, 2)})`
  },
  {
    id: 'missing-assumptions',
    key: 'missingAssumptions',
    title: 'a report with no assumptions listed',
    basis: ['discoveryAssumptions', 'alphaAssumptions'],
    own: null,
    rule: (c) => `a report with no heading that names ${quoted(c.headings.assumptions)}, or whose assumption sections list no assumption`
  },
  {
    id: 'untested-assumption',
    key: 'untestedAssumption',
    title: 'an assumption that is not tested yet',
    basis: ['alphaAssumptions'],
    own: null,
    rule: (c) => `an assumption whose status (${quoted(c.words.statusLabels, 2)}, as a labelled line, a table column or a word in brackets) starts with ${quoted(c.words.openStatuses, 4)}, or whose text holds ${quoted(c.words.openWords, 3)}`
  },
  {
    id: 'missing-cost',
    key: 'missingCost',
    title: 'a report with no cost section',
    basis: ['discoveryCost', 'greenBookRanges'],
    own: null,
    rule: (c) => `a report with no heading that names ${quoted(c.headings.cost)}, or whose cost sections hold no text`
  },
  {
    id: 'single-estimate',
    key: 'singleEstimate',
    title: 'a cost or a time given as one number',
    basis: ['greenBookRanges'],
    own: 'a line that holds a word such as "fixed" or "paid" states a known figure, not an estimate, and is not checked',
    rule: (c) => `a line in a cost or estimate section, or labelled ${quoted(c.words.estimateLabels, 3)}, that holds an amount of money or time and no range, and none of ${quoted(c.words.exact, 3)}`
  },
  {
    id: 'prototype-without-results',
    key: 'prototypeWithoutResults',
    title: 'a prototype with no results or limits',
    basis: ['alphaPrototypes'],
    own: 'a prototype mentioned in the next steps is still to be built, so those mentions do not count',
    rule: (c) => `a report that mentions ${quoted(c.words.prototype)} outside its next steps, with no heading that names ${quoted(c.headings.results, 4)} together with a prototype, in itself or in a heading above it`
  },
  {
    id: 'missing-next-steps',
    key: 'missingNextSteps',
    title: 'a report with no next steps',
    basis: ['discoveryNext'],
    own: null,
    rule: (c) => `a report with no heading that names ${quoted(c.headings.nextSteps)}, or whose next steps sections hold no text`
  }
];

export const ruleById = (id) => RULES.find((r) => r.id === id);

// True when a level is at or above another.
export const atOrAbove = (level, min) => LEVELS.indexOf(level) >= LEVELS.indexOf(min);

// The result: the run fails when a finding is at the level error. { pass, errors, byLevel, text }.
export function decide(findings) {
  const byLevel = { error: 0, warning: 0, notice: 0 };
  for (const f of findings) byLevel[f.level] += 1;
  const below = ['warning', 'notice'].filter((l) => byLevel[l]).map((l) => plural(byLevel[l], l));
  const text = byLevel.error ? `FAIL - ${plural(byLevel.error, 'error')}${below.length ? ` (and ${below.join(', ')})` : ''}` : `PASS - no error${below.length ? ` (${below.join(', ')})` : ''}`;
  return { pass: byLevel.error === 0, errors: byLevel.error, byLevel, text };
}
