import type { MediaKind } from '../types';

/** Season at the end of a series `title`: " (S01)", " (S12)". */
const SEASON_TAG = /\s*\(S\d{2,}\)$/i;

/** Season as the title writes it: 1 → "S01", 12 → "S12". */
export function seasonTag(season: number): string {
	return `S${String(season).padStart(2, '0')}`;
}

/** Series name of a `title`: "Horta Selvagem (S02)" → "Horta Selvagem". Other titles come back trimmed. */
export function seriesName(title: string): string {
	return title.trim().replace(SEASON_TAG, '');
}

/**
 * Title as the catalog compares and names it: the series name for series
 * (without the season), else the title itself, trimmed.
 */
export function bareTitle(kind: MediaKind, title: string): string {
	return kind === 'series' ? seriesName(title) : title.trim();
}

/**
 * `title` written to a new note: series with a season get it at the end,
 * "Horta Selvagem" + 2 → "Horta Selvagem (S02)" (a season already typed in the
 * title is replaced, never repeated). Other titles are written as they are.
 */
export function noteTitle(kind: MediaKind, title: string, season: number | null): string {
	const bare = bareTitle(kind, title);
	return kind === 'series' && season !== null ? `${bare} (${seasonTag(season)})` : bare;
}
