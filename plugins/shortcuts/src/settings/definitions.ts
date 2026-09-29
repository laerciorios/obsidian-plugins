import { getIconIds } from 'obsidian';
import type { Setting, SettingDefinition, SettingDefinitionGroup, SettingDefinitionItem, SettingDefinitionPage } from 'obsidian';
import { FALLBACK_ICON, PREVIEW_EXAMPLES } from '../constants';
import { formatDay } from '../data/dates';
import { hasCriteria } from '../data/matcher';
import type { SourcePreview } from '../data/note-index';
import type { ShortcutEngine } from '../engine';
import type { NotesSourceConfig, ShortcutsSettings } from '../types';
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
		return 'Ícone não encontrado. Use um nome do Lucide, como user, briefcase ou calendar.';
	}
}

function summary(source: NotesSourceConfig): string {
	if (!source.enabled) return 'Desativada';
	const { folder, property, value, tag } = source.match;
	const parts: string[] = [];
	if (folder) parts.push(`pasta ${folder}`);
	if (property) parts.push(value ? `${property}: ${value}` : property);
	if (tag) parts.push(`#${tag.replace(/^#/, '')}`);
	return parts.length > 0 ? parts.join(' · ') : 'todas as notas';
}

function previewText(source: NotesSourceConfig, preview: SourcePreview): string {
	const prefix = hasCriteria(source) ? '' : 'Sem critérios: a fonte sugere todas as notas do vault. ';
	if (preview.count === 0) return `${prefix}Nenhuma nota corresponde.`;
	const noun = preview.count === 1 ? 'nota' : 'notas';
	return `${prefix}${preview.count} ${noun}, por exemplo: ${preview.examples.join(', ')}.`;
}

function previewRow(context: DefinitionContext, source: NotesSourceConfig): SettingDefinition {
	return {
		name: 'Notas encontradas',
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
			return source.name || 'Fonte sem nome';
		},
		displayValue: () => summary(source),
		items: [
			{
				type: 'group',
				items: [
					{
						name: 'Ativa',
						desc: 'Desativada, a fonte some das sugestões sem perder a configuração.',
						control: { type: 'toggle', key: key.source(id, 'enabled') },
					},
					{
						name: 'Nome',
						desc: 'Aparece nesta lista e ao passar o mouse no ícone da sugestão.',
						control: {
							type: 'text',
							key: key.source(id, 'name'),
							validate: (value) => (value.trim() ? undefined : 'Dê um nome à fonte.'),
						},
					},
					{
						name: 'Ícone',
						desc: 'Nome de um ícone do Lucide, mostrado ao lado de cada sugestão.',
						control: { type: 'text', key: key.source(id, 'icon'), placeholder: FALLBACK_ICON, validate: iconError },
					},
				],
			},
			{
				type: 'group',
				heading: 'Quais notas',
				items: [
					{
						name: 'Pasta',
						desc: 'Sem barra, vale uma pasta com esse nome em qualquer nível (_People). Com barra, é um caminho a partir da raiz (Work/Acme). Vazio: qualquer pasta.',
						control: { type: 'text', key: key.source(id, 'folder'), placeholder: '_People' },
					},
					{
						name: 'Propriedade',
						desc: 'A nota precisa ter esta propriedade preenchida.',
						control: { type: 'text', key: key.source(id, 'property'), placeholder: 'type' },
					},
					{
						name: 'Valor da propriedade',
						desc: 'Um ou mais valores aceitos, separados por vírgula. Vazio: qualquer valor.',
						visible: () => source.match.property.trim().length > 0,
						control: { type: 'text', key: key.source(id, 'value'), placeholder: 'project' },
					},
					{
						name: 'Tag',
						desc: 'A nota precisa ter esta tag. Tags aninhadas também valem (meeting inclui meeting/semanal).',
						control: { type: 'text', key: key.source(id, 'tag'), placeholder: 'meeting' },
					},
					{
						name: 'Excluir pastas',
						desc: 'Uma por linha, com a mesma regra do campo pasta.',
						control: { type: 'textarea', key: key.source(id, 'exclude'), placeholder: '_Templates', rows: 3 },
					},
					previewRow(context, source),
				],
			},
			{
				type: 'group',
				heading: 'Sugestão e link',
				items: [
					{
						name: 'Título',
						desc: 'Propriedade mostrada como título da sugestão. Sem ela, vale o nome do arquivo (para index.md, o nome da pasta).',
						control: { type: 'text', key: key.source(id, 'label'), placeholder: 'name' },
					},
					{
						name: 'Buscar também em',
						desc: 'Outras propriedades pesquisadas, separadas por vírgula. O título e o nome do arquivo sempre entram.',
						control: { type: 'text', key: key.source(id, 'searchIn'), placeholder: 'aliases, slug' },
					},
					{
						name: 'Destino do link',
						desc: 'Com nome do arquivo, o link usa o caminho completo quando outra nota tem o mesmo nome.',
						control: {
							type: 'dropdown',
							key: key.source(id, 'linkTarget'),
							options: { basename: 'Nome do arquivo', path: 'Caminho completo' },
						},
					},
					{
						name: 'Alias do link',
						desc: 'Propriedade usada como alias, como em [[destino|alias]]. Se estiver vazia na nota, usa o título. Vazio: link sem alias.',
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
		desc: 'Palavras que inserem o link, separadas por vírgula. Vazio: sem atalho para este dia.',
		control: { type: 'text', key: key.dates(day), placeholder },
	});
	return {
		type: 'group',
		heading: 'Datas',
		items: [
			{
				name: 'Sugerir datas',
				desc: 'Links para a daily note de hoje, ontem e amanhã.',
				control: { type: 'toggle', key: key.dates('enabled') },
			},
			keywords('today', 'Hoje', 'today, hoje'),
			keywords('yesterday', 'Ontem', 'yesterday, ontem'),
			keywords('tomorrow', 'Amanhã', 'tomorrow, amanha'),
			{
				name: 'Formato da data',
				get desc() {
					const today = formatDay(engine.dateFormat(), 0);
					return `Formato do moment.js. Vazio: usa o formato das daily notes (${engine.dailyNotesFormat()}). Hoje o link fica [[${today}]].`;
				},
				control: { type: 'text', key: key.dates('format'), placeholder: engine.dailyNotesFormat() },
			},
		],
	};
}

export function settingDefinitions(context: DefinitionContext): SettingDefinitionItem[] {
	return [
		{
			name: 'Gatilho',
			desc: 'Caractere que abre as sugestões no editor, seguido do que você digita.',
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
			heading: 'Fontes de notas',
			emptyState: 'Nenhuma fonte de notas.',
			addItem: { name: 'Adicionar fonte', action: () => context.addSource() },
			onReorder: (from, to) => context.moveSource(from, to),
			onDelete: (index) => context.removeSource(index),
			items: context.settings.sources.map((source) => sourcePage(context, source)),
		},
	];
}
