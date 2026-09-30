import { CLS } from '../constants';
import { t } from '../i18n';
import type { SearchResult, SeasonInfo } from '../types';
import { createCoverImg } from './cover-img';

/**
 * Card of a search result: thumbnail, title, year, subtitle, the release line
 * of albums and the source badge. `data-kind` lets the styles shape the
 * cover (album covers are square).
 */
export function renderResultCard(el: HTMLElement, result: SearchResult, sourceName: string): void {
	el.setAttr('data-kind', result.kind);
	// The title sits next to the cover, so the image itself is decorative.
	createCoverImg(el.createDiv({ cls: CLS.cover }), result.thumbUrl ?? result.coverUrl, '');
	const body = el.createDiv({ cls: CLS.resultBody });
	const title = body.createDiv({ cls: CLS.resultTitle });
	title.createSpan({ text: result.title });
	if (result.year !== undefined) title.createSpan({ cls: CLS.resultMeta, text: String(result.year) });
	if (result.subtitle) body.createDiv({ cls: CLS.resultMeta, text: result.subtitle });
	const release = releaseLabel(result);
	if (release) body.createDiv({ cls: CLS.resultMeta, text: release });
	body.createDiv().createSpan({ cls: CLS.resultSource, text: sourceName });
}

/**
 * Albums: "Album · 12 tracks", "EP · 4 tracks", or either part alone. Null
 * when the result has neither. `tracks` (the summary of a fetched tracklist,
 * "12 tracks · 53:21") takes the place of the count the search gave.
 */
export function releaseLabel(result: SearchResult, tracks?: string): string | null {
	const albumType = result.details?.albumType;
	const count = result.details?.trackCount;
	const parts: string[] = [];
	if (albumType) parts.push(t(`album.type.${albumType}`));
	if (tracks !== undefined) parts.push(tracks);
	else if (count !== undefined && count > 0) parts.push(tracksLabel(count));
	return parts.length > 0 ? parts.join(' · ') : null;
}

/** "12 tracks", "1 track". */
export function tracksLabel(count: number): string {
	return count === 1 ? t('album.tracksOne') : t('album.tracks', { count });
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
