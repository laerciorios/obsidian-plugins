import type { Messages } from '@obsidian-plugins/i18n';

/**
 * Source catalog (English). Every user-facing string of the plugin lives here. Shape and line
 * names are UI labels; the values written to the file (`circle`, `dashed`) are data and never
 * go through here.
 */
export const en = {
	'shape.rectangle': 'Rectangle',
	'shape.square': 'Square',
	'shape.circle': 'Circle',
	'shape.diamond': 'Diamond',
	'shape.cylinder': 'Cylinder (database)',

	'line.solid': 'Solid',
	'line.dashed': 'Dashed',
	'line.dotted': 'Dotted',

	'width.thin': 'Thin',
	'width.normal': 'Normal',
	'width.bold': 'Bold',
	'width.extra-bold': 'Extra bold',

	'command.shape.rectangle': 'Shape: rectangle',
	'command.shape.square': 'Shape: square',
	'command.shape.circle': 'Shape: circle',
	'command.shape.diamond': 'Shape: diamond',
	'command.shape.cylinder': 'Shape: cylinder (database)',
	'command.line.solid': 'Line: solid',
	'command.line.dashed': 'Line: dashed',
	'command.line.dotted': 'Line: dotted',
	'command.width.thin': 'Line width: thin',
	'command.width.normal': 'Line width: normal',
	'command.width.bold': 'Line width: bold',
	'command.width.extra-bold': 'Line width: extra bold',

	'toolbar.label': 'Shapes and lines',
	'toolbar.shape': 'Shape',
	'toolbar.line': 'Line style',
	'toolbar.width': 'Line width',

	'menu.shape': 'Shape',
	'menu.line': 'Line style',
	'menu.width': 'Line width',

	'command.exportImage': 'Export as SVG or PNG',
	'menu.exportImage': 'Export as SVG or PNG',
	'command.exportWeb': 'Export for the web',
	'menu.exportWeb': 'Export for the web',

	'viewer.zoomIn': 'Zoom in',
	'viewer.zoomOut': 'Zoom out',
	'viewer.fit': 'Fit to screen',
	'viewer.theme': 'Light or dark theme',

	'export.image.title': 'Export canvas',
	'export.format': 'Format',
	'export.format.png': 'PNG image',
	'export.format.svg': 'SVG vector',
	'export.scope': 'What to export',
	'export.scope.canvas': 'Whole canvas',
	'export.scope.selection': 'Selection',
	'export.scope.noSelection': 'Select cards in the canvas to export only them.',
	'export.theme': 'Theme',
	'export.theme.light': 'Light',
	'export.theme.dark': 'Dark',
	'export.background': 'Background',
	'export.background.solid': 'Solid',
	'export.background.transparent': 'Transparent',
	'export.scale': 'Scale',
	'export.scale.desc': 'Image pixels per canvas pixel. Higher is sharper and bigger.',
	'export.scale.option': '{scale}×',
	'export.cancel': 'Cancel',
	'export.confirm': 'Export',

	'settings.export.heading': 'Export',
	'settings.exportFolder.name': 'Export folder on mobile',
	'settings.exportFolder.desc': 'Where exports are saved when there is no save window (mobile). Empty: next to the canvas.',
	'settings.exportFolder.placeholder': 'Next to the canvas',
	'settings.web.heading': 'Web export',
	'settings.webTheme.name': 'Initial theme',
	'settings.webTheme.desc': 'Theme of the page when it opens; visitors can switch.',
	'settings.webTheme.system': 'Follow the system',
	'settings.webNotes.name': 'Linked notes',
	'settings.webNotes.desc': 'Notes placed in the canvas become a card with their text, or a card linking to them.',
	'settings.webNotes.text': 'Show the text',
	'settings.webNotes.link': 'Link to the note',
	'settings.webLinkTemplate.name': 'Note link',
	'settings.webLinkTemplate.desc': 'Address of a note in the web export. {vault}, {path} and {name} are filled in.',
	'settings.webLinkTemplate.empty': 'Type an address.',

	'notice.exporting': 'Exporting…',
	'notice.exported': 'Exported to {location}',
	'notice.exportFailed': 'Export failed: {error}',
	'notice.scaleReduced': 'The image was too large for that scale; it was exported at {scale}×.',
	'notice.unsupported':
		'Canvas Shapes does not recognize this version of the canvas, so its toolbar is off. Your files are untouched and export still works.',
} satisfies Messages;
