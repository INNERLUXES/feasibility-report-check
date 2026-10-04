import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RULES } from '../src/index.js';
import { SECTIONS, columnIn, findingsOf, lineOf, md, report, reportOf, rulesOf } from './helpers.js';

// Every rule, written inline with a report small enough to work out by hand, with a near miss on each side. The
// complete report of SECTIONS passes every check; each test changes one part of it.

test('baseline: the complete inline report passes with no finding', () => {
  const r = reportOf(report());
  assert.deepEqual(rulesOf(r), []);
  assert.equal(r.result.pass, true);
  assert.equal(r.result.text, 'PASS - no error');
  assert.equal(r.reports[0].verdict.verdict, 'go');
  assert.equal(RULES.length, 15);
});

// The verdict.

test('verdict: the first line under a Verdict heading gives go, go with changes or stop, in any of their phrases', () => {
  for (const [line, verdict] of [
    ['Go.', 'go'],
    ['Go with changes, because the vendor terms are not signed.', 'change'],
    ['Stop. The vendor cannot meet the load.', 'stop'],
    ['No-go: the vendor cannot meet the load.', 'stop'],
    ['Proceed with changes.', 'change'],
    ['Do not proceed.', 'stop'],
    ["Don't proceed until the terms are signed.", 'stop'],
    ['- **Go with changes** - see the legal section', 'change'],
    ['GO AHEAD', 'go']
  ]) {
    const r = reportOf(report({ verdict: md('## Verdict', '', line) }));
    assert.deepEqual(rulesOf(r), [], line);
    assert.equal(r.reports[0].verdict.verdict, verdict, line);
  }
});

test('verdict: a Recommendation heading, a heading with the verdict after a colon, and a verdict in bold in the first paragraph', () => {
  assert.equal(reportOf(report({ verdict: md('## Recommendation', '', 'Stop.') })).reports[0].verdict.verdict, 'stop');
  assert.equal(reportOf(report({ verdict: md('## 2. Overall recommendation', '', 'Go with conditions.') })).reports[0].verdict.verdict, 'change');
  assert.equal(reportOf(report({ verdict: md('## Verdict: go with changes') })).reports[0].verdict.verdict, 'change');
  const bold = reportOf(report({ verdict: md('## Recommendation', '', 'We looked at three options and recommend', '**stop** until the budget is agreed.') }));
  assert.deepEqual(rulesOf(bold), []);
  assert.equal(bold.reports[0].verdict.verdict, 'stop');
});

test('verdict: a labelled line anywhere counts: in the front matter, in a list item, in bold, and in a table row', () => {
  const none = { verdict: null };
  assert.equal(reportOf(`---\nverdict: stop\n---\n${report(none)}`).reports[0].verdict.verdict, 'stop');
  assert.equal(reportOf(report(none, md('', '- **Verdict:** go with changes'))).reports[0].verdict.verdict, 'change');
  assert.equal(reportOf(report(none, md('', '| Field | Value |', '| --- | --- |', '| Verdict | Stop |'))).reports[0].verdict.verdict, 'stop');
  assert.equal(reportOf(report(none, md('', 'Go/no-go: go'))).reports[0].verdict.verdict, 'go');
  assert.equal(reportOf(report(none, md('', 'Recommendation: go'))).reports[0].verdict.verdict, 'go');
});

test('missing-verdict: a report with no verdict heading and no verdict line, with the near misses that are not verdicts', () => {
  const r = reportOf(report({ verdict: null }));
  assert.deepEqual(rulesOf(r), ['missing-verdict']);
  const f = findingsOf(r, 'missing-verdict')[0];
  assert.deepEqual([f.level, f.file, f.line, f.at], ['error', null, null, 'report.md']);
  assert.match(f.found, /^no verdict: no heading or line named "verdict" or "recommendation" gives "go", "go with changes" or "stop"$/);
  // A Conclusion heading is not a verdict heading, and a "Recommendation:" line that gives advice is not a verdict.
  assert.deepEqual(rulesOf(reportOf(report({ verdict: md('## Conclusion', '', 'Go.') }))), ['missing-verdict']);
  assert.deepEqual(rulesOf(reportOf(report({ verdict: null }, md('', 'Recommendation: run a load test first')))), ['missing-verdict']);
  // The title is never the verdict heading.
  assert.deepEqual(rulesOf(reportOf(report({ title: md('# Verdict', '', 'Go.'), verdict: null }))), ['missing-verdict']);
});

