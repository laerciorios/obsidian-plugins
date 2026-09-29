import type { Translation } from '@obsidian-plugins/i18n';
import type { en } from './en';

export const ptBR: Translation<typeof en> = {
	'view.name': 'Quadro',

	'column.todo': 'A fazer',
	'column.doing': 'Fazendo',
	'column.review': 'Em revisão',
	'column.done': 'Concluído',
	'column.other': 'Outros',

	'option.group.columns': 'Colunas',
	'option.columnProperty': 'Propriedade da coluna',
	'option.columns': 'Colunas (valor|rótulo)',
	'option.otherLabel': 'Rótulo para outros valores',
	'option.hideEmptyOther': 'Esconder a coluna de outros quando vazia',
	'option.doneValue': 'Valor de concluído',
	'option.setCompleted': 'Gravar data de conclusão',
	'option.completedProperty': 'Propriedade da data de conclusão',
	'option.group.card': 'Card',
	'option.title': 'Título',
	'option.titlePlaceholder': 'Nome do arquivo',
	'option.type': 'Tipo',
	'option.project': 'Projeto',
	'option.executor': 'Executor',
	'option.aiValue': 'Valor do executor que indica IA',
	'option.due': 'Prazo',

	'hint.notWritable': '"{property}" é calculada e não pode ser gravada: arrastar está desativado. Escolha uma propriedade da nota.',
	'hint.noDoneColumn': 'Nenhuma coluna tem o valor "{value}": a data de conclusão não será gravada.',
	'hint.groupByIgnored': 'O agrupamento do Bases é ignorado nesta view: as colunas vêm da propriedade da coluna.',
	'hint.empty': 'Nenhuma nota corresponde aos filtros desta view.',

	'card.ai': 'AI',
	'card.openProject': 'Abrir {name}',
	'card.due': 'Prazo: {date}',
	'card.overdue': 'Prazo vencido: {date}',

	'notice.basesDisabled': 'Bases Board: ative o plugin principal Bases para usar a view Quadro.',
	'notice.fileNotFound': 'Bases Board: arquivo não encontrado.',
	'notice.moveFailed': 'Bases Board: não foi possível mover "{name}".',
};
