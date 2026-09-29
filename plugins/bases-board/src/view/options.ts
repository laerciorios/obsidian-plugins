import { parsePropertyId } from 'obsidian';
import type { BasesAllOptions, BasesPropertyId, BasesViewConfig } from 'obsidian';
import { DEFAULTS, OPTION } from '../constants';
import { parseColumnSpecs } from '../data/columns';
import { t } from '../i18n';
import type { BoardConfig } from '../types';

const noteOnly = (prop: BasesPropertyId): boolean => parsePropertyId(prop).type === 'note';

/** Default columns as "value|Label", with labels in the app language. */
export function defaultColumns(): string[] {
	return DEFAULTS.columnValues.map((value) => `${value}|${t(`column.${value}`)}`);
}

/** Options shown in the Bases view menu. Values are saved in the .base file by Bases itself. */
export function getViewOptions(): BasesAllOptions[] {
	return [
		{
			type: 'group',
			displayName: t('option.group.columns'),
			items: [
				{
					type: 'property',
					key: OPTION.columnProperty,
					displayName: t('option.columnProperty'),
					default: DEFAULTS.columnProperty,
					placeholder: 'status',
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
					default: DEFAULTS.doneValue,
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
					default: DEFAULTS.completedProperty,
					placeholder: 'completed',
					filter: noteOnly,
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
					default: DEFAULTS.typeProperty,
				},
				{
					type: 'property',
					key: OPTION.projectProperty,
					displayName: t('option.project'),
					default: DEFAULTS.projectProperty,
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

function readProperty(config: BasesViewConfig, key: string, fallback: BasesPropertyId): BasesPropertyId {
	return config.getAsPropertyId(key) ?? fallback;
}

/**
 * Read the view options, applying defaults in code (the option `default` only
 * affects the menu UI). Never writes to the config: calling config.set() would
 * trigger onDataUpdated() again.
 */
export function readBoardConfig(config: BasesViewConfig): BoardConfig {
	const columnProperty = readProperty(config, OPTION.columnProperty, DEFAULTS.columnProperty);
	const rawColumns = config.get(OPTION.columns);
	const columns = parseColumnSpecs(rawColumns);

	const completed = readProperty(config, OPTION.completedProperty, DEFAULTS.completedProperty);

	return {
		columnProperty,
		columnWritable: noteOnly(columnProperty),
		columns: columns.length > 0 ? columns : parseColumnSpecs(defaultColumns()),
		otherLabel: readString(config, OPTION.otherLabel, t('column.other')),
		hideEmptyOther: readBoolean(config, OPTION.hideEmptyOther, DEFAULTS.hideEmptyOther),
		doneValue: readString(config, OPTION.doneValue, DEFAULTS.doneValue),
		completedProperty: noteOnly(completed) ? completed : null,
		setCompleted: readBoolean(config, OPTION.setCompleted, DEFAULTS.setCompleted),
		titleProperty: readProperty(config, OPTION.titleProperty, DEFAULTS.titleProperty),
		typeProperty: readProperty(config, OPTION.typeProperty, DEFAULTS.typeProperty),
		projectProperty: readProperty(config, OPTION.projectProperty, DEFAULTS.projectProperty),
		executorProperty: readProperty(config, OPTION.executorProperty, DEFAULTS.executorProperty),
		aiValue: readString(config, OPTION.aiValue, DEFAULTS.aiValue),
		dueProperty: readProperty(config, OPTION.dueProperty, DEFAULTS.dueProperty),
	};
}
