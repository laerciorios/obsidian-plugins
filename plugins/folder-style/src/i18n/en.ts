import type { Messages } from '@obsidian-plugins/i18n';

/**
 * Source catalog (English). Every user-facing string of the plugin lives here,
 * keyed by prefix: `command.`, `setting.`, `notice.`, `view.`...
 */
export const en = {
	'settings.appearance.heading': 'Appearance',
	'settings.opacity.name': 'Color strength',
	'settings.opacity.desc': 'How strong the folder color is on the folder row. Hover and selection add a little more.',
	'settings.tintChildren.name': 'Tint folder contents',
	'settings.tintChildren.desc': 'Show the folder color, lighter, behind its subfolders and notes.',
	'settings.symbolSize.name': 'Symbol size',
	'settings.symbolSize.desc': 'Size of the symbol relative to the folder name.',

	'settings.folders.heading': 'Customized folders',
	'settings.folders.empty': 'No customized folders yet.',

	// Row description of a customized folder: parts joined by " · ".
	'folder.symbol.text': 'Symbol: {text}',
	'folder.symbol.icon': 'Icon: {name}',
	'folder.color': 'Color: {name}',
	'folder.missingIcon': 'The icon "{name}" is not available in this version of Obsidian.',
	'folder.missingFolder': 'This folder no longer exists in the vault.',

	'color.red': 'red',
	'color.orange': 'orange',
	'color.yellow': 'yellow',
	'color.green': 'green',
	'color.cyan': 'cyan',
	'color.blue': 'blue',
	'color.purple': 'purple',
	'color.pink': 'pink',
} satisfies Messages;
