import { Notice } from 'obsidian';
import { setAfter } from '../catalog/backlog';
import { frontmatterOf, numberOf } from '../catalog/catalog-note';
import { DEFAULT_HLTB_MEASURE, ESTIMATED_HOURS_KEY } from '../constants';
import { locale, t } from '../i18n';
import { lookupEstimate } from '../providers/hltb';
import type { CatalogContext, CatalogNoteInfo, HltbMeasure } from '../types';

/** Hours as the notices show them, in the app language ("33,5" in Portuguese). */
function hoursText(hours: number): string {
	return new Intl.NumberFormat([locale(), 'en'], { maximumFractionDigits: 1 }).format(hours);
}

/**
 * "Update estimated time (HowLongToBeat)" on a game note (backlog or
 * catalog): looks the title and year of the note up and writes
 * `estimated_hours`, in place or right after `platform`. Uses the measure of
 * the settings, Main + Extra when they turn the lookup off (the command was
 * asked for). Every outcome ends in a notice; nothing is written without hours.
 */
export async function updateEstimate(context: CatalogContext, note: CatalogNoteInfo): Promise<void> {
	const { app, settings } = context;
	const measure: HltbMeasure = settings.hltbMeasure === 'off' ? DEFAULT_HLTB_MEASURE : settings.hltbMeasure;
	const label = t(`hltb.measure.${measure}`);
	const name = note.title;
	const outcome = await lookupEstimate(context.hltb, note.title, note.year, measure);
	if (outcome.status === 'none') return void new Notice(t('notice.estimateNone', { name }));
	if (outcome.status === 'ambiguous') return void new Notice(t('notice.estimateAmbiguous', { name }));
	if (outcome.status === 'failed') return void new Notice(t('notice.estimateFailed'));
	if (outcome.status === 'no-time') return void new Notice(t('notice.estimateNoTime', { name, measure: label }));

	const { hours } = outcome;
	const params = { name, hours: hoursText(hours), measure: label };
	if (numberOf(frontmatterOf(app, note.file)?.[ESTIMATED_HOURS_KEY]) === hours) {
		new Notice(t('notice.estimateUnchanged', params));
		return;
	}
	try {
		await app.fileManager.processFrontMatter(note.file, (frontmatter: Record<string, unknown>) => {
			setAfter(frontmatter, ESTIMATED_HOURS_KEY, hours, 'platform');
		});
	} catch (error) {
		console.error('Media Catalog: could not update the estimated time', error);
		new Notice(t('notice.estimateWriteFailed', { name }));
		return;
	}
	new Notice(t('notice.estimateUpdated', params));
}
