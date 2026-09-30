import type { App, Setting } from 'obsidian';
import { todayIso } from '../catalog/dates';
import { listAreas } from '../catalog/reference-note';
import { RATING_MAX, RATING_MIN, STATUSES } from '../constants';
import { t } from '../i18n';
import type { CatalogDraft, CatalogSettings, Status } from '../types';
import { coverChoiceRow, noCoverRow } from '../ui/cover-row';
import { dropdownRow, infoRow, toggleRow } from '../ui/form';
import {
	PLATFORM_DESC,
	TITLE_DESC,
	checkDate,
	checkNumber,
	checkRating,
	checkTitle,
	checkYear,
	coverUrlOf,
	dateDescOf,
	hasAuthor,
	hasRating,
	initialValues,
	toNumber,
	yearDescOf,
} from './confirm-values';
import type { ConfirmInput, ConfirmValues, TextKey } from './confirm-values';
import { TextFields } from './text-fields';

let nextDatalistId = 0;

/**
 * The rows of the confirm step (create mode), one `Setting` each, with the
 * fields of the result's kind. Messages appear on blur and on submit, and
 * disappear as soon as the value is fixed.
 */
export class ConfirmForm {
	private readonly values: ConfirmValues;
	private readonly fields: TextFields;
	private status: Status;
	private download: boolean;
	private cover: string | null;
	/** `started` holds the date the form filled in (today), not one the user typed. */
	private startedAuto: boolean;
	private technical = false;
	private area = '';
	private finishedRow: Setting | null = null;
	private ratingRow: Setting | null = null;
	private areaRow: Setting | null = null;

	constructor(
		private readonly app: App,
		settings: CatalogSettings,
		private readonly input: ConfirmInput,
		/** Title, year or (albums) artist edited: what the duplicate check looks at. */
		private readonly onIdentityChange: () => void,
	) {
		this.status = settings.defaultStatus;
		this.download = settings.downloadCovers;
		this.values = initialValues(input, this.status);
		this.startedAuto = this.values.started !== '';
		this.cover = coverUrlOf(input);
		this.fields = new TextFields(this.values, (key) => this.isShown(key));
	}

	get title(): string {
		return this.values.title.trim();
	}

	/** Books and albums: the author or artist as typed, trimmed. */
	get author(): string {
		return this.values.author.trim();
	}

	/** The year as typed, or null while empty or not four digits. */
	get year(): number | null {
		const year = this.values.year.trim();
		return /^\d{4}$/.test(year) ? Number(year) : null;
	}

	/** Cover written to the note: the poster picked in the preview (for series, the season's by default). */
	get coverUrl(): string | null {
		return this.cover;
	}

	setCover(url: string): void {
		this.cover = url;
	}

	render(el: HTMLElement): void {
		const { result, season } = this.input;
		const { kind } = result;
		const fields = this.fields;
		fields.add(el, 'title', { name: t('field.title.name'), desc: t(TITLE_DESC[kind]) }, checkTitle, this.onIdentityChange);
		const year = { name: t('field.year.name'), desc: t(yearDescOf(result)), type: 'number', min: 1000, max: 9999 } as const;
		fields.add(el, 'year', year, checkYear, this.onIdentityChange);
		if (kind === 'series' && season) {
			infoRow(el, { name: t('field.season.name') }, String(season.number));
			const episodes = { name: t('field.episodes.name'), desc: t('field.episodes.desc'), type: 'number', min: 0 } as const;
			fields.add(el, 'episodes', episodes, checkNumber(true));
		}
		if (kind === 'book') {
			fields.add(el, 'author', { name: t('field.author.name') }, null);
			fields.add(el, 'pages', { name: t('field.pages.name'), type: 'number', min: 1 }, checkNumber(true));
		}
		if (kind === 'album') {
			// The artist tells two albums with one title apart (duplicates, note name).
			const artist = { name: t('field.artist.name'), desc: t('field.artist.desc') };
			fields.add(el, 'author', artist, null, this.onIdentityChange);
		}

		dropdownRow(el, {
			name: t('field.status.name'),
			options: STATUSES.map((status) => [status, t(`status.${status}`)] as const),
			value: this.status,
			onChange: (value) => this.changeStatus(value),
		});
		const started = { name: t('field.started.name'), desc: t(dateDescOf(kind, 'started')), type: 'date' } as const;
		fields.add(el, 'started', started, checkDate, () => {
			this.startedAuto = false;
		});
		const finished = { name: t('field.finished.name'), desc: t(dateDescOf(kind, 'finished')), type: 'date' } as const;
		this.finishedRow = fields.add(el, 'finished', finished, checkDate).setting;
		const rating = {
			name: t('field.rating.name'),
			desc: t('field.rating.desc'),
			type: 'number',
			min: RATING_MIN,
			max: RATING_MAX,
		} as const;
		this.ratingRow = fields.add(el, 'rating', rating, checkRating).setting;

		this.renderPlatform(el);
		if (kind === 'game') {
			const hours = {
				name: t('field.hours.name'),
				desc: t('field.hours.desc'),
				type: 'number',
				min: 0,
				step: 'any',
			} as const;
			fields.add(el, 'hours', hours, checkNumber(false));
		}
		if (kind === 'book') this.renderTechnical(el);

		if (this.coverUrl) {
			coverChoiceRow(el, this.download, (download) => {
				this.download = download;
			});
		} else {
			noCoverRow(el);
		}
		this.updateVisibility();
	}

