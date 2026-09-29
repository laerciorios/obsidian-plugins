import { moment } from 'obsidian';
import { DATES_ICON, DATES_ORDER } from '../constants';
import { t } from '../i18n';
import type { MessageKey } from '../i18n';
import type { DateKeywords, DatesConfig, Suggestion } from '../types';
import { searchField } from './text';

/** Titles are message keys, translated when the suggestions are built. */
const DAYS: { key: keyof DateKeywords; title: MessageKey; offset: number }[] = [
	{ key: 'today', title: 'day.today', offset: 0 },
	{ key: 'yesterday', title: 'day.yesterday', offset: -1 },
	{ key: 'tomorrow', title: 'day.tomorrow', offset: 1 },
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
				sourceName: t('suggest.datesSource'),
				order: DATES_ORDER,
				icon: DATES_ICON,
				title: t(day.title),
				note: date,
				haystack: keywords.map(searchField),
				insert: `[[${date}]]`,
			},
		];
	});
}
