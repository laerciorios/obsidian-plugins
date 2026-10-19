import type { Setting } from 'obsidian';
import { t } from '../i18n';
import type { EstimateOutcome } from '../providers/hltb';
import type { HltbMeasure } from '../types';
import { checkNumber } from './confirm-values';
import type { TextFields } from './text-fields';

/** Looks up the estimated hours of the game as the form has it now (title, year). Never rejects. */
export type EstimateLookup = (title: string, year: number | null) => Promise<EstimateOutcome>;

/** Label of a measure; "off" shows Main + Extra, the default (the field still takes hours typed by hand). */
function measureLabel(measure: HltbMeasure): string {
	return t(`hltb.measure.${measure === 'off' ? 'main-extra' : measure}`);
}

/** The status line under the field once HowLongToBeat answered. */
export function outcomeText(outcome: EstimateOutcome, measure: HltbMeasure): string {
	switch (outcome.status) {
		case 'found':
			return t('hltb.found', { name: outcome.game.name, year: outcome.game.year ?? '?' });
		case 'no-time':
			return t('hltb.noTime', { name: outcome.game.name, measure: measureLabel(measure) });
		case 'none':
			return t('hltb.none');
		case 'ambiguous':
			return t('hltb.ambiguous');
		case 'failed':
			return t('hltb.failed');
	}
}

/**
 * **Estimated time** of backlog games: an editable number, filled from
 * HowLongToBeat the first time the form shows it (the lookup starts then,
 * not when the step opens, so catalog games never ask). The answer fills
 * the field unless something was typed meanwhile; any outcome leaves it
 * editable, with one line saying what happened. Never blocks saving.
 */
export class EstimateField {
	private setting: Setting | null = null;
	private started = false;
	private edited = false;
	private active = true;

	constructor(
		private readonly fields: TextFields,
		private readonly measure: HltbMeasure,
		/** Null when the setting is off: the field is filled by hand only. */
		private readonly lookup: EstimateLookup | null,
	) {}

	render(el: HTMLElement): Setting {
		const spec = { name: t('field.estimatedHours.name'), desc: this.desc(), type: 'number', min: 0, step: 'any' } as const;
		this.setting = this.fields.add(el, 'estimatedHours', spec, checkNumber(false), () => {
			this.edited = true;
		}).setting;
		return this.setting;
	}

	/** The field came on screen: look the game up once. */
	show(title: string, year: number | null): void {
		if (this.started || !this.lookup || !title) return;
		this.started = true;
		this.setDesc(t('hltb.loading'));
		void this.lookup(title, year).then((outcome) => {
			if (!this.active) return;
			if (outcome.status === 'found' && !this.edited) this.fields.fill('estimatedHours', String(outcome.hours));
			this.setDesc(outcomeText(outcome, this.measure));
		});
	}

	destroy(): void {
		this.active = false;
	}

	private desc(): string {
		return t('field.estimatedHours.desc', { measure: measureLabel(this.measure) });
	}

	private setDesc(status: string): void {
		this.setting?.setDesc(`${this.desc()} ${status}`);
	}
}