test('unknown-verdict: a verdict heading or a verdict line that does not give one of the three verdicts', () => {
  const text = report({ verdict: md('## Verdict', '', 'We think it can work.') });
  const r = reportOf(text);
  assert.deepEqual(rulesOf(r), ['unknown-verdict']);
  const f = r.findings[0];
  assert.equal(f.line, lineOf(text, 'We think'));
  assert.equal(f.column, 1);
  assert.match(f.found, /^the verdict "We think it can work" is not "go", "go with changes" or "stop"; start the line with one of them, or write it in bold$/);
  assert.deepEqual(rulesOf(reportOf(report({ verdict: null }, md('', 'Verdict: maybe later')))), ['unknown-verdict']);
  assert.deepEqual(rulesOf(reportOf(report({ verdict: md('## Verdict', '', 'Going ahead looks likely.') }))), ['unknown-verdict'], '"going" is not "go"');
  const empty = report({ verdict: md('## Verdict', '') });
  const e = reportOf(empty).findings[0];
  assert.equal(e.rule, 'unknown-verdict');
  assert.equal(e.line, lineOf(empty, '## Verdict'));
  assert.match(e.found, /the heading "Verdict" holds no verdict/);
  // A clear verdict next to a verdict line that says nothing: both are reported, the second as unknown.
  assert.deepEqual(rulesOf(reportOf(report({}, md('', 'Final verdict: TBD')))), ['unknown-verdict']);
});

test('conflicting-verdict: two verdicts that differ, found where the second one is; the same verdict twice is fine', () => {
  const text = report({}, md('', 'Overall verdict: stop'));
  const r = reportOf(text);
  assert.deepEqual(rulesOf(r), ['conflicting-verdict']);
  assert.equal(r.findings[0].line, lineOf(text, 'Overall verdict'));
  assert.match(r.findings[0].found, /^the report gives 2 different verdicts: go on line \d+ and stop here$/);
  assert.equal(r.reports[0].verdict.verdict, 'go', 'the first verdict is the verdict of the report');
  assert.deepEqual(rulesOf(reportOf(report({}, md('', 'Verdict: go ahead')))), []);
  assert.deepEqual(rulesOf(reportOf(report({ verdict: md('## Verdict', '', 'Proceed with changes.') }, md('', 'Verdict: go with changes')))), []);
});

// The angles.

test('missing-angle: an angle that no heading names, with its aliases, numbered and setext headings, and whole words only', () => {
  const r = reportOf(report({ legal: null }));
  assert.deepEqual(rulesOf(r), ['missing-angle']);
  assert.equal(r.findings[0].found, 'no section for the legal angle: no heading names "legal", "compliance", "regulatory" or "regulation"');
  assert.equal(r.findings[0].at, 'report.md');
  for (const heading of ['## Compliance', '## Regulatory review', '## 4.2 Legal and compliance', 'Legal feasibility\n-----------------', '### B) Legal']) {
    assert.deepEqual(rulesOf(reportOf(report({ legal: md(heading, '', 'Rating: at risk') }))), [], heading);
  }
  assert.deepEqual(rulesOf(reportOf(report({ legal: md('## Legality', '', 'Rating: at risk') }))), ['missing-angle'], 'a word that only starts with an alias does not name the angle');
  assert.deepEqual(rulesOf(reportOf(report({ title: md('# Legal feasibility of a booking service'), legal: null }))), ['missing-angle'], 'the title is not a section');
});

test('angles: of several headings that name an angle, the one that says feasibility wins, then the highest level, then the first', () => {
  const approach = reportOf(report({ technical: md('## Technical approach', '', 'We use the vendor interface.', '', '## Technical feasibility', '', 'Rating: feasible') }));
  assert.deepEqual(rulesOf(approach), []);
  assert.equal(approach.reports[0].angles[0].section.text, 'Technical feasibility');
  const levels = reportOf(report({ technical: md('## Technology', '', 'Rating: green', '', '### Technical notes', '', 'More text.') }));
  assert.equal(levels.reports[0].angles[0].section.text, 'Technology');
  assert.deepEqual(rulesOf(levels), []);
});

