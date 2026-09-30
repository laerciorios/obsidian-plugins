import type { Translation } from '@obsidian-plugins/i18n';
import type { en } from './en';

export const ptBR: Translation<typeof en> = {
	'view.title': 'Comentários',

	'command.commentSelection': 'Comentar seleção',
	'command.openPanel': 'Abrir comentários',
	'command.openFile': 'Abrir o arquivo de comentários desta nota',
	'menu.comment': 'Comentar',

	'modal.title': 'Novo comentário',
	'modal.wholeBlock': 'Nenhum texto selecionado: o comentário vale para o bloco inteiro.',
	'modal.existing': 'Este bloco já tem uma conversa: o comentário entra nela.',
	'modal.existingResolved': 'Este bloco tem uma conversa resolvida: o comentário a reabre.',
	'modal.placeholder': 'Escreva um comentário…',
	'modal.hint': '{key}+Enter envia.',
	'modal.cancel': 'Cancelar',
	'modal.submit': 'Comentar',

	'notice.frontmatter': 'Não dá para comentar nas propriedades da nota.',
	'notice.empty': 'Coloque o cursor numa linha com texto para comentar.',
	'notice.commentsFile': 'Este é um arquivo de comentários: comente na própria nota.',
	'notice.saveFailed': 'Não foi possível salvar o comentário. Veja os detalhes no console do desenvolvedor.',
	'notice.threadMissing': 'Esta conversa não está mais no arquivo de comentários.',
	'notice.noComments': 'Esta nota ainda não tem comentários.',

	'panel.noNote': 'Abra uma nota para ver os comentários.',
	'panel.commentsFile': 'Este é um arquivo de comentários. Abra a nota dele para ver as conversas.',
	'panel.none': 'Nenhum comentário nesta nota. Selecione um trecho e use "Comentar seleção".',
	'panel.allResolved.one': 'Nenhum comentário aberto. 1 resolvido.',
	'panel.allResolved.other': 'Nenhum comentário aberto. {count} resolvidos.',
	'panel.open.one': '1 aberto',
	'panel.open.other': '{count} abertos',
	'panel.resolved.one': '1 resolvido',
	'panel.resolved.other': '{count} resolvidos',
	'panel.onlyOpen': 'Só abertos',
	'panel.openFile': 'Abrir arquivo de comentários',
	'panel.goTo': 'Ir para o trecho',
	'panel.wholeBlock': 'Bloco inteiro',
	'panel.orphan': 'Trecho apagado',
	'panel.orphanDesc': 'O bloco desta conversa não existe mais na nota.',
	'panel.resolvedBadge': 'Resolvido',
	'panel.ai': 'IA',
	'panel.reply': 'Responder',
	'panel.replyPlaceholder': 'Responder…',
	'panel.send': 'Enviar',
	'panel.cancel': 'Cancelar',
	'panel.resolve': 'Resolver',
	'panel.reopen': 'Reabrir',

	'status.one': '1 comentário',
	'status.other': '{count} comentários',
	'status.tooltip': 'Comentários abertos nesta nota. Clique para abrir o painel.',

	'editor.openThread': 'Abrir o comentário',

	'settings.storage.heading': 'Armazenamento',
	'settings.folder.name': 'Pasta dos comentários',
	'settings.folder.desc':
		'Um arquivo markdown por nota, ligado a ela pela propriedade "note". Mudar a pasta não move os arquivos existentes.',
	'settings.author.name': 'Seu nome nos comentários',
	'settings.author.desc': 'Gravado como autor dos seus comentários e respostas. Agentes de IA assinam como "ia" ou "ai".',
	'settings.display.heading': 'Exibição',
	'settings.highlight.name': 'Destacar trechos comentados',
	'settings.highlight.desc':
		'Marca no editor os trechos com comentários abertos e, no Live Preview, mostra um ícone no lugar do ID do bloco.',
	'settings.statusBar.name': 'Contador na barra de status',
	'settings.statusBar.desc': 'Mostra quantos comentários abertos a nota ativa tem.',

	'validation.folder': 'Informe uma pasta.',
	'validation.author': 'Informe um nome.',

	'defaults.author': 'eu',
};
