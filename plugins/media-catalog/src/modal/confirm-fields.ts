import type { App, Setting } from 'obsidian';
import { isIsoDate, todayIso } from '../catalog/dates';
import { listAreas } from '../catalog/reference-note';
import { CATALOG_STATUSES, DEFAULT_PRIORITY, DESTINATIONS, PRIORITIES, RATING_MAX, RATING_MIN } from '../constants';
import { t } from '../i18n';
import type { CatalogDraft, CatalogSettings, CatalogStatus, Destination, Priority, Track } from '../types';
import { coverChoiceRow, noCoverRow } from '../ui/cover-row';
import { dropdownRow, infoRow, toggleRow } from '../ui/form';
import {
	PLATFORM_DESC,
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
	titleDescOf,
	toNumber,
	tracklistOf,
	yearDescOf,
} from './confirm-values';
import type { ConfirmInput, ConfirmValues, TextKey } from './confirm-values';
import { EstimateField } from './estimate-field';
import type { EstimateLookup } from './estimate-field';
import { TextFields } from './text-fields';

let nextDatalistId = 0;

/** Fields of a run (and of the notes in the catalog folder only): hidden and not written for the backlog. */
const RUN_KEYS: ReadonlySet<TextKey> = new Set<TextKey>(['started', 'finished', 'rating', 'episodes', 'hours', 'pages']);
/** Fields of the backlog only. */
const BACKLOG_KEYS: ReadonlySet<TextKey> = new Set<TextKey>(['recommendedBy', 'estimatedHours']);
/** Value of the "no priority" option (`priority` written empty). */
const NO_PRIORITY = '';

/**
 * The rows of the confirm step (create mode), one `Setting` each, with the
 * fields of the result's kind. Messages appear on blur and on submit, and
 * disappear as soon as the value is fixed. The destination comes first:
 * the backlog keeps what is known before starting (no status, dates,
 * rating, hours, pages or reference note) and adds priority and who
 * recommended it.
 */
export class ConfirmForm {
	private readonly values: ConfirmValues;
	private readonly fields: TextFields;
	private status: CatalogStatus;
	private destination: Destination = 'catalog';
	private priority: Priority | null = DEFAULT_PRIORITY;
	private priorityRow: Setting | null = null;
	private download: boolean;
	private cover: string | null;
	/** Albums: the section of the new note (see tracklistOf). */
	private readonly tracks: Track[] | null;
	private technical = false;
	private area = '';
	/** Rows hidden for some statuses or for the backlog, by text key. */
	private readonly rows = new Map<TextKey, Setting>();
	private statusRow: Setting | null = null;
	private technicalRow: Setting | null = null;
	private areaRow: Setting | null = null;
	/** Backlog games: `estimated_hours`, from HowLongToBeat. */
	private readonly estimate: EstimateField | null;

	constructor(
		private readonly app: App,
		settings: CatalogSettings,
		private readonly input: ConfirmInput,
		/** Title, year or (albums) artist edited: what the duplicate check looks at. */
		private readonly onIdentityChange: () => void,
		/** Games with the HowLongToBeat setting on; null otherwise. */
		estimateLookup: EstimateLookup | null = null,
	) {
		this.status = settings.defaultStatus;
		this.download = settings.downloadCovers;
		this.values = initialValues(input, this.status);
		this.cover = coverUrlOf(input);
		this.tracks = tracklistOf(input, settings) ?? null;
		this.fields = new TextFields(this.values, (key) => this.isShown(key));
		this.estimate = input.result.kind === 'game' ? new EstimateField(this.fields, settings.hltbMeasure, estimateLookup) : null;
	}

	/** The step leaves the screen: a late HowLongToBeat answer is dropped. */
	destroy(): void {
		this.estimate?.destroy();
	}

	get title(): string {
		return this.values.title.trim();
	}

	/** Movies, books and albums: the directors, author or artist as typed, trimmed. */
	get author(): string {
		return this.values.author.trim();
	}

	/** Where, as typed, trimmed. */
	get platform(): string {
		return this.values.platform.trim();
	}

