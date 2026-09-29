import { CLS } from '../constants';
import { t } from '../i18n';
import type { SearchResult, SeasonInfo } from '../types';
import { createCoverImg } from './cover-img';

/** Card of a search result: thumbnail, title, year, subtitle and the source badge. */
export function renderResultCard(el: HTMLElement, result: SearchResult, sourceName: string): void {
	// The title sits next to the cover, so the image itself is decorative.
	createCoverImg(el.createDiv({ cls: CLS.cover }), result.thumbUrl ?? result.coverUrl, '');
	const body = el.createDiv({ cls: CLS.resultBody });
	const title = body.createDiv({ cls: CLS.resultTitle });
	title.createSpan({ text: result.title });
	if (result.year !== undefined) title.createSpan({ cls: CLS.resultMeta, text: String(result.year) });
	if (result.subtitle) body.createDiv({ cls: CLS.resultMeta, text: result.subtitle });
	body.createDiv().createSpan({ cls: CLS.resultSource, text: sourceName });
}

/** Poster tile of a season: poster, "Season N", episode count and year. */
export function renderSeasonTile(el: HTMLElement, season: SeasonInfo): void {
	createCoverImg(el.createDiv({ cls: CLS.cover }), season.thumbUrl ?? season.coverUrl, '');
	const body = el.createDiv({ cls: CLS.resultBody });
	body.createDiv({ cls: CLS.resultTitle, text: t('season.label', { number: season.number }) });
	body.createDiv({ cls: CLS.resultMeta, text: episodesLabel(season.episodes) });
	if (season.year !== undefined) body.createDiv({ cls: CLS.resultMeta, text: String(season.year) });
}

export function episodesLabel(count: number | null): string {
	if (count === null) return t('season.episodesUnknown');
	return count === 1 ? t('season.episodesOne') : t('season.episodes', { count });
}