test('missing-rating: an angle section with no rating, or a rating that says nothing, found at the heading or the rating', () => {
  const text = report({ technical: md('## Technical feasibility', '', 'The vendor interface covers booking.') });
  const r = reportOf(text);
  assert.deepEqual(rulesOf(r), ['missing-rating']);
  assert.deepEqual([r.findings[0].line, r.findings[0].column], [lineOf(text, '## Technical'), columnIn(text, 'Technical feasibility')]);
  assert.match(r.findings[0].found, /^the technical section "Technical feasibility" has no rating/);
  for (const value of ['TBD', '-', '?', 'n/a', 'none']) {
    const t = report({ technical: md('## Technical feasibility', '', `Rating: ${value}`) });
    const f = reportOf(t).findings;
    assert.deepEqual(f.map((x) => x.rule), ['missing-rating'], value);
    assert.equal(f[0].line, lineOf(t, 'Rating: '));
    assert.match(f[0].found, /which says nothing/);
  }
  // A rating written in an HTML comment or in a code block is not read.
  assert.deepEqual(rulesOf(reportOf(report({ technical: md('## Technical feasibility', '', '<!-- Rating: feasible -->') }))), ['missing-rating']);
  assert.deepEqual(rulesOf(reportOf(report({ technical: md('## Technical feasibility', '', '```', 'Rating: feasible', '```') }))), ['missing-rating']);
});

test('ratings: from the heading, a labelled line in bold, a table column in the section, and a rating table elsewhere', () => {
  for (const technical of [
    md('## Technical feasibility: green'),
    md('## Technical feasibility (amber)'),
    md('## Technical feasibility', '', '**RAG status:** Red'),
    md('## Technical feasibility', '', '- Assessment: partly feasible'),
    md('## Technical feasibility', '', '| Part | Rating |', '| --- | --- |', '| Interface | High |'),
    md('## Technical feasibility', '', '| Field | Value |', '| --- | --- |', '| Score | Medium |'),
    md('## Technical feasibility', '', 'Feasibility: not feasible')
  ]) assert.deepEqual(rulesOf(reportOf(report({ technical }))), [], technical);
  const table = md('## Summary', '', '| Angle | Rating |', '| :--- | :---: |', '| Technical feasibility | Feasible |');
  const elsewhere = reportOf(report({ technical: md('## Technical feasibility', '', 'No rating here.') }, table));
  assert.deepEqual(rulesOf(elsewhere), []);
  assert.equal(elsewhere.reports[0].angles[0].rating.value, 'Feasible');
  const debt = md('## Summary', '', '| Angle | Rating |', '| --- | --- |', '| Technical debt | Low |');
  assert.deepEqual(rulesOf(reportOf(report({ technical: md('## Technical feasibility', '', 'No rating here.') }, debt))), ['missing-rating'], 'a row about technical debt does not rate the technical angle');
  assert.deepEqual(rulesOf(reportOf(report({ technical: md('## Technical feasibility: the vendor interface') }))), ['missing-rating'], 'a heading suffix that is not a rating is not read as one');
});

test('unknown-rating: a rating that is there but is not a rating word is a warning, not a missing rating', () => {
  const text = report({ operational: md('## Operational feasibility', '', 'Rating: probably fine') });
  const r = reportOf(text);
  assert.deepEqual(rulesOf(r), ['unknown-rating']);
  assert.equal(r.findings[0].level, 'warning');
  assert.equal(r.findings[0].line, lineOf(text, 'Rating: probably'));
  assert.match(r.findings[0].found, /^the rating "probably fine" of the operational angle is not one of "feasible", "not feasible"/);
  assert.equal(r.result.pass, true);
  assert.equal(r.reports[0].angles[2].unread.value, 'probably fine');
  assert.deepEqual(rulesOf(reportOf(report({ operational: md('## Operational feasibility', '', 'Rating: amber, with two depots to train') }))), []);
});

// Risks.

