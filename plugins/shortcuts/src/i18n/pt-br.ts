import type { Translation } from '@obsidian-plugins/i18n';
import type { en } from './en';

export const ptBR: Translation<typeof en> = {
	'settings.trigger.name': 'Gatilho',
	'settings.trigger.desc': 'Caractere que abre as sugestões no editor, seguido do que você digita.',

	'settings.dates.heading': 'Datas',
	'settings.dates.enabled.name': 'Sugerir datas',
	'settings.dates.enabled.desc': 'Links para a daily note de hoje, ontem e amanhã.',
	'settings.dates.keywords.desc': 'Palavras que inserem o link, separadas por vírgula. Vazio: sem atalho para este dia.',
	'settings.dates.format.name': 'Formato da data',
	'settings.dates.format.desc':
		'Formato do moment.js. Vazio: usa o formato das daily notes ({format}). Hoje o link fica [[{today}]].',

	'day.today': 'Hoje',
	'day.yesterday': 'Ontem',
	'day.tomorrow': 'Amanhã',

	'settings.sources.heading': 'Fontes de notas',
	'settings.sources.empty': 'Nenhuma fonte de notas.',
	'settings.sources.add': 'Adicionar fonte',

	'settings.source.unnamed': 'Fonte sem nome',
	'settings.source.enabled.name': 'Ativa',
	'settings.source.enabled.desc': 'Desativada, a fonte some das sugestões sem perder a configuração.',
	'settings.source.name.name': 'Nome',
	'settings.source.name.desc': 'Aparece nesta lista e ao passar o mouse no ícone da sugestão.',
	'settings.source.icon.name': 'Ícone',
	'settings.source.icon.desc': 'Nome de um ícone do Lucide, mostrado ao lado de cada sugestão.',

	'settings.source.match.heading': 'Quais notas',
	'settings.source.folder.name': 'Pasta',
	'settings.source.folder.desc':
		'Sem barra, vale uma pasta com esse nome em qualquer nível (_People). Com barra, é um caminho a partir da raiz (Work/Acme). Vazio: qualquer pasta.',
	'settings.source.property.name': 'Propriedade',
	'settings.source.property.desc': 'A nota precisa ter esta propriedade preenchida.',
	'settings.source.value.name': 'Valor da propriedade',
	'settings.source.value.desc': 'Um ou mais valores aceitos, separados por vírgula. Vazio: qualquer valor.',
	'settings.source.tag.name': 'Tag',
	'settings.source.tag.desc': 'A nota precisa ter esta tag. Tags aninhadas também valem (meeting inclui meeting/semanal).',
	'settings.source.exclude.name': 'Excluir pastas',
	'settings.source.exclude.desc': 'Uma por linha, com a mesma regra do campo pasta.',
	'settings.source.preview.name': 'Notas encontradas',

	'settings.source.link.heading': 'Sugestão e link',
	'settings.source.label.name': 'Título',
	'settings.source.label.desc':
		'Propriedade mostrada como título da sugestão. Sem ela, vale o nome do arquivo (para index.md, o nome da pasta).',
	'settings.source.searchIn.name': 'Buscar também em',
	'settings.source.searchIn.desc':
		'Outras propriedades pesquisadas, separadas por vírgula. O título e o nome do arquivo sempre entram.',
	'settings.source.linkTarget.name': 'Destino do link',
	'settings.source.linkTarget.desc': 'Com nome do arquivo, o link usa o caminho completo quando outra nota tem o mesmo nome.',
	'settings.source.linkTarget.basename': 'Nome do arquivo',
	'settings.source.linkTarget.path': 'Caminho completo',
	'settings.source.linkAlias.name': 'Alias do link',
	'settings.source.linkAlias.desc':
		'Propriedade usada como alias, como em [[destino|alias]]. Se estiver vazia na nota, usa o título. Vazio: link sem alias.',

	'summary.disabled': 'Desativada',
	'summary.folder': 'pasta {folder}',
	'summary.allNotes': 'todas as notas',

	'preview.noCriteria': 'Sem critérios: a fonte sugere todas as notas do vault.',
	'preview.none': 'Nenhuma nota corresponde.',
	'preview.one': '{count} nota, por exemplo: {examples}.',
	'preview.other': '{count} notas, por exemplo: {examples}.',

	'validation.triggerEmpty': 'Informe pelo menos um caractere.',
	'validation.triggerSpaces': 'O gatilho não pode ter espaços.',
	'validation.triggerLength': 'Use no máximo {max} caracteres.',
	'validation.sourceName': 'Dê um nome à fonte.',
	'validation.iconNotFound': 'Ícone não encontrado. Use um nome do Lucide, como user, briefcase ou calendar.',

	'suggest.navigate': 'navegar',
	'suggest.insertLink': 'inserir link',
	'suggest.close': 'fechar',
	'suggest.datesSource': 'Datas',

	'defaults.people': 'Pessoas',
	'defaults.projects': 'Projetos',
	'defaults.newSource': 'Nova fonte',
};
