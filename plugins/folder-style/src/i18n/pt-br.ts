import type { Translation } from '@obsidian-plugins/i18n';
import type { en } from './en';

export const ptBR: Translation<typeof en> = {
	'settings.appearance.heading': 'Aparência',
	'settings.opacity.name': 'Intensidade da cor',
	'settings.opacity.desc': 'Quão forte a cor da pasta aparece na linha da pasta. Hover e seleção ficam um pouco mais fortes.',
	'settings.tintChildren.name': 'Colorir o conteúdo da pasta',
	'settings.tintChildren.desc': 'Mostra a cor da pasta, mais leve, atrás das subpastas e notas.',
	'settings.symbolSize.name': 'Tamanho do símbolo',
	'settings.symbolSize.desc': 'Tamanho do símbolo em relação ao nome da pasta.',

	'settings.folders.heading': 'Pastas personalizadas',
	'settings.folders.empty': 'Nenhuma pasta personalizada ainda.',

	'folder.symbol.text': 'Símbolo: {text}',
	'folder.symbol.icon': 'Ícone: {name}',
	'folder.color': 'Cor: {name}',
	'folder.missingIcon': 'O ícone "{name}" não existe nesta versão do Obsidian.',
	'folder.missingFolder': 'Esta pasta não existe mais no vault.',

	'color.red': 'vermelho',
	'color.orange': 'laranja',
	'color.yellow': 'amarelo',
	'color.green': 'verde',
	'color.cyan': 'ciano',
	'color.blue': 'azul',
	'color.purple': 'roxo',
	'color.pink': 'rosa',
};
