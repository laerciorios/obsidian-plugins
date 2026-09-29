import { getIconIds } from 'obsidian';
import type { Setting, SettingDefinition, SettingDefinitionGroup, SettingDefinitionItem, SettingDefinitionPage } from 'obsidian';
import { FALLBACK_ICON, PREVIEW_EXAMPLES } from '../constants';
import { formatDay } from '../data/dates';
import { hasCriteria } from '../data/matcher';
import type { SourcePreview } from '../data/note-index';
import type { ShortcutEngine } from '../engine';
import type { NotesSourceConfig, ShortcutsSettings } from '../types';
import { t } from '../i18n';
import { key } from './bindings';
import { triggerError } from './settings';

/** What the definitions need from the settings tab. */
export interface DefinitionContext {
	settings: ShortcutsSettings;
	engine: ShortcutEngine;
	/** Refreshers of the "notes found" rows, by source id, called after each source edit. */
	previews: Map<string, () => void>;
	addSource(): void;
	moveSource(from: number, to: number): void;
	removeSource(index: number): void;
}

function iconError(value: string): string | void {
	const id = value.trim();
	if (!id) return;
	const ids = getIconIds();
	if (!ids.includes(id) && !ids.includes(`lucide-${id}`)) {
		return t('validation.iconNotFound');
	}
}

function summary(source: NotesSourceConfig): string {
	if (!source.enabled) return t('summary.disabled');
	const { folder, property, value, tag } = source.match;
	const parts: string[] = [];
	if (folder) parts.push(t('summary.folder', { folder }));
	if (property) parts.push(value ? `${property}: ${value}` : property);
	if (tag) parts.push(`#${tag.replace(/^#/, '')}`);
	return parts.length > 0 ? parts.join(' · ') : t('summary.allNotes');
}

function previewText(source: NotesSourceConfig, preview: SourcePreview): string {
	const prefix = hasCriteria(source) ? '' : `${t('preview.noCriteria')} `;
	if (preview.count === 0) return prefix + t('preview.none');
	const params = { count: preview.count, examples: preview.examples.join(', ') };
	return prefix + t(preview.count === 1 ? 'preview.one' : 'preview.other', params);
}

function previewRow(context: DefinitionContext, source: NotesSourceConfig): SettingDefinition {
	return {
		name: t('settings.source.preview.name'),
		searchable: false,
		render: (setting: Setting) => {
			const refresh = () => {
				setting.setDesc(previewText(source, context.engine.preview(source, PREVIEW_EXAMPLES)));
			};
			refresh();
			context.previews.set(source.id, refresh);
			return () => {
				context.previews.delete(source.id);
			};
		},
	};
}