test('missing-risks: no risks heading, or a risks section that lists nothing, near misses included', () => {
  const r = reportOf(report({ risks: null }));
  assert.deepEqual(rulesOf(r), ['missing-risks']);
  assert.equal(r.findings[0].found, 'no risks section: no heading names "risk" or "risks"');
  const prose = report({ risks: md('## Risks', '', 'There are a few risks, mostly about the vendor.') });
  const p = reportOf(prose);
  assert.deepEqual(rulesOf(p), ['missing-risks']);
  assert.equal(p.findings[0].line, lineOf(prose, '## Risks'));
  assert.match(p.findings[0].found, /lists no risk; write each risk as a list item, a table row or a subheading/);
  assert.deepEqual(rulesOf(reportOf(report({ risks: md('## Risk register', '', '- Vendor delay. Accept. Owner: PM') }))), []);
  assert.deepEqual(rulesOf(reportOf(report({ risks: md('## Riskiest parts', '', '- Vendor delay. Accept. Owner: PM') }))), ['missing-risks'], '"riskiest" is not "risk"');
});

test('risk-without-response and risk-without-owner: list items, each found at its own line and column', () => {
  const text = report({ risks: md('## Risks', '', '- The vendor may be late.', '- Staff may skip a restock. Owner: TBD', '* Prices may rise. Mitigate by a fixed price. Owner: finance lead') });
  const r = reportOf(text);
  assert.deepEqual(rulesOf(r), ['risk-without-response', 'risk-without-owner', 'risk-without-response', 'risk-without-owner']);
  assert.deepEqual([r.findings[0].line, r.findings[0].column], [lineOf(text, '- The vendor'), columnIn(text, 'The vendor may')]);
  assert.match(r.findings[0].found, /^the risk "The vendor may be late" has no response: none of "accept", "reduce", "mitigate", "avoid", "transfer" or "design around"$/);
  assert.match(r.findings[1].found, /^the risk "The vendor may be late" has no owner, such as "Owner: <a name or a role>"$/);
  assert.match(r.findings[3].found, /is "TBD", which names no one$/);
  assert.deepEqual(r.reports[0].risks, { sections: [{ text: 'Risks', file: 'report.md', line: lineOf(text, '## Risks') }], items: 3, withoutResponse: 2, withoutOwner: 2 });
});

test('risks: the response in any form of its word, and the near misses that are not a response', () => {
  for (const response of ['Mitigated by a cache', 'Mitigation: a cache', 'Reducing it with a cache', 'Avoidance: no vendor', 'Transferred to the vendor', 'Designed around with a queue', 'Accepted for now', 'We accept it']) {
    assert.deepEqual(rulesOf(reportOf(report({ risks: md('## Risks', '', `- The vendor may be late. ${response}. Owner: PM`) }))), [], response);
  }
  for (const near of ['This is avoidable', 'Transferable later', 'Reductive view']) {
    assert.deepEqual(rulesOf(reportOf(report({ risks: md('## Risks', '', `- The vendor may be late. ${near}. Owner: PM`) }))), ['risk-without-response'], near);
  }
});

test('risks: a table with Response and Owner columns, empty and placeholder owners, and nested items that belong to a risk', () => {
  const table = md('## Risks', '', '| Risk | Response | Owner |', '| --- | --- | --- |', '| Vendor late | Accept | PM |', '| Staff skip restock | Watch it | |', '| Prices rise | Reduce: fix the price | none |');
  const r = reportOf(report({ risks: table }));
  assert.deepEqual(rulesOf(r), ['risk-without-response', 'risk-without-owner', 'risk-without-owner']);
  assert.match(r.findings[1].found, /the owner of the risk "Staff skip restock" is "empty", which names no one/);
  assert.match(r.findings[2].found, /the owner of the risk "Prices rise" is "none"/);
  const nested = md('## Risks', '', '- The vendor may be late', '  - Response: transfer it to the vendor contract', '  - Owner: legal counsel', '- Staff may skip a restock', '  Accept, with a checklist. Owner: depot lead');
  const n = reportOf(report({ risks: nested }));
  assert.deepEqual(rulesOf(n), []);
  assert.equal(n.reports[0].risks.items, 2);
});

