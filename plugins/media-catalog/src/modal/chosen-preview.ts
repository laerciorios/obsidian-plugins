import { t } from '../i18n';
import { renderPosterChoice } from '../ui/poster-choice';
import { renderPreview } from '../ui/preview';
import { coverOptionsOf, coverUrlOf } from './confirm-values';
import type { ConfirmInput } from './confirm-values';

export interface ChosenPreviewOptions {
	/** Cover mode: draws the note's current cover before the new one. */
	current?: (el: HTMLElement) => void;
	/** Another poster was picked: its URL is now the cover of the note. */
	onCover(url: string): void;
}

/**
 * Large preview of the chosen item (both confirm steps). For a season whose
 * poster differs from the show's, the two posters are offered below the
 * details, the season's pressed; picking one swaps the large cover.
 */
export function renderChosenPreview(el: HTMLElement, input: ConfirmInput, options: ChosenPreviewOptions): void {
	const posters = coverOptionsOf(input);
	const preview = renderPreview(el, input.result, input.provider.name, input.season, {
		cover: coverUrlOf(input),
		current: options.current,
	});
	if (posters.length < 2) return;
	const choices = posters.map((poster) => ({ label: t(poster.label), thumbUrl: poster.thumbUrl }));
	renderPosterChoice(preview.body, choices, 0, (index) => {
		const poster = posters[index];
		if (!poster) return;
		preview.setCover(poster.url);
		options.onCover(poster.url);
	});
}