	focus(): void {
		this.fields.focus('title');
	}

	/** Draft for the note writer, or null (with messages shown) when a field is invalid. */
	draft(): CatalogDraft | null {
		if (!this.fields.validate()) return null;
		const { result, provider, season } = this.input;
		const { kind } = result;
		const values = this.values;
		const cover = this.coverUrl;
		return {
			kind,
			title: this.title,
			year: toNumber(values.year),
			status: this.status,
			rating: this.isShown('rating') ? toNumber(values.rating) : null,
			started: values.started || null,
			finished: this.isShown('finished') ? values.finished || null : null,
			platform: values.platform.trim(),
			season: kind === 'series' ? (season?.number ?? null) : null,
			episodes: kind === 'series' && season ? toNumber(values.episodes) : null,
			hours: kind === 'game' ? toNumber(values.hours) : null,
			author: hasAuthor(kind) ? values.author.trim() : '',
			pages: kind === 'book' ? toNumber(values.pages) : null,
			referenceArea: kind === 'book' && this.technical && this.area ? this.area : null,
			cover: { url: cover, download: cover !== null && this.download },
			source: { provider: result.provider, name: provider.name, url: result.sourceUrl ?? null },
		};
	}

	/** Finished: done only. Rating: done or dropped. */
	private isShown(key: TextKey): boolean {
		if (key === 'finished') return this.status === 'done';
		if (key === 'rating') return hasRating(this.status);
		return true;
	}

	private changeStatus(value: string): void {
		const status = STATUSES.find((candidate) => candidate === value);
		if (!status) return;
		const previous = this.status;
		this.status = status;
		if (status === 'done' && !this.values.finished) this.fields.fill('finished', todayIso());
		if (status === 'backlog' && this.startedAuto) {
			// Not started yet: drop the date the form filled in (one the user typed stays).
			this.fields.fill('started', '');
			this.startedAuto = false;
		} else if (previous === 'backlog' && status !== 'backlog' && !this.values.started) {
			this.fields.fill('started', todayIso());
			this.startedAuto = true;
		}
		this.updateVisibility();
	}

	private updateVisibility(): void {
		this.finishedRow?.settingEl.toggle(this.isShown('finished'));
		this.ratingRow?.settingEl.toggle(this.isShown('rating'));
		this.areaRow?.settingEl.toggle(this.technical);
		// Hidden fields always pass: clear their messages.
		for (const key of ['finished', 'rating'] as const) {
			if (!this.isShown(key)) this.fields.check(key);
		}
	}

	/** Free text; games suggest the platforms the provider lists. */
	private renderPlatform(el: HTMLElement): void {
		const { kind, details } = this.input.result;
		const spec = { name: t('field.platform.name'), desc: t(PLATFORM_DESC[kind]) };
		const field = this.fields.add(el, 'platform', spec, null);
		const platforms = kind === 'game' ? (details?.platforms ?? []) : [];
		if (platforms.length === 0) return;
		const id = `mc-platforms-${nextDatalistId++}`;
		const list = field.setting.controlEl.createEl('datalist', { attr: { id } });
		for (const platform of platforms) list.createEl('option', { attr: { value: platform } });
		field.control.inputEl.setAttr('list', id);
	}

	/** Technical book: toggle + area dropdown; disabled when no folder holds _References/Books. */
	private renderTechnical(el: HTMLElement): void {
		const areas = listAreas(this.app);
		const { control } = toggleRow(el, {
			name: t('field.technical.name'),
			desc: t(areas.length > 0 ? 'field.technical.desc' : 'field.technical.none'),
			value: false,
			onChange: (value) => {
				this.technical = value;
				this.updateVisibility();
			},
		});
		if (areas.length === 0) {
			control.setDisabled(true);
			return;
		}
		this.area = areas[0] ?? '';
		this.areaRow = dropdownRow(el, {
			name: t('field.area.name'),
			options: areas.map((area) => [area, area] as const),
			value: this.area,
			onChange: (value) => {
				this.area = value;
			},
		}).setting;
	}
}