	/** Started as typed, or null while empty or not a YYYY-MM-DD date. */
	get started(): string | null {
		const started = this.values.started.trim();
		return isIsoDate(started) ? started : null;
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
		dropdownRow(el, {
			name: t('field.destination.name'),
			desc: t('field.destination.desc'),
			options: DESTINATIONS.map((destination) => [destination, t(`destination.${destination}`)] as const),
			value: this.destination,
			onChange: (value) => this.changeDestination(value),
		});
		fields.add(el, 'title', { name: t('field.title.name'), desc: titleDescOf(this.input) }, checkTitle, this.onIdentityChange);
		const year = { name: t('field.year.name'), desc: t(yearDescOf(result)), type: 'number', min: 1000, max: 9999 } as const;
		fields.add(el, 'year', year, checkYear, this.onIdentityChange);
		if (kind === 'series' && season) {
			infoRow(el, { name: t('field.season.name') }, String(season.number));
			const episodes = { name: t('field.episodes.name'), desc: t('field.episodes.desc'), type: 'number', min: 0 } as const;
			this.rows.set('episodes', fields.add(el, 'episodes', episodes, checkNumber(true)).setting);
		}
		if (kind === 'movie') {
			// Not part of the duplicate check: one title and year is already one film.
			fields.add(el, 'author', { name: t('field.director.name'), desc: t('field.director.desc') }, null);
		}
		if (kind === 'book') {
			fields.add(el, 'author', { name: t('field.author.name') }, null);
			const pages = { name: t('field.pages.name'), type: 'number', min: 1 } as const;
			this.rows.set('pages', fields.add(el, 'pages', pages, checkNumber(true)).setting);
		}
		if (kind === 'album') {
			// The artist tells two albums with one title apart (duplicates, note name).
			const artist = { name: t('field.artist.name'), desc: t('field.artist.desc') };
			fields.add(el, 'author', artist, null, this.onIdentityChange);
		}

		this.statusRow = dropdownRow(el, {
			name: t('field.status.name'),
			options: CATALOG_STATUSES.map((status) => [status, t(`status.${status}`)] as const),
			value: this.status,
			onChange: (value) => this.changeStatus(value),
		}).setting;
		const started = { name: t('field.started.name'), desc: t(dateDescOf(kind, 'started')), type: 'date' } as const;
		this.rows.set('started', fields.add(el, 'started', started, checkDate).setting);
		const finished = { name: t('field.finished.name'), desc: t(dateDescOf(kind, 'finished')), type: 'date' } as const;
		this.rows.set('finished', fields.add(el, 'finished', finished, checkDate).setting);
		const rating = {
			name: t('field.rating.name'),
			desc: t('field.rating.desc'),
			type: 'number',
			min: RATING_MIN,
			max: RATING_MAX,
		} as const;
		this.rows.set('rating', fields.add(el, 'rating', rating, checkRating).setting);

		this.renderPlatform(el);
		if (this.estimate) this.rows.set('estimatedHours', this.estimate.render(el));
		this.priorityRow = dropdownRow(el, {
			name: t('field.priority.name'),
			options: [...PRIORITIES.map((priority) => [priority, t(`priority.${priority}`)] as const), [NO_PRIORITY, t('priority.none')]],
			value: this.priority ?? NO_PRIORITY,
			onChange: (value) => {
				this.priority = PRIORITIES.find((priority) => priority === value) ?? null;
			},
		}).setting;
		const recommended = { name: t('field.recommendedBy.name'), desc: t('field.recommendedBy.desc') };
		this.rows.set('recommendedBy', fields.add(el, 'recommendedBy', recommended, null).setting);
		if (kind === 'game') {
			const hours = {
				name: t('field.hours.name'),
				desc: t('field.hours.desc'),
				type: 'number',
				min: 0,
				step: 'any',
			} as const;
			this.rows.set('hours', fields.add(el, 'hours', hours, checkNumber(false)).setting);
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
		const backlog = this.destination === 'backlog';
		// Hidden fields are not written (the backlog hides every field of a run).
		const shown = (key: TextKey): string | null => (this.isShown(key) ? values[key].trim() || null : null);
		const number = (key: TextKey): number | null => toNumber(shown(key) ?? '');
		return {
			destination: this.destination,
			kind,
			title: this.title,
			year: toNumber(values.year),
			status: backlog ? 'backlog' : this.status,
			rating: number('rating'),
			started: shown('started'),
			finished: shown('finished'),
			platform: values.platform.trim(),
			season: kind === 'series' ? (season?.number ?? null) : null,
			episodes: kind === 'series' && season ? number('episodes') : null,
			hours: kind === 'game' ? number('hours') : null,
			author: hasAuthor(kind) ? values.author.trim() : '',
			pages: kind === 'book' ? number('pages') : null,
			priority: backlog ? this.priority : null,
			recommendedBy: backlog ? values.recommendedBy.trim() : '',
			estimatedHours: kind === 'game' ? number('estimatedHours') : null,
			referenceArea: kind === 'book' && !backlog && this.technical && this.area ? this.area : null,
			cover: { url: cover, download: cover !== null && this.download },
			source: { provider: result.provider, name: provider.name, url: result.sourceUrl ?? null },
			tracks: kind === 'album' && !backlog ? this.tracks : null,
			// Looked up by the confirm step while the form is open (see findLocalizedTitle).
			localizedTitle: null,
		};
	}

	/** Backlog: no field of a run. Catalog: no backlog field. Finished: done only. Rating: done or dropped. */
	private isShown(key: TextKey): boolean {
		if (this.destination === 'backlog' && RUN_KEYS.has(key)) return false;
		if (this.destination === 'catalog' && BACKLOG_KEYS.has(key)) return false;
		if (key === 'finished') return this.status === 'done';
		if (key === 'rating') return hasRating(this.status);
		return true;
	}

	private changeStatus(value: string): void {
		const status = CATALOG_STATUSES.find((candidate) => candidate === value);
		if (!status) return;
		this.status = status;
		if (status === 'done' && !this.values.finished) this.fields.fill('finished', todayIso());
		this.updateVisibility();
	}

	/** The values typed in hidden fields stay: going back to the catalog shows them again. */
	private changeDestination(value: string): void {
		const destination = DESTINATIONS.find((candidate) => candidate === value);
		if (!destination) return;
		this.destination = destination;
		this.updateVisibility();
		if (destination === 'backlog') this.estimate?.show(this.title, this.year);
	}

	private updateVisibility(): void {
		const catalog = this.destination === 'catalog';
		for (const [key, row] of this.rows) {
			row.settingEl.toggle(this.isShown(key));
			// Hidden fields always pass: clear their messages.
			if (!this.isShown(key)) this.fields.check(key);
		}
		this.statusRow?.settingEl.toggle(catalog);
		this.priorityRow?.settingEl.toggle(!catalog);
		this.technicalRow?.settingEl.toggle(catalog);
		this.areaRow?.settingEl.toggle(catalog && this.technical);
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
		const { setting, control } = toggleRow(el, {
			name: t('field.technical.name'),
			desc: t(areas.length > 0 ? 'field.technical.desc' : 'field.technical.none'),
			value: false,
			onChange: (value) => {
				this.technical = value;
				this.updateVisibility();
			},
		});
		this.technicalRow = setting;
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
