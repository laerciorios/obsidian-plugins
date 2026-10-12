import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { addToHistory, formatHours, historyHasRun, historyLine, parseHistoryLine, sameRun } from '../src/catalog/history';
import type { Run } from '../src/catalog/history';
import { replaceTracklistSection } from '../src/catalog/tracklist';

function run(fields: Partial<Run>): Run {
	return { started: null, finished: null, platform: '', hours: null, rating: null, ...fields };
}

const FRONTMATTER = '---\nkind: game\ntitle: "Semente Eterna"\nstatus: done\n---\n';

describe('history line: text', () => {
	test('every field, separated by " · "', () => {
		const line = historyLine(run({ started: '2024-11-03', finished: '2024-11-23', platform: 'Console Verde', hours: 42.7, rating: 10 }));
		assert.equal(line, '- 2024-11-03 → 2024-11-23 · Console Verde · 42,7 h · nota 10');
	});

	test('one date when the run started and finished the same day', () => {
		assert.equal(historyLine(run({ started: '2026-09-01', finished: '2026-09-01', platform: 'Cinema', rating: 6 })), '- 2026-09-01 · Cinema · nota 6');
	});

	test('empty fields are left out', () => {
		assert.equal(historyLine(run({ started: '2025-07-01', finished: '2025-07-19', rating: 7 })), '- 2025-07-01 → 2025-07-19 · nota 7');
		assert.equal(historyLine(run({ started: '2025-07-01', finished: '2025-07-19', platform: '  ' })), '- 2025-07-01 → 2025-07-19');
		assert.equal(historyLine(run({ platform: 'Cinema', rating: 6 })), '- Cinema · nota 6');
	});

	test('only the end, or only the start', () => {
		assert.equal(historyLine(run({ finished: '2025-07-19' })), '- 2025-07-19');
		assert.equal(historyLine(run({ started: '2025-07-01', platform: 'PC' })), '- 2025-07-01 → ? · PC');
	});

	test('a run without anything is never an empty line', () => {
		assert.equal(historyLine(run({})), '- data não registrada');
	});

	test('hours with a decimal comma', () => {
		assert.equal(formatHours(42.7), '42,7 h');
		assert.equal(formatHours(14.3), '14,3 h');
		assert.equal(formatHours(42), '42 h');
		assert.equal(formatHours(0.5), '0,5 h');
	});

	test('a platform on several lines stays on one', () => {
		assert.equal(historyLine(run({ finished: '2025-07-19', platform: 'Console\nVerde ' })), '- 2025-07-19 · Console Verde');
	});
});

describe('history line: parse', () => {
	test('dates, hours, rating and the other fields', () => {
		assert.deepEqual(parseHistoryLine('- 2024-11-03 → 2024-11-23 · Console Verde · 42,7 h · nota 10'), {
			started: '2024-11-03',
			finished: '2024-11-23',
			hours: 42.7,
			rating: 10,
			fields: ['Console Verde'],
		});
	});

	test('one date is the start and the end', () => {
		assert.deepEqual(parseHistoryLine('- 2026-09-01 · Cinema · nota 6 · [Letterboxd](https://example.com/r/1)'), {
			started: '2026-09-01',
			finished: '2026-09-01',
			hours: null,
			rating: 6,
			fields: ['Cinema', '[Letterboxd](https://example.com/r/1)'],
		});
	});

	test('an unknown end, and a line ending', () => {
		const entry = parseHistoryLine('- 2025-07-01 → ? · PC\n');
		assert.equal(entry?.started, '2025-07-01');
		assert.equal(entry?.finished, null);
		assert.deepEqual(entry?.fields, ['PC']);
		assert.equal(parseHistoryLine('- 2025-07-01 → 2025-07-19\r\n')?.finished, '2025-07-19');
	});

	test('optional fields such as a book edition stay as written', () => {
		assert.deepEqual(parseHistoryLine('- 2013-10-01 → 2013-10-15 · edição Folha Seca 2000')?.fields, ['edição Folha Seca 2000']);
	});

	test('a line without dates', () => {
		assert.deepEqual(parseHistoryLine('- Antes: data não registrada'), {
			started: null,
			finished: null,
			hours: null,
			rating: null,
			fields: ['Antes: data não registrada'],
		});
	});

	test('an impossible day is not a date', () => {
		assert.equal(parseHistoryLine('- 2026-02-30 · PC')?.started, null);
	});

	test('what is not a list item', () => {
		assert.equal(parseHistoryLine('## Histórico'), null);
		assert.equal(parseHistoryLine('Some text'), null);
		assert.equal(parseHistoryLine(''), null);
	});

	test('a written line reads back as its run', () => {
		const current = run({ started: '2024-11-03', finished: '2024-11-23', platform: 'Console Verde', hours: 42.7, rating: 10 });
		const entry = parseHistoryLine(historyLine(current));
		assert.ok(entry);
		assert.equal(sameRun(entry, current), true);
		assert.equal(entry.hours, 42.7);
		assert.equal(entry.rating, 10);
	});
});

