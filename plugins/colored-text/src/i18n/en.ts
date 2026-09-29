import type { Messages } from '@obsidian-plugins/i18n';

/** Source catalog. Every other locale must define all of these keys. */
export const en = {
	'command.colorSelection': 'Color selection with the last color',
	'command.chooseColor': 'Choose color',
	'command.removeColor': 'Remove color',
	// One command per palette color; {name} is the color name as saved.
	'command.colorWith': 'Color with {name}',

	'menu.colorWith': 'Color with {name}',
	'menu.chooseColor': 'Choose color',
	'menu.removeColor': 'Remove color',

	'modal.placeholder': 'Color name or hex code, such as #e03131',
	'modal.empty': 'No color with this name. Type # and a hex code to use any color.',
	'modal.hex': 'Use {hex}',
	// Instructions below the picker, shown after the key: "1–9, 0 to apply by number".
	'modal.number': 'to apply by number',
	'modal.navigate': 'to navigate',
	'modal.apply': 'to apply',
	'modal.dismiss': 'to dismiss',

	'notice.nothingToColor': 'Nothing to color here: select some text outside code blocks.',
	'notice.nothingToRemove': 'No color or highlight to remove here.',

	'settings.usage.name': 'How to use',
	'settings.usage.desc':
		'Select text and run a command from this plugin, or type {example} yourself. Any hex code works too: {hex}. Renaming a color does not change notes that already use the old name.',
	'settings.colors.heading': 'Colors',
	'settings.colors.empty': 'No colors yet. Hex codes still work in notes and in the color picker.',
	'settings.colors.add': 'Add color',
	// Sample content in "=={red}text==".
	'settings.color.sample': 'text',
	'settings.color.name': 'Name',
	'settings.color.hex': 'Hex code',
	'settings.color.style': 'Style',
	'settings.style.text': 'Text color',
	'settings.style.background': 'Highlight color',
	'settings.editor.heading': 'Editor',
	'settings.editorMenu.name': 'Show in the context menu',
	'settings.editorMenu.desc':
		'Right-clicking in a note offers the last color, the color picker and, over colored text, remove color.',
	'settings.hotkeys.name': 'Hotkeys',
	'settings.hotkeys.desc':
		'Every color has its own command, "Color with …". Assign keys to them under Hotkeys, filtering by Colored Text.',

	'validation.nameEmpty': 'Give the color a name.',
	'validation.nameLength': 'Use at most {max} characters.',
	'validation.nameHash': 'A name cannot start with #, which is reserved for hex codes.',
	'validation.nameChars': 'A name cannot contain {chars}.',
	'validation.nameTaken': 'Another color already has this name.',
	'validation.hex': 'Use a hex code such as #e03131 or #e33.',

	// Written to data.json when created and then typed in notes: saved names are never re-translated.
	'defaults.darkRed': 'dark-red',
	'defaults.red': 'red',
	'defaults.orange': 'orange',
	'defaults.yellow': 'yellow',
	'defaults.lightGreen': 'light-green',
	'defaults.green': 'green',
	'defaults.lightBlue': 'light-blue',
	'defaults.blue': 'blue',
	'defaults.darkBlue': 'dark-blue',
	'defaults.purple': 'purple',
	'defaults.newColor': 'new-color',
} satisfies Messages;