function sourcePage(context: DefinitionContext, source: NotesSourceConfig): SettingDefinitionPage {
	const id = source.id;
	return {
		type: 'page',
		// Getters, so the list shows the current name and summary after an edit.
		get name() {
			return source.name || t('settings.source.unnamed');
		},
		displayValue: () => summary(source),
		items: [
			{
				type: 'group',
				items: [
					{
						name: t('settings.source.enabled.name'),
						desc: t('settings.source.enabled.desc'),
						control: { type: 'toggle', key: key.source(id, 'enabled') },
					},
					{
						name: t('settings.source.name.name'),
						desc: t('settings.source.name.desc'),
						control: {
							type: 'text',
							key: key.source(id, 'name'),
							validate: (value) => (value.trim() ? undefined : t('validation.sourceName')),
						},
					},
					{
						name: t('settings.source.icon.name'),
						desc: t('settings.source.icon.desc'),
						control: { type: 'text', key: key.source(id, 'icon'), placeholder: FALLBACK_ICON, validate: iconError },
					},
				],
			},
			{
				type: 'group',
				heading: t('settings.source.match.heading'),
				items: [
					{
						name: t('settings.source.folder.name'),
						desc: t('settings.source.folder.desc'),
						control: { type: 'text', key: key.source(id, 'folder'), placeholder: '_People' },
					},
					{
						name: t('settings.source.property.name'),
						desc: t('settings.source.property.desc'),
						control: { type: 'text', key: key.source(id, 'property'), placeholder: 'type' },
					},
					{
						name: t('settings.source.value.name'),
						desc: t('settings.source.value.desc'),
						visible: () => source.match.property.trim().length > 0,
						control: { type: 'text', key: key.source(id, 'value'), placeholder: 'project' },
					},
					{
						name: t('settings.source.tag.name'),
						desc: t('settings.source.tag.desc'),
						control: { type: 'text', key: key.source(id, 'tag'), placeholder: 'meeting' },
					},
					{
						name: t('settings.source.exclude.name'),
						desc: t('settings.source.exclude.desc'),
						control: { type: 'textarea', key: key.source(id, 'exclude'), placeholder: '_Templates', rows: 3 },
					},
					previewRow(context, source),
				],
			},
			{
				type: 'group',
				heading: t('settings.source.link.heading'),
				items: [
					{
						name: t('settings.source.label.name'),
						desc: t('settings.source.label.desc'),
						control: { type: 'text', key: key.source(id, 'label'), placeholder: 'name' },
					},
					{
						name: t('settings.source.searchIn.name'),
						desc: t('settings.source.searchIn.desc'),
						control: { type: 'text', key: key.source(id, 'searchIn'), placeholder: 'aliases, slug' },
					},
					{
						name: t('settings.source.linkTarget.name'),
						desc: t('settings.source.linkTarget.desc'),
						control: {
							type: 'dropdown',
							key: key.source(id, 'linkTarget'),
							options: {
								basename: t('settings.source.linkTarget.basename'),
								path: t('settings.source.linkTarget.path'),
							},
						},
					},
					{
						name: t('settings.source.linkAlias.name'),
						desc: t('settings.source.linkAlias.desc'),
						control: { type: 'text', key: key.source(id, 'linkAlias'), placeholder: 'name' },
					},
				],
			},
		],
	};
}

function datesGroup(context: DefinitionContext): SettingDefinitionGroup {
	const { engine } = context;
	const keywords = (day: 'today' | 'yesterday' | 'tomorrow', label: string, placeholder: string): SettingDefinition => ({
		name: label,
		desc: t('settings.dates.keywords.desc'),
		control: { type: 'text', key: key.dates(day), placeholder },
	});
	return {
		type: 'group',
		heading: t('settings.dates.heading'),
		items: [
			{
				name: t('settings.dates.enabled.name'),
				desc: t('settings.dates.enabled.desc'),
				control: { type: 'toggle', key: key.dates('enabled') },
			},
			// The placeholders are content keywords, not UI: they stay bilingual.
			keywords('today', t('day.today'), 'today, hoje'),
			keywords('yesterday', t('day.yesterday'), 'yesterday, ontem'),
			keywords('tomorrow', t('day.tomorrow'), 'tomorrow, amanha'),
			{
				name: t('settings.dates.format.name'),
				get desc() {
					const today = formatDay(engine.dateFormat(), 0);
					return t('settings.dates.format.desc', { format: engine.dailyNotesFormat(), today });
				},
				control: { type: 'text', key: key.dates('format'), placeholder: engine.dailyNotesFormat() },
			},
		],
	};
}

export function settingDefinitions(context: DefinitionContext): SettingDefinitionItem[] {
	return [
		{
			name: t('settings.trigger.name'),
			desc: t('settings.trigger.desc'),
			control: {
				type: 'text',
				key: key.trigger,
				placeholder: '@',
				validate: (value) => triggerError(value) ?? undefined,
			},
		},
		datesGroup(context),
		{
			type: 'list',
			heading: t('settings.sources.heading'),
			emptyState: t('settings.sources.empty'),
			addItem: { name: t('settings.sources.add'), action: () => context.addSource() },
			onReorder: (from, to) => context.moveSource(from, to),
			onDelete: (index) => context.removeSource(index),
			items: context.settings.sources.map((source) => sourcePage(context, source)),
		},
	];
}
