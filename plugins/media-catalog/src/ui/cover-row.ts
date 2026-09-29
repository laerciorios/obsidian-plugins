import type { DropdownComponent } from 'obsidian';
import { t } from '../i18n';
import { dropdownRow, infoRow } from './form';
import type { Row } from './form';

/** Cover row of the confirm steps: keep the image link or download a copy to the attachments. */
export function coverChoiceRow(
	parent: HTMLElement,
	download: boolean,
	onChange: (download: boolean) => void,
): Row<DropdownComponent> {
	return dropdownRow(parent, {
		name: t('field.cover.name'),
		desc: t('field.cover.desc'),
		options: [
			['url', t('field.cover.url')],
			['download', t('field.cover.download')],
		],
		value: download ? 'download' : 'url',
		onChange: (value) => onChange(value === 'download'),
	});
}

export function noCoverRow(parent: HTMLElement): void {
	infoRow(parent, { name: t('field.cover.name'), desc: t('field.cover.none') });
}