test('risks: subheadings are the risks when the section has no list or table; a risks section inside another counts once', () => {
  const subs = md('## Risks', '', '### Vendor lock-in', '', 'Mitigate with an exit clause. Owner: CTO', '', '### Staff turnover', '', 'Accepted.');
  const r = reportOf(report({ risks: subs }));
  assert.deepEqual(rulesOf(r), ['risk-without-owner']);
  assert.match(r.findings[0].found, /the risk "Staff turnover" has no owner/);
  const inner = md('## Risks', '', '### Technical risks', '', '- Vendor late. Accept. Owner: PM', '', '### Legal risks', '', '- Terms unsigned. Avoid: no build before signing. Owner: counsel');
  const i = reportOf(report({ risks: inner }));
  assert.deepEqual(rulesOf(i), []);
  assert.equal(i.reports[0].risks.items, 2);
  assert.equal(i.reports[0].risks.sections.length, 1);
});

// Assumptions.

test('missing-assumptions: no assumptions heading, or a section that lists none', () => {
  assert.deepEqual(rulesOf(reportOf(report({ assumptions: null }))), ['missing-assumptions']);
  const prose = report({ assumptions: md('## Assumptions and constraints', '', 'We assume the vendor stays.') });
  const r = reportOf(prose);
  assert.deepEqual(rulesOf(r), ['missing-assumptions']);
  assert.equal(r.findings[0].line, lineOf(prose, '## Assumptions'));
});

test('untested-assumption: a status that is open, a word in brackets, a table column, and an untested word anywhere', () => {
  const text = report({ assumptions: md('## Assumptions', '', '- Customers want lockers. Status: open', '- The vendor stays. Status: Not tested', '- Restock twice a day (untested)', '- Volumes grow [open]', '- The interface is stable, which is unverified', '- Prices stay. Status: tested in a survey', '- An open question remains about colours', '- Data stays in the region. Status: validated, though unverified by finance') });
  const r = reportOf(text);
  assert.deepEqual(rulesOf(r), Array(5).fill('untested-assumption'));
  assert.deepEqual(r.findings.map((f) => f.line), ['Customers', 'The vendor stays', 'Restock', 'Volumes', 'The interface'].map((n) => lineOf(text, n)));
  assert.match(r.findings[0].found, /^the assumption "Customers want lockers. Status: open" is open; test it, or say how and when it will be tested$/);
  assert.equal(r.findings[0].level, 'warning');
  assert.equal(r.reports[0].assumptions.untested, 5);
  const table = md('## Assumptions', '', '| Assumption | Status |', '| --- | --- |', '| Customers want lockers | Open |', '| The vendor stays | Tested |');
  assert.deepEqual(rulesOf(reportOf(report({ assumptions: table }))), ['untested-assumption']);
});

// Cost and estimates.

test('missing-cost: no cost heading, a cost heading with nothing under it, and the title that is not a cost section', () => {
  const r = reportOf(report({ cost: null }));
  assert.deepEqual(rulesOf(r), ['missing-cost']);
  assert.match(r.findings[0].found, /^no cost section: no heading names "cost", "costs", "budget", "investment" or 2 more$/);
  assert.deepEqual(rulesOf(reportOf(report({ cost: md('## Budget', '', 'Build: $90,000 to $130,000') }))), []);
  const empty = report({ cost: md('## Costs', '') });
  const e = reportOf(empty);
  assert.deepEqual(rulesOf(e), ['missing-cost']);
  assert.equal(e.findings[0].line, lineOf(empty, '## Costs'));
  assert.match(e.findings[0].found, /holds no text/);
  assert.deepEqual(rulesOf(reportOf(report({ title: md('# Cost of a booking service'), cost: null }))), ['missing-cost']);
});

test('single-estimate: a cost or a time given as one number in a cost or schedule section, found at the amount', () => {
  const text = report({ cost: md('## Cost estimate', '', '- Build: $120,000', '- Support: EUR 40k each year') });
  const r = reportOf(text);
  assert.deepEqual(rulesOf(r), ['single-estimate', 'single-estimate']);
  assert.deepEqual([r.findings[0].line, r.findings[0].column], [lineOf(text, 'Build: $120'), columnIn(text, '$120,000')]);
  assert.equal(r.findings[0].found, 'the estimate "$120,000" is one number; give a range, such as a low and a high figure');
  assert.equal(r.findings[0].level, 'warning');
  assert.equal(r.findings[1].found.includes('"EUR 40k"'), true);
  const schedule = report({ schedule: md('## Schedule feasibility', '', 'Rating: feasible', '', 'The first release takes 16 weeks.') });
  assert.deepEqual(rulesOf(reportOf(schedule)), ['single-estimate']);
});

