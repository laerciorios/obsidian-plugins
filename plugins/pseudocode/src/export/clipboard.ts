import { Notice } from 'obsidian';
import { t } from '../i18n';
import { exportOptions } from '../settings/settings';
import type { PseudocodeSettings } from '../settings/settings';
import { PseudocodeError, parse } from '../syntax';
import type { Algorithm } from '../syntax';
import { toAlgorithm2e } from './latex';

/** Copy algorithms to the clipboard as algorithm2e, with a notice either way. */
export async function copyAlgorithms(algorithms: Algorithm[], settings: PseudocodeSettings): Promise<void> {
	try {
		await navigator.clipboard.writeText(toAlgorithm2e(algorithms, exportOptions(settings)));
		new Notice(t('notice.copied'));
	} catch (error) {
		console.error('Pseudocode: copy failed', error);
		new Notice(t('notice.copyFailed'));
	}
}

/** Parse a block and copy it; a block with a syntax error is not exported. */
export async function copySource(source: string, settings: PseudocodeSettings): Promise<void> {
	let algorithms: Algorithm[];
	try {
		algorithms = parse(source);
	} catch (error) {
		if (!(error instanceof PseudocodeError)) throw error;
		new Notice(t('notice.invalid'));
		return;
	}
	await copyAlgorithms(algorithms, settings);
}
