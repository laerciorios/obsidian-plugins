import { parsePropertyId } from 'obsidian';
import type { BasesAllOptions, BasesPropertyId, BasesViewConfig } from 'obsidian';
import { DEFAULTS, OPTION } from '../constants';
import { parseColumnSpecs } from '../data/columns';
import { t } from '../i18n';
import { findProfile } from '../settings/model';
import type { BoardProfile, BoardSettings } from '../settings/model';
import type { GraphKeys } from '../hierarchy/graph';
import type { BoardConfig } from '../types';

const noteOnly = (prop: BasesPropertyId): boolean => parsePropertyId(prop).type === 'note';

const noteProp = (name: string): BasesPropertyId | null => (name ? (`note.${name}` as BasesPropertyId) : null);

/** Default columns as "value|Label", with labels in the app language. */
export function defaultColumns(): string[] {
	return DEFAULTS.columnValues.map((value) => `${value}|${t(`column.${value}`)}`);
}

export interface OptionsHost {
	settings: BoardSettings;
}

/**
 * Options shown in the Bases view menu; values are saved in the .base file by
 * Bases itself. Defaults shown in the menu follow the selected profile.
 */
export function getViewOptions(host: OptionsHost, config: BasesViewConfig): BasesAllOptions[] {
	const profile = findProfile(host.settings, config.get(OPTION.profile));
	const profiles: Record<string, string> = {};
	for (const item of host.settings.profiles) profiles[item.id] = item.name;
	const first = host.settings.profiles[0]?.id ?? '';

	return [
		{
			type: 'dropdown',
			key: OPTION.profile,
			displayName: t('option.profile'),
			default: first,
			options: profiles,
		},
		{
			type: 'toggle',
			key: OPTION.hideArchived,
			displayName: t('option.hideArchived'),
			default: DEFAULTS.hideArchived,
		},
		{
			type: 'group',
			displayName: t('option.group.columns'),
			items: [
				{
					type: 'property',
					key: OPTION.columnProperty,
					displayName: t('option.columnProperty'),
					default: noteProp(profile.statusProperty) ?? undefined,
					placeholder: profile.statusProperty,
					filter: noteOnly,
				},
				{
					type: 'multitext',
					key: OPTION.columns,
					displayName: t('option.columns'),
					default: defaultColumns(),
				},
				{
					type: 'text',
					key: OPTION.otherLabel,
					displayName: t('option.otherLabel'),
					default: t('column.other'),
				},
				{
					type: 'toggle',
					key: OPTION.hideEmptyOther,
					displayName: t('option.hideEmptyOther'),
					default: DEFAULTS.hideEmptyOther,
				},
				{
					type: 'text',
					key: OPTION.doneValue,
					displayName: t('option.doneValue'),
					default: profile.doneValue,
				},
				{
					type: 'toggle',
					key: OPTION.setCompleted,
					displayName: t('option.setCompleted'),
					default: DEFAULTS.setCompleted,
				},
				{
					type: 'property',
					key: OPTION.completedProperty,
					displayName: t('option.completedProperty'),
					default: noteProp(profile.completedProperty) ?? undefined,
					placeholder: profile.completedProperty,
					filter: noteOnly,
				},
			],
		},
		{
			type: 'group',
			displayName: t('option.group.hierarchy'),
			items: [
				{
					type: 'toggle',
					key: OPTION.showChildren,
					displayName: t('option.showChildren'),
					default: profile.hierarchy.enabled,
				},
				{
					type: 'toggle',
					key: OPTION.showProgress,
					displayName: t('option.showProgress'),
					default: profile.hierarchy.enabled,
				},
				{
					type: 'toggle',
					key: OPTION.showBlocked,
					displayName: t('option.showBlocked'),
					default: profile.hierarchy.enabled,
				},
			],
		},
		{
			type: 'group',
			displayName: t('option.group.card'),
			items: [
				{
					type: 'property',
					key: OPTION.titleProperty,
					displayName: t('option.title'),
					default: DEFAULTS.titleProperty,
					placeholder: t('option.titlePlaceholder'),
				},
				{
					type: 'property',
					key: OPTION.typeProperty,
					displayName: t('option.type'),
					default: noteProp(profile.typeProperty) ?? DEFAULTS.typeProperty,
				},
				{
					type: 'property',
					key: OPTION.projectProperty,
					displayName: t('option.project'),
					default: noteProp(profile.projectProperty) ?? undefined,
				},
				{
					type: 'property',
					key: OPTION.executorProperty,
					displayName: t('option.executor'),
					default: DEFAULTS.executorProperty,
				},
				{
					type: 'text',
					key: OPTION.aiValue,
					displayName: t('option.aiValue'),
					default: DEFAULTS.aiValue,
				},
				{
					type: 'property',
					key: OPTION.dueProperty,
					displayName: t('option.due'),
					default: DEFAULTS.dueProperty,
				},
			],
		},
	];
}

