import { moment } from 'obsidian';
import { DATES_ICON, DATES_ORDER } from '../constants';
import type { DateKeywords, DatesConfig, Suggestion } from '../types';
import { searchField } from './text';

const DAYS: { key: keyof DateKeywords; title: string; offset: number }[] = [
	{ key: 'today', title: 'Hoje', offset: 0 },
	{ key: 'yesterday', title: 'Ontem', offset: -1 },
	{ key: 'tomorrow', title: 'Amanhã', offset: 1 },
];

export function formatDay(format: string, offset: number): string {
	return moment().add(offset, 'day').format(format);
}

/** One suggestion per day that still has keywords. Matched on the keywords only. */
export function dateSuggestions(config: DatesConfig, format: string): Suggestion[] {
	return DAYS.flatMap((day) => {
		const keywords = config.keywords[day.key];
		if (keywords.length === 0) return [];
		const date = formatDay(format, day.offset);
		return [
			{
				sourceName: 'Datas',
				order: DATES_ORDER,
				icon: DATES_ICON,
				title: day.title,
				note: date,
				haystack: keywords.map(searchField),
				insert: `[[${date}]]`,
			},
		];
	});
}
