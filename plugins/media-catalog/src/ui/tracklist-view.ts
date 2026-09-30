import { formatDuration, groupByDisc, lengthOf, tracklistSummary } from '../catalog/tracklist';
import { slugify } from '../catalog/slug';
import { CLS } from '../constants';
import { t } from '../i18n';
import type { Edition, Track } from '../types';
import { tracksLabel } from './result-card';

/** "12 tracks · 53:21"; "23 tracks · 2 discs · 1:31:05"; only the count when no length is known. */
export function summaryLabel(tracks: readonly Track[]): string {
	const { count, discs, totalMs } = tracklistSummary(tracks);
	const parts = [tracksLabel(count)];
	if (discs > 1) parts.push(t('album.discs', { count: discs }));
	if (totalMs !== null) parts.push(formatDuration(totalMs));
	return parts.join(' · ');
}

/**
 * One edition in the dropdown: "1997-05-21 · JP · CD · 12 tracks", plus the
 * number of discs, the source's note ("deluxe edition") and the edition
 * title when it is not the album's. Falls back to the edition title.
 */
export function editionLabel(edition: Edition, albumTitle: string): string {
	const parts: string[] = [];
	const add = (part: string | undefined): void => {
		const trimmed = part?.trim();
		if (trimmed) parts.push(trimmed);
	};
	add(edition.date);
	add(edition.country);
	add(edition.format);
	if (edition.discCount !== undefined && edition.discCount > 1) add(t('album.discs', { count: edition.discCount }));
	if (edition.trackCount !== undefined && edition.trackCount > 0) add(tracksLabel(edition.trackCount));
	add(edition.note);
	if (slugify(edition.title) !== slugify(albumTitle)) add(edition.title);
	return parts.length > 0 ? parts.join(' · ') : edition.title;
}

/**
 * The tracklist as the note will list it: one numbered list per disc (with
 * the disc heading when there are several) and the durations. Scrolls when
 * long; focusable, so the keyboard scrolls it too.
 */
export function renderTracklistPreview(parent: HTMLElement, tracks: readonly Track[]): HTMLElement {
	const el = parent.createDiv({ cls: CLS.tracklist, attr: { role: 'region', 'aria-label': t('tracks.list'), tabindex: '0' } });
	const discs = groupByDisc(tracks);
	discs.forEach(({ tracks: list }, index) => {
		// Numbered like the note (renderTracklist): in order, from 1.
		if (discs.length > 1) el.createDiv({ cls: CLS.tracklistDisc, text: t('note.tracks.disc', { n: index + 1 }) });
		const ol = el.createEl('ol');
		for (const track of list) {
			const item = ol.createEl('li', { attr: { value: String(track.position) } });
			item.createSpan({ text: track.title.replace(/\s+/g, ' ').trim() });
			const ms = lengthOf(track);
			if (ms !== null) item.createSpan({ cls: CLS.tracklistTime, text: formatDuration(ms) });
		}
	});
	return el;
}