describe('history line: same run', () => {
	const entry = (line: string) => {
		const parsed = parseHistoryLine(line);
		assert.ok(parsed);
		return parsed;
	};

	test('the dates decide, not the rating or the links', () => {
		const current = run({ started: '2026-09-01', finished: '2026-09-01', platform: 'Cinema', rating: 6 });
		assert.equal(sameRun(entry('- 2026-09-01 · Cinema · nota 6 · [Letterboxd](https://example.com/r/1)'), current), true);
		assert.equal(sameRun(entry('- 2026-09-01 · nota 9'), current), true);
		assert.equal(sameRun(entry('- 2025-07-19 · Cinema · nota 6'), current), false);
	});

	test('a range is not the same as one of its days', () => {
		const current = run({ started: '2024-03-24', finished: '2024-04-23' });
		assert.equal(sameRun(entry('- 2024-03-24 → 2024-04-23 · edição Folha Seca 2015 · nota 10'), current), true);
		assert.equal(sameRun(entry('- 2024-04-23'), current), false);
		assert.equal(sameRun(entry('- 2024-03-24'), current), false);
	});

	test('only the end known: a line with that day', () => {
		assert.equal(sameRun(entry('- 2025-07-19 · nota 7'), run({ finished: '2025-07-19' })), true);
	});

	test('a run without dates matches only its own text', () => {
		const undated = run({ platform: 'Cinema', rating: 6 });
		assert.equal(sameRun(entry('- Cinema · nota 6'), undated), true);
		assert.equal(sameRun(entry('- Antes: data não registrada'), undated), false);
		assert.equal(sameRun(entry('- 2026-09-01 · Cinema · nota 6'), undated), false);
	});
});