test('single-estimate: ranges in every form pass, and so does a known figure', () => {
  for (const line of ['Build: $90k-$130k', 'Build: $90,000 to $130,000', 'Build: between $90,000 and $130,000', 'Build: $110,000 +/- $20,000', 'Build: 8 to 12 person-weeks', 'Build: 90..130k USD', 'Rental is quoted at $750 a month', 'Paid so far: $5,000', 'Discovery took a fixed fee of $8,000']) {
    assert.deepEqual(rulesOf(reportOf(report({ cost: md('## Cost estimate', '', line) }))), [], line);
  }
  const table = md('## Cost estimate', '', '| Item | Low | High |', '| --- | --- | --- |', '| Build | $90,000 | $130,000 |', '| Total | $100,000 | |');
  const r = reportOf(report({ cost: table }));
  assert.deepEqual(rulesOf(r), ['single-estimate'], 'a row with one amount is one number');
  assert.equal(r.reports[0].estimates.lines, 3, 'the two rows and the line of the schedule section');
});

test('single-estimate: a labelled estimate anywhere is checked; the same amount in prose outside the cost sections is not', () => {
  assert.deepEqual(rulesOf(reportOf(report({ technical: md('## Technical feasibility', '', 'Rating: feasible', '', 'Effort: 40 person-days') }))), ['single-estimate']);
  assert.deepEqual(rulesOf(reportOf(report({ technical: md('## Technical feasibility', '', 'Rating: feasible', '', 'The spike took 40 person-days of work.') }))), []);
  assert.deepEqual(rulesOf(reportOf(report({}, md('', 'Budget: $180,000')))), ['single-estimate']);
});

// The prototype.

test('prototype-without-results: a prototype mentioned with no results or limits section, found at the first mention', () => {
  const text = report({ technical: md('## Technical feasibility', '', 'Rating: feasible', '', 'A proof-of-concept showed the flow works.') });
  const r = reportOf(text);
  assert.deepEqual(rulesOf(r), ['prototype-without-results']);
  assert.deepEqual([r.findings[0].line, r.findings[0].column], [lineOf(text, 'A proof'), columnIn(text, 'proof')]);
  assert.equal(r.findings[0].found, 'the report mentions a proof of concept but has no section for its results or limits, such as "Prototype results"');
  assert.equal(r.reports[0].prototype.phrase, 'proof of concept');
  for (const extra of [md('', '### Prototype results', '', 'It worked for 40 lockers.'), md('', '## Proof of concept', '', '### Limits', '', 'Only 40 lockers.'), md('', '## PoC findings', '', 'It worked.')]) {
    assert.deepEqual(rulesOf(reportOf(text + extra)), [], extra);
  }
  assert.deepEqual(rulesOf(reportOf(text + md('', '## Findings', '', 'It worked.'))), ['prototype-without-results'], 'findings that are not about the prototype');
  assert.deepEqual(rulesOf(reportOf(text + md('', '### Prototype results'))), ['prototype-without-results'], 'a results heading with nothing under it');
});

test('prototype: the prototyped forms count, a word that only starts like one does not, and the next steps do not count', () => {
  assert.deepEqual(rulesOf(reportOf(report({ operational: md('## Operational feasibility', '', 'Rating: amber', '', 'We prototyped the booking flow.') }))), ['prototype-without-results']);
  assert.deepEqual(rulesOf(reportOf(report({}, md('', 'A pocket guide is planned.')))), []);
  assert.deepEqual(rulesOf(reportOf(report({ next: md('## Next steps', '', '1. Build a prototype of the booking flow.') }))), []);
});

// Next steps.

test('missing-next-steps: no next steps heading, or one with nothing under it; an action plan counts', () => {
  const r = reportOf(report({ next: null }));
  assert.deepEqual(rulesOf(r), ['missing-next-steps']);
  assert.match(r.findings[0].found, /^no next steps: no heading names "next steps"/);
  assert.deepEqual(rulesOf(reportOf(report({ next: md('## Action plan', '', '- Sign the terms.') }))), []);
  const empty = report({ next: md('## Next steps') });
  const e = reportOf(empty);
  assert.deepEqual(rulesOf(e), ['missing-next-steps']);
  assert.equal(e.findings[0].line, lineOf(empty, '## Next steps'));
});

// Levels, order and the shape of the report.

