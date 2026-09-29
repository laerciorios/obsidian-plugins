import { CLS } from '../constants';
import { t } from '../i18n';
import type { SearchResult, SeasonInfo } from '../types';
import { createCoverImg } from './cover-img';
import { episodesLabel } from './result-card';

export interface PreviewOptions {
	/** The cover that goes into the note. */
	cover: string | null;
	/** Cover mode: draws the note's current cover, shown before the new one with captions. */
	current?: (el: HTMLElement) => void;
}

export interface Preview {
	/** Column next to the cover(s): title, details and source. Callers may add to it. */
	body: HTMLElement;
	/** Swap the large cover (another poster was picked). */
	setCover(url: string | null): void;
}

/** One cover slot with its caption below. Returns the slot. */
function figure(parent: HTMLElement, caption: string): HTMLElement {
	const el = parent.createEl('figure', { cls: CLS.figure });
	const slot = el.createDiv({ cls: CLS.previewCover });
	el.createEl('figcaption', { cls: CLS.caption, text: caption });
	return slot;
}

/**
 * Large cover of the chosen item next to its title, year and source: the
 * cover that goes into the note, big enough to judge. In cover mode the
 * note's current cover comes first, labelled "Current" and "New".
 */
export function renderPreview(
	parent: HTMLElement,
	result: SearchResult,
	sourceName: string,
	season: SeasonInfo | null,
	options: PreviewOptions,
): Preview {
	const el = parent.createDiv({ cls: CLS.preview });
	const covers = el.createDiv({ cls: CLS.previewCovers });
	let slot: HTMLElement;
	if (options.current) {
		options.current(figure(covers, t('cover.current')));
		slot = figure(covers, t('cover.new'));
	} else {
		slot = covers.createDiv({ cls: CLS.previewCover });
	}
	const setCover = (url: string | null): void => {
		slot.empty();
		createCoverImg(slot, url ?? undefined, result.title);
	};
	setCover(options.cover);

	const body = el.createDiv({ cls: CLS.resultBody });
	body.createDiv({ cls: CLS.resultTitle, text: result.title });
	const year = season?.year ?? result.year;
	if (season) {
		body.createDiv({
			cls: CLS.resultMeta,
			text: `${t('season.label', { number: season.number })} · ${episodesLabel(season.episodes)}`,
		});
	}
	if (year !== undefined) body.createDiv({ cls: CLS.resultMeta, text: String(year) });
	if (result.subtitle) body.createDiv({ cls: CLS.resultMeta, text: result.subtitle });
	body.createDiv().createSpan({ cls: CLS.resultSource, text: sourceName });
	return { body, setCover };
}