describe('## Histórico in a note', () => {
	const current = run({ started: '2026-03-05', finished: '2026-04-18', platform: 'PC', hours: 42, rating: 9 });

	test('created right before ## Impressões', () => {
		const note = `${FRONTMATTER}## Impressões\n\nCada semente muda o mapa.\n`;
		assert.equal(
			addToHistory(note, current),
			`${FRONTMATTER}## Histórico\n- 2026-03-05 → 2026-04-18 · PC · 42 h · nota 9\n\n## Impressões\n\nCada semente muda o mapa.\n`,
		);
	});

	test('created after the tracklist of an album, still right before ## Impressões', () => {
		const note = `${FRONTMATTER}## Faixas\n\n1. Orvalho — 3:12\n\n## Impressões\n`;
		assert.equal(
			addToHistory(note, current),
			`${FRONTMATTER}## Faixas\n\n1. Orvalho — 3:12\n\n## Histórico\n- 2026-03-05 → 2026-04-18 · PC · 42 h · nota 9\n\n## Impressões\n`,
		);
	});

	test('created at the end of a note without ## Impressões', () => {
		assert.equal(
			addToHistory(`${FRONTMATTER}Notas soltas.\n`, current),
			`${FRONTMATTER}Notas soltas.\n\n## Histórico\n- 2026-03-05 → 2026-04-18 · PC · 42 h · nota 9\n`,
		);
		assert.equal(addToHistory(FRONTMATTER, current), `${FRONTMATTER}## Histórico\n- 2026-03-05 → 2026-04-18 · PC · 42 h · nota 9\n`);
	});

	test('first in an existing section; the other lines stay byte for byte', () => {
		const history =
			'## Histórico\n- 2024-01-02 → 2024-02-10 · Console Verde · 30,5 h · nota 8 · [Análise](https://example.com/a)\n- Antes: data não registrada\n\n';
		const note = `${FRONTMATTER}${history}## Impressões\nTexto.\n`;
		assert.equal(
			addToHistory(note, current),
			`${FRONTMATTER}## Histórico\n- 2026-03-05 → 2026-04-18 · PC · 42 h · nota 9\n- 2024-01-02 → 2024-02-10 · Console Verde · 30,5 h · nota 8 · [Análise](https://example.com/a)\n- Antes: data não registrada\n\n## Impressões\nTexto.\n`,
		);
	});

	test('nothing changes when the section already lists the run', () => {
		const note = `${FRONTMATTER}## Histórico\n- 2026-03-05 → 2026-04-18 · PC · 42 h · nota 10 · [Análise](https://example.com/a)\n- Antes: data não registrada\n\n## Impressões\n`;
		assert.equal(addToHistory(note, current), note);
		assert.equal(historyHasRun(note, current), true);
		assert.equal(historyHasRun(note, run({ started: '2026-03-05', finished: '2026-04-19' })), false);
	});

	test('a run in another section does not count', () => {
		const note = `${FRONTMATTER}## Impressões\n- 2026-03-05 → 2026-04-18 · PC\n`;
		assert.equal(historyHasRun(note, current), false);
	});

	test('a blank line after the heading is kept', () => {
		const note = `${FRONTMATTER}## Histórico\n\n- 2024-01-02 · PC\n\n## Impressões\n`;
		assert.equal(addToHistory(note, current), `${FRONTMATTER}## Histórico\n\n- 2026-03-05 → 2026-04-18 · PC · 42 h · nota 9\n- 2024-01-02 · PC\n\n## Impressões\n`);
	});

	test('an empty section gets its first line', () => {
		assert.equal(
			addToHistory(`${FRONTMATTER}## Histórico\n\n## Impressões\n`, current),
			`${FRONTMATTER}## Histórico\n- 2026-03-05 → 2026-04-18 · PC · 42 h · nota 9\n\n## Impressões\n`,
		);
		assert.equal(addToHistory(`${FRONTMATTER}## Histórico`, current), `${FRONTMATTER}## Histórico\n- 2026-03-05 → 2026-04-18 · PC · 42 h · nota 9\n`);
		assert.equal(
			addToHistory(`${FRONTMATTER}## Histórico\nTexto solto.\n`, current),
			`${FRONTMATTER}## Histórico\n- 2026-03-05 → 2026-04-18 · PC · 42 h · nota 9\n\nTexto solto.\n`,
		);
	});

	test('a heading inside a code block is not the section', () => {
		const note = `${FRONTMATTER}\`\`\`\n## Histórico\n\`\`\`\n\n## Impressões\n`;
		assert.equal(
			addToHistory(note, current),
			`${FRONTMATTER}\`\`\`\n## Histórico\n\`\`\`\n\n## Histórico\n- 2026-03-05 → 2026-04-18 · PC · 42 h · nota 9\n\n## Impressões\n`,
		);
	});

	test('CRLF notes keep CRLF', () => {
		const note = '---\r\nkind: movie\r\n---\r\n## Impressões\r\nTexto.\r\n';
		assert.equal(addToHistory(note, run({ finished: '2026-08-02' })), '---\r\nkind: movie\r\n---\r\n## Histórico\r\n- 2026-08-02\r\n\r\n## Impressões\r\nTexto.\r\n');
	});
});

describe('tracklist next to the history', () => {
	test('a new tracklist goes before ## Histórico, which stays right before ## Impressões', () => {
		const note = `${FRONTMATTER}## Histórico\n- 2024-01-02 · Vinil\n\n## Impressões\n`;
		assert.equal(
			replaceTracklistSection(note, '## Tracks\n\n1. Orvalho — 3:12'),
			`${FRONTMATTER}## Tracks\n\n1. Orvalho — 3:12\n\n## Histórico\n- 2024-01-02 · Vinil\n\n## Impressões\n`,
		);
	});

	test('without a history, before ## Impressões as before', () => {
		assert.equal(
			replaceTracklistSection(`${FRONTMATTER}## Impressões\n`, '## Tracks\n\n1. Orvalho — 3:12'),
			`${FRONTMATTER}## Tracks\n\n1. Orvalho — 3:12\n\n## Impressões\n`,
		);
	});
});
