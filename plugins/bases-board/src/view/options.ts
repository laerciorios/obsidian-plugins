import { parsePropertyId } from 'obsidian';
import type { BasesAllOptions, BasesPropertyId, BasesViewConfig } from 'obsidian';
import { DEFAULTS, OPTION } from '../constants';
import { parseColumnSpecs } from '../data/columns';
import type { BoardConfig } from '../types';

const noteOnly = (prop: BasesPropertyId): boolean => parsePropertyId(prop).type === 'note';

/** Options shown in the Bases view menu. Values are saved in the .base file by Bases itself. */
export function getViewOptions(): BasesAllOptions[] {
	return [
		{
			type: 'group',
			displayName: 'Colunas',
			items: [
				{
					type: 'property',
					key: OPTION.columnProperty,
					displayName: 'Propriedade da coluna',
					default: DEFAULTS.columnProperty,
					placeholder: 'status',
					filter: noteOnly,
				},
				{
					type: 'multitext',
					key: OPTION.columns,
					displayName: 'Colunas (valor|rótulo)',
					default: DEFAULTS.columns,
				},
				{
					type: 'text',
					key: OPTION.otherLabel,
					displayName: 'Rótulo para outros valores',
					default: DEFAULTS.otherLabel,
				},
				{
					type: 'toggle',
					key: OPTION.hideEmptyOther,
					displayName: 'Esconder a coluna de outros quando vazia',
					default: DEFAULTS.hideEmptyOther,
				},
				{
					type: 'text',
					key: OPTION.doneValue,
					displayName: 'Valor de concluído',
					default: DEFAULTS.doneValue,
				},
				{
					type: 'toggle',
					key: OPTION.setCompleted,
					displayName: 'Gravar data de conclusão',
					default: DEFAULTS.setCompleted,
				},
				{
					type: 'property',
					key: OPTION.completedProperty,
					displayName: 'Propriedade da data de conclusão',
					default: DEFAULTS.completedProperty,
					placeholder: 'completed',
					filter: noteOnly,
				},
			],
		},
		{
			type: 'group',
			displayName: 'Card',
			items: [
				{
					type: 'property',
					key: OPTION.titleProperty,
					displayName: 'Título',
					default: DEFAULTS.titleProperty,
					placeholder: 'Nome do arquivo',
				},
				{
					type: 'property',
					key: OPTION.typeProperty,
					displayName: 'Tipo',
					default: DEFAULTS.typeProperty,
				},
				{
					type: 'property',
					key: OPTION.projectProperty,
					displayName: 'Projeto',
					default: DEFAULTS.projectProperty,
				},
				{
					type: 'property',
					key: OPTION.executorProperty,
					displayName: 'Executor',
					default: DEFAULTS.executorProperty,
				},
				{
					type: 'text',
					key: OPTION.aiValue,
					displayName: 'Valor do executor que indica IA',
					default: DEFAULTS.aiValue,
				},
				{
					type: 'property',
					key: OPTION.dueProperty,
					displayName: 'Prazo',
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
		columns: columns.length > 0 ? columns : parseColumnSpecs(DEFAULTS.columns),
		otherLabel: readString(config, OPTION.otherLabel, DEFAULTS.otherLabel),
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
