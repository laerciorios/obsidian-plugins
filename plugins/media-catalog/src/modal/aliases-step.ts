import { ButtonComponent, Notice } from 'obsidian';
import { aliasesChanged, aliasesOf, localizedAlias, nextAliases } from '../catalog/aliases';
import { frontmatterOf, numberOf, textOf } from '../catalog/catalog-note';
import { updateAliases } from '../catalog/updates';
import { CLS } from '../constants';
import type { AliasCountry } from '../constants';
import { t } from '../i18n';
import { findLocalizedTitle } from '../providers/localized-title';
import type { CatalogNoteInfo } from '../types';
import { countryLabel } from '../ui/countries';
import { infoRow } from '../ui/form';
import { modEnterLabel, renderInstructions } from '../ui/instructions';
import { renderPreview } from '../ui/preview';
import { renderLoading } from '../ui/states';
import { isSubmitKey } from './steps';
import type { Chosen, Step, StepHost } from './steps';

/** How the lists of aliases are shown: one line, items apart (titles may hold commas). */
function listLabel(aliases: readonly string[]): string {
	return aliases.length > 0 ? aliases.join(' · ') : t('aliases.none');
}

/**
 * Last step of "Update aliases" (movies, series, games with a country set):
 * the title of the alias country for the picked result, the note's aliases
 * now and after, and "Update aliases". Series use the note's season, not a
 * picked one. A lookup that fails or finds nothing leaves the title alone,
 * as when creating; nothing the note had is dropped but repeats.
 */
export class AliasesStep implements Step {
	readonly title = t('modal.aliases.title');
	private active = true;
	private saving = false;
	/** Undefined while looking it up. */
	private localized: string | null | undefined = undefined;
	private bodyEl: HTMLElement | null = null;
	private hintEl: HTMLElement | null = null;
	private backButton: ButtonComponent | null = null;
	private submitButton: ButtonComponent | null = null;

	constructor(
		private readonly host: StepHost,
		private readonly note: CatalogNoteInfo,
		private readonly chosen: Chosen,
		private readonly country: AliasCountry,
	) {}

	render(el: HTMLElement): void {
		const { result, provider } = this.chosen;
		renderPreview(el, result, provider.name, null, { cover: result.thumbUrl ?? result.coverUrl ?? null });
		this.bodyEl = el.createDiv({ cls: CLS.form });
		this.hintEl = el.createDiv({ cls: CLS.hint });

		const actions = el.createDiv({ cls: ['modal-button-container', CLS.actions] });
		this.backButton = new ButtonComponent(actions).setButtonText(t('modal.back')).onClick(() => this.host.back());
		this.submitButton = new ButtonComponent(actions).setCta().onClick(() => void this.submit());
		renderInstructions(el, [
			{ command: modEnterLabel(), purpose: t('modal.instructions.submit') },
			{ command: 'esc', purpose: t('modal.instructions.close') },
		]);
		this.paint();
		void this.load();
	}

	/** "Update aliases" when it can be pressed, else Back. */
	focus(): void {
		if (this.canSubmit()) this.submitButton?.buttonEl.focus();
		else this.backButton?.buttonEl.focus();
	}

	onKey(evt: KeyboardEvent): boolean {
		if (!isSubmitKey(evt)) return false;
		void this.submit();
		return true;
	}

	destroy(): void {
		this.active = false;
	}

	private async load(): Promise<void> {
		const { result, provider } = this.chosen;
		const localized = await findLocalizedTitle(provider, result, this.country);
		if (!this.active) return;
		this.localized = localized;
		this.paint();
		this.focus();
	}

	private frontmatter(): Record<string, unknown> {
		return frontmatterOf(this.host.context.app, this.note.file) ?? {};
	}

	/** Aliases the note will have, or null while looking up the title. */
	private next(): string[] | null {
		return this.localized === undefined ? null : nextAliases(this.frontmatter(), this.note.kind, this.localized);
	}

	private paint(): void {
		const body = this.bodyEl;
		if (body) {
			body.empty();
			if (this.localized === undefined) {
				renderLoading(body, t('aliases.loading', { country: countryLabel(this.country) }));
			} else {
				const frontmatter = this.frontmatter();
				const { kind } = this.note;
				const title = textOf(frontmatter.title) ?? '';
				const season = kind === 'series' ? numberOf(frontmatter.season) : null;
				const alias = localizedAlias(kind, this.localized, season, title);
				const found = alias ?? t(this.localized === null ? 'aliases.notFound' : 'aliases.sameAsTitle');
				infoRow(body, { name: t('aliases.localized'), desc: countryLabel(this.country) }, found);
				infoRow(body, { name: t('aliases.current') }, listLabel(aliasesOf(frontmatter.aliases)));
				infoRow(body, { name: t('aliases.next') }, listLabel(this.next() ?? []));
			}
		}
		const hint = this.hintEl;
		if (hint) hint.setText(t(this.isUnchanged() ? 'aliases.unchanged' : 'aliases.hint'));
		this.updateButton();
	}

	private isUnchanged(): boolean {
		const next = this.next();
		return next !== null && !aliasesChanged(this.frontmatter().aliases, next);
	}

	private canSubmit(): boolean {
		return !this.saving && this.next() !== null && !this.isUnchanged();
	}

	private updateButton(): void {
		this.submitButton?.setDisabled(!this.canSubmit()).setButtonText(t(this.saving ? 'confirm.saving' : 'aliases.update'));
	}

	private async submit(): Promise<void> {
		const localized = this.localized;
		if (localized === undefined || !this.canSubmit()) return;
		const { app } = this.host.context;
		const { file, kind, title } = this.note;
		this.saving = true;
		this.updateButton();
		try {
			const changed = await updateAliases(app, file, kind, localized);
			new Notice(t(changed ? 'notice.aliasesUpdated' : 'notice.aliasesUnchanged', { name: title }));
		} catch (error) {
			console.error('Media Catalog: could not update the aliases', error);
			new Notice(t('notice.aliasesFailed', { name: title }));
			this.saving = false;
			this.updateButton();
			return;
		}
		if (this.active) this.host.close();
	}
}