test('levels: a rule set to off is not run, a level can be raised, and the minimum severity hides what is below it', () => {
  assert.deepEqual(rulesOf(reportOf(report({ cost: null }), { rules: { missingCost: 'off' } })), []);
  const raised = reportOf(report({ cost: md('## Cost', '', 'Build: $120,000') }), { rules: { singleEstimate: 'error' } });
  assert.equal(raised.findings[0].level, 'error');
  assert.equal(raised.result.pass, false);
  const hidden = reportOf(report({ cost: md('## Cost', '', 'Build: $120,000'), next: null }), null, { minSeverity: 'error' });
  assert.deepEqual(rulesOf(hidden), ['missing-next-steps']);
  assert.equal(hidden.totals.hidden, 1);
  assert.ok(hidden.notes.includes('1 finding below error is not shown'));
  const notice = reportOf(report({ cost: md('## Cost', '', 'Build: $120,000') }), { rules: { singleEstimate: 'notice' } });
  assert.equal(notice.result.text, 'PASS - no error (1 notice)');
});

test('order: errors before warnings, then the findings of the whole report, then by line', () => {
  const r = reportOf(report({ next: null, technical: md('## Technical feasibility', '', 'Rating: so-so'), risks: md('## Risks', '', '- Vendor late. Owner: PM') }));
  assert.deepEqual(rulesOf(r), ['missing-next-steps', 'risk-without-response', 'unknown-rating']);
  assert.equal(r.result.text, 'FAIL - 2 errors (and 1 warning)');
});

test('angles: the required angles come from the configuration, and an angle of its own is checked like the others', () => {
  assert.deepEqual(rulesOf(reportOf(report({ legal: null, schedule: null }), { angles: ['technical', 'financial', 'operational'] })), []);
  const security = { aliases: { security: ['security', 'privacy'] }, angles: { add: ['security'] } };
  const r = reportOf(report(), security);
  assert.deepEqual(rulesOf(r), ['missing-angle']);
  assert.equal(r.findings[0].found, 'no section for the security angle: no heading names "security" or "privacy"');
  assert.deepEqual(rulesOf(reportOf(report({}, md('', '## Privacy review', '', 'Rating: green')), security)), []);
});

test('files: a report split over files is read in order, with the title from the first file and findings in their files', () => {
  const files = {
    '01-summary.md': md('# Study', '', '## Verdict', '', 'Go.'),
    '02-angles.md': [SECTIONS.technical, SECTIONS.financial, SECTIONS.operational, SECTIONS.schedule].join('\n'),
    '03-rest.md': [SECTIONS.risks, SECTIONS.assumptions, md('## Cost', '', 'Build: $120,000'), SECTIONS.next].join('\n')
  };
  const r = reportOf(files);
  assert.deepEqual(rulesOf(r), ['missing-angle', 'single-estimate']);
  assert.equal(r.findings[0].at, 'folder');
  assert.equal(r.findings[1].file, '03-rest.md');
  assert.equal(r.findings[1].at, `03-rest.md:${lineOf(files['03-rest.md'], 'Build:')}:${columnIn(files['03-rest.md'], '$120')}`);
  assert.equal(r.reports[0].title, 'Study');
  assert.equal(r.reports.length, 1);
  const each = reportOf(files, null, { each: true });
  assert.equal(each.reports.length, 3);
  assert.deepEqual(each.reports.map((x) => x.path), ['01-summary.md', '02-angles.md', '03-rest.md']);
  assert.ok(findingsOf(each, 'missing-verdict').length === 2);
});

test('markdown: headings in code blocks and HTML comments are not sections, and a heading needs its space after the #', () => {
  assert.deepEqual(rulesOf(reportOf(report({ next: md('```', '## Next steps', '1. Sign.', '```') }))), ['missing-next-steps']);
  assert.deepEqual(rulesOf(reportOf(report({ next: md('<!--', '## Next steps', '1. Sign.', '-->') }))), ['missing-next-steps']);
  assert.deepEqual(rulesOf(reportOf(report({ next: md('##Next steps', '', '1. Sign.') }))), ['missing-next-steps']);
  assert.deepEqual(rulesOf(reportOf(report({ next: md('~~~~', '## Next steps', '~~~~', '', '## Next steps', '', '1. Sign.') }))), []);
});
