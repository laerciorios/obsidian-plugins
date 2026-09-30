import { locale, t } from '../i18n';
import { wholeMinutes } from '../estimate';
import type { Estimate, ReadingTimeSettings } from '../types';
import { FORMATTERS } from './duration';
import { renderTemplate } from './template';
import type { Variable } from './template';

type DisplaySettings = Pick<ReadingTimeSettings, 'format' | 'suffix' | 'template' | 'wordsPerMinute' | 'code'>;

export function formatNumber(value: number): string {
	return value.toLocaleString(locale());
}

export function variables(estimate: Estimate, settings: DisplaySettings): Record<Variable, string> {
	const { seconds } = estimate;
	return {
		minutes: String(wholeMinutes(estimate)),
		compact: FORMATTERS.compact(seconds),
		simple: FORMATTERS.simple(seconds),
		verbose: FORMATTERS.verbose(seconds),
		clock: FORMATTERS.clock(seconds),
		words: formatNumber(estimate.words + estimate.codeWords),
		wpm: String(settings.wordsPerMinute),
	};
}

/** The text shown for an estimate: "4m 12s read", or the custom template. */
export function displayText(estimate: Estimate, settings: DisplaySettings): string {
	if (settings.format === 'custom') return renderTemplate(settings.template, variables(estimate, settings)).trim();
	const time = FORMATTERS[settings.format](estimate.seconds);
	const suffix = settings.suffix.trim();
	return suffix ? `${time} ${suffix}` : time;
}

/** "840 words at 200 wpm · 120 code words at 100 wpm". */
export function details(estimate: Estimate, settings: DisplaySettings): string {
	const lines = [
		t(estimate.words === 1 ? 'details.words.one' : 'details.words.other', {
			count: formatNumber(estimate.words),
			wpm: settings.wordsPerMinute,
		}),
	];
	if (estimate.codeWords > 0) {
		lines.push(
			t(estimate.codeWords === 1 ? 'details.code.one' : 'details.code.other', {
				count: formatNumber(estimate.codeWords),
				wpm: settings.code.wordsPerMinute,
			}),
		);
	}
	if (estimate.ignoredCodeWords > 0) {
		lines.push(
			t(estimate.ignoredCodeWords === 1 ? 'details.ignored.one' : 'details.ignored.other', {
				count: formatNumber(estimate.ignoredCodeWords),
			}),
		);
	}
	return lines.join(' · ');
}
