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
	'settings.folders.empty': 'No customized folders yet. Right-click a folder in the file explorer and choose "Customize folder…".',
	'settings.folder.edit': 'Edit',

	'menu.customize': 'Customize folder…',

	'modal.title': 'Customize {name}',
	'modal.symbol.name': 'Symbol',
	'modal.symbol.desc': 'Shown before the folder name.',
	'modal.symbol.none': 'None',
	'modal.symbol.text': 'Text or emoji',
	'modal.symbol.lucide': 'Icon',
	'modal.text.name': 'Text',
	'modal.text.desc': 'One or a few characters. Emojis come from the system emoji picker.',
	'modal.icon.search': 'Search icons',
	'modal.icon.selected': 'Selected: {name}',
	'modal.icon.noneSelected': 'No icon selected yet.',
	'modal.icon.empty': 'No icon matches this search.',
	'modal.icon.more': 'Showing the first {count} icons. Type to narrow the list.',
	'modal.color.name': 'Color',
	'modal.color.desc': 'Tints the folder row, and its contents lighter.',
	'modal.color.none': 'No color',
	'modal.hex.name': 'Custom color',
	'modal.hex.desc': 'Hex code, such as {example}.',
	'modal.hex.invalid': 'Not a hex color: use 3 or 6 digits, such as {example}.',
	'modal.preview.note': 'Note',
	'modal.preview.other': 'Another note',
	'modal.save': 'Save',
	'modal.cancel': 'Cancel',
	'modal.remove': 'Remove customization',

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
