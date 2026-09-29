import type { Translation } from '@obsidian-plugins/i18n';
import type { en } from './en';

export const ptBR: Translation<typeof en> = {
	'command.colorSelection': 'Colorir seleção com a última cor',
	'command.chooseColor': 'Escolher cor',
	'command.removeColor': 'Remover cor',
	'command.colorWith': 'Colorir com {name}',

	'menu.colorWith': 'Colorir com {name}',
	'menu.chooseColor': 'Escolher cor',
	'menu.removeColor': 'Remover cor',

	'modal.placeholder': 'Nome da cor ou código hex, como #e03131',
	'modal.empty': 'Nenhuma cor com esse nome. Digite # e um código hex para usar qualquer cor.',
	'modal.hex': 'Usar {hex}',
	'modal.number': 'para aplicar pelo número',
	'modal.navigate': 'para navegar',
	'modal.apply': 'para aplicar',
	'modal.dismiss': 'para fechar',

	'notice.nothingToColor': 'Nada para colorir aqui: selecione um texto fora de blocos de código.',
	'notice.nothingToRemove': 'Nenhuma cor ou realce para remover aqui.',

	'settings.usage.name': 'Como usar',
	'settings.usage.desc':
		'Selecione um texto e rode um comando deste plugin, ou digite {example} direto na nota. Qualquer código hex também funciona: {hex}. Renomear uma cor não muda as notas que já usam o nome antigo.',
	'settings.colors.heading': 'Cores',
	'settings.colors.empty': 'Nenhuma cor ainda. Códigos hex continuam funcionando nas notas e no seletor de cores.',
	'settings.colors.add': 'Adicionar cor',
	'settings.color.sample': 'texto',
	'settings.color.name': 'Nome',
	'settings.color.hex': 'Código hex',
	'settings.color.style': 'Estilo',
	'settings.style.text': 'Cor do texto',
	'settings.style.background': 'Cor do realce',
	'settings.editor.heading': 'Editor',
	'settings.editorMenu.name': 'Mostrar no menu de contexto',
	'settings.editorMenu.desc':
		'O clique direito numa nota oferece a última cor, o seletor de cores e, sobre texto colorido, remover cor.',
	'settings.hotkeys.name': 'Atalhos',
	'settings.hotkeys.desc':
		'Cada cor tem o próprio comando, "Colorir com …". Defina as teclas em Atalhos, filtrando por Colored Text.',

	'validation.nameEmpty': 'Dê um nome para a cor.',
	'validation.nameLength': 'Use no máximo {max} caracteres.',
	'validation.nameHash': 'O nome não pode começar com #, que é reservado para códigos hex.',
	'validation.nameChars': 'O nome não pode conter {chars}.',
	'validation.nameTaken': 'Outra cor já tem esse nome.',
	'validation.hex': 'Use um código hex como #e03131 ou #e33.',

	'defaults.darkRed': 'vermelho-escuro',
	'defaults.red': 'vermelho',
	'defaults.orange': 'laranja',
	'defaults.yellow': 'amarelo',
	'defaults.lightGreen': 'verde-claro',
	'defaults.green': 'verde',
	'defaults.lightBlue': 'azul-claro',
	'defaults.blue': 'azul',
	'defaults.darkBlue': 'azul-escuro',
	'defaults.purple': 'roxo',
	'defaults.newColor': 'nova-cor',
};
