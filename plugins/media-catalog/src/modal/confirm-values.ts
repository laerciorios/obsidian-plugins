import { isIsoDate, todayIso } from '../catalog/dates';
import { RATING_MAX, RATING_MIN } from '../constants';
import { t } from '../i18n';
import type { MessageKey } from '../i18n';
import type { MediaKind, Provider, SearchResult, SeasonInfo, Status } from '../types';

/** What the confirm step works on: the chosen result, its provider and, for series, the season. */
export interface ConfirmInput {
	result: SearchResult;
	provider: Provider;
	season: SeasonInfo | null;
}

/** Text inputs hold strings; they are parsed into the draft on submit. */
export interface ConfirmValues {
	title: string;
	year: string;
	started: string;
	finished: string;
	rating: string;
	platform: string;
	episodes: string;
	hours: string;
	author: string;
	pages: string;
}

export type TextKey = keyof ConfirmValues;
/** Message for an invalid value, null when valid. Values arrive trimmed. */
export type Check = (value: string) => string | null;

export const YEAR_DESC: Record<MediaKind, MessageKey> = {
	movie: 'field.year.desc',
	series: 'field.year.descSeries',
	game: 'field.year.desc',
	book: 'field.year.descBook',
};

export const PLATFORM_DESC: Record<MediaKind, MessageKey> = {
	movie: 'field.platform.desc',
	series: 'field.platform.desc',
	game: 'field.platform.descGame',
	book: 'field.platform.descBook',
};

/** Year description of the form: Google Books gives the year of the edition, not of the first publication. */
export function yearDescOf(result: SearchResult): MessageKey {
	return result.kind === 'book' && result.provider === 'google-books' ? 'field.year.descBookEdition' : YEAR_DESC[result.kind];
}

/** Statuses that show and write `rating`. `finished` is for done only. */
export function hasRating(status: Status): boolean {
	return status === 'done' || status === 'dropped';
}

export const checkTitle: Check = (value) => (value ? null : t('validation.title'));
export const checkYear: Check = (value) => (!value || /^\d{4}$/.test(value) ? null : t('validation.year'));
export const checkDate: Check = (value) => (!value || isIsoDate(value) ? null : t('validation.date'));

export const checkRating: Check = (value) => {
	if (!value) return null;
	const rating = Number(value);
	return Number.isInteger(rating) && rating >= RATING_MIN && rating <= RATING_MAX ? null : t('validation.rating');
};

export function checkNumber(integer: boolean): Check {
	return (value) => {
		if (!value) return null;
		const number = Number(value);
		const valid = Number.isFinite(number) && number >= 0 && (!integer || Number.isInteger(number));
		return valid ? null : t('validation.number');
	};
}

export function toNumber(value: string): number | null {
	const trimmed = value.trim();
	return trimmed === '' ? null : Number(trimmed);
}

export function initialValues({ result, season }: ConfirmInput, status: Status): ConfirmValues {
	const today = todayIso();
	const year = season?.year ?? result.year;
	const episodes = season?.episodes ?? null;
	const pages = result.details?.pages;
	return {
		title: result.title,
		year: year === undefined ? '' : String(year),
		started: status === 'backlog' ? '' : today,
		finished: status === 'done' ? today : '',
		rating: '',
		platform: '',
		episodes: episodes === null ? '' : String(episodes),
		hours: '',
		author: result.details?.authors?.join(', ') ?? '',
		pages: pages === undefined ? '' : String(pages),
	};
}

/** Cover written to the note unless another poster is picked: the season poster for series, else the result's cover. */
export function coverUrlOf({ result, season }: ConfirmInput): string | null {
	return season?.coverUrl ?? result.coverUrl ?? null;
}

/** A poster the user may pick for the note. */
export interface CoverOption {
	url: string;
	thumbUrl: string;
	label: MessageKey;
}

/**
 * A season whose poster differs from the show's: both posters, the season's
 * first (the default, as coverUrlOf). Otherwise empty: nothing to choose.
 */
export function coverOptionsOf({ result, season }: ConfirmInput): CoverOption[] {
	const seasonUrl = season?.coverUrl;
	const showUrl = result.coverUrl;
	if (!season || !seasonUrl || !showUrl || seasonUrl === showUrl) return [];
	return [
		{ url: seasonUrl, thumbUrl: season.thumbUrl ?? seasonUrl, label: 'cover.season' },
		{ url: showUrl, thumbUrl: result.thumbUrl ?? showUrl, label: 'cover.series' },
	];
}
