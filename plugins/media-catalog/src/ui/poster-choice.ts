import { CLS } from '../constants';
import { t } from '../i18n';
import { createCoverImg } from './cover-img';

export interface PosterOption {
	label: string;
	thumbUrl: string;
}

/**
 * Small toggle buttons (thumbnail + label), one pressed at a time: which
 * poster goes into the note. Tab reaches them; Enter and Space press them.
 */
export function renderPosterChoice(
	parent: HTMLElement,
	options: readonly PosterOption[],
	selected: number,
	onChange: (index: number) => void,
): HTMLElement {
	const group = parent.createDiv({ cls: CLS.posters, attr: { role: 'group', 'aria-label': t('field.cover.name') } });
	const buttons = options.map((option, index) => {
		const button = group.createEl('button', {
			cls: CLS.poster,
			attr: { type: 'button', 'aria-pressed': String(index === selected) },
		});
		// The label says what the thumbnail is.
		createCoverImg(button.createDiv({ cls: CLS.cover }), option.thumbUrl, '');
		button.createSpan({ text: option.label });
		return button;
	});
	buttons.forEach((button, index) => {
		button.addEventListener('click', () => {
			if (button.getAttr('aria-pressed') === 'true') return;
			buttons.forEach((other, i) => other.setAttr('aria-pressed', String(i === index)));
			onChange(index);
		});
	});
	return group;
}