function readString(config: BasesViewConfig, key: string, fallback: string): string {
	const value = config.get(key);
	return typeof value === 'string' && value.trim() !== '' ? value.trim() : fallback;
}

function readBoolean(config: BasesViewConfig, key: string, fallback: boolean): boolean {
	const value = config.get(key);
	return typeof value === 'boolean' ? value : fallback;
}

function readProperty(config: BasesViewConfig, key: string, fallback: BasesPropertyId | null): BasesPropertyId | null {
	return config.getAsPropertyId(key) ?? fallback;
}

/**
 * Read the view options. Precedence: an option filled in the view, then the
 * board profile, then the plugin default — so existing .base files keep their
 * behavior. Never writes to the config: config.set() would trigger
 * onDataUpdated() again.
 */
export function readBoardConfig(config: BasesViewConfig, settings: BoardSettings): BoardConfig {
	const requested = config.get(OPTION.profile);
	const profile: BoardProfile = findProfile(settings, requested);
	const profileFound = typeof requested !== 'string' || requested === '' || profile.id === requested;

	const statusDefault = noteProp(profile.statusProperty) ?? 'note.status';
	const columnProperty = readProperty(config, OPTION.columnProperty, statusDefault) ?? statusDefault;
	const columns = parseColumnSpecs(config.get(OPTION.columns));
	const completed = readProperty(config, OPTION.completedProperty, noteProp(profile.completedProperty));
	const titleProperty = readProperty(config, OPTION.titleProperty, DEFAULTS.titleProperty);
	const typeProperty = readProperty(config, OPTION.typeProperty, noteProp(profile.typeProperty) ?? DEFAULTS.typeProperty);
	const projectProperty = readProperty(config, OPTION.projectProperty, noteProp(profile.projectProperty));
	const doneValue = readString(config, OPTION.doneValue, profile.doneValue);

	// Relations follow the view where it names note properties, else the profile.
	const noteName = (prop: BasesPropertyId | null, fallback: string): string => {
		if (!prop) return fallback;
		const { type, name } = parsePropertyId(prop);
		return type === 'note' ? name : fallback;
	};
	const hierarchy = profile.hierarchy;
	const graphKeys: GraphKeys = {
		title: noteName(titleProperty, 'title'),
		status: noteName(columnProperty, profile.statusProperty),
		doneValue,
		type: noteName(typeProperty, profile.typeProperty),
		specValue: hierarchy.specValue,
		project: noteName(projectProperty, profile.projectProperty),
		parent: profile.parentProperty,
		order: profile.orderProperty,
		blockedBy: profile.blockedByProperty,
	};
	const children = readBoolean(config, OPTION.showChildren, hierarchy.enabled);
	const progress = readBoolean(config, OPTION.showProgress, hierarchy.enabled);

	return {
		profile,
		profileFound,
		hideArchived: readBoolean(config, OPTION.hideArchived, DEFAULTS.hideArchived),
		columnProperty,
		columnWritable: noteOnly(columnProperty),
		columns: columns.length > 0 ? columns : parseColumnSpecs(defaultColumns()),
		otherLabel: readString(config, OPTION.otherLabel, t('column.other')),
		hideEmptyOther: readBoolean(config, OPTION.hideEmptyOther, DEFAULTS.hideEmptyOther),
		doneValue,
		completedProperty: completed && noteOnly(completed) ? completed : null,
		setCompleted: readBoolean(config, OPTION.setCompleted, DEFAULTS.setCompleted),
		titleProperty,
		typeProperty,
		projectProperty,
		executorProperty: readProperty(config, OPTION.executorProperty, DEFAULTS.executorProperty),
		aiValue: readString(config, OPTION.aiValue, DEFAULTS.aiValue),
		dueProperty: readProperty(config, OPTION.dueProperty, DEFAULTS.dueProperty),
		hierarchy: {
			children,
			progress,
			blocked: readBoolean(config, OPTION.showBlocked, hierarchy.enabled),
			projects: hierarchy.showOnProjects,
			countArchived: hierarchy.countArchived,
			collapseAbove: hierarchy.collapseAbove,
			specValue: hierarchy.specValue,
		},
		graphKeys,
	};
}
