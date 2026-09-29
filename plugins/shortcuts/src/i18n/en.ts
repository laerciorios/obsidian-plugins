import type { Messages } from '@obsidian-plugins/i18n';

/** Source catalog. Every other locale must define all of these keys. */
export const en = {
	'settings.trigger.name': 'Trigger',
	'settings.trigger.desc': 'Character that opens suggestions in the editor, followed by what you type.',

	'settings.dates.heading': 'Dates',
	'settings.dates.enabled.name': 'Suggest dates',
	'settings.dates.enabled.desc': 'Links to the daily note for today, yesterday and tomorrow.',
	'settings.dates.keywords.desc': 'Words that insert the link, separated by commas. Empty: no shortcut for this day.',
	'settings.dates.format.name': 'Date format',
	'settings.dates.format.desc':
		'Moment.js format. Empty: uses the daily notes format ({format}). Today the link becomes [[{today}]].',

	'day.today': 'Today',
	'day.yesterday': 'Yesterday',
	'day.tomorrow': 'Tomorrow',

	'settings.sources.heading': 'Note sources',
	'settings.sources.empty': 'No note sources.',
	'settings.sources.add': 'Add source',

	'settings.source.unnamed': 'Unnamed source',
	'settings.source.enabled.name': 'Enabled',
	'settings.source.enabled.desc': 'When off, the source is hidden from suggestions but keeps its settings.',
	'settings.source.name.name': 'Name',
	'settings.source.name.desc': 'Shown in this list and when hovering over the suggestion icon.',
	'settings.source.icon.name': 'Icon',
	'settings.source.icon.desc': 'Name of a Lucide icon, shown next to each suggestion.',

	'settings.source.match.heading': 'Which notes',
	'settings.source.folder.name': 'Folder',
	'settings.source.folder.desc':
		'Without a slash, matches a folder with this name at any level (_People). With a slash, a path from the vault root (Work/Acme). Empty: any folder.',
	'settings.source.property.name': 'Property',
	'settings.source.property.desc': 'The note must have this property filled in.',
	'settings.source.value.name': 'Property value',
	'settings.source.value.desc': 'One or more accepted values, separated by commas. Empty: any value.',
	'settings.source.tag.name': 'Tag',
	'settings.source.tag.desc': 'The note must have this tag. Nested tags count too (meeting includes meeting/weekly).',
	'settings.source.exclude.name': 'Excluded folders',
	'settings.source.exclude.desc': 'One per line, same rule as the folder field.',
	'settings.source.preview.name': 'Matching notes',

	'settings.source.link.heading': 'Suggestion and link',
	'settings.source.label.name': 'Title',
	'settings.source.label.desc':
		'Property shown as the suggestion title. Without it, the file name is used (for index.md, the folder name).',
	'settings.source.searchIn.name': 'Also search in',
	'settings.source.searchIn.desc':
		'Other properties to search, separated by commas. The title and the file name are always searched.',
	'settings.source.linkTarget.name': 'Link target',
	'settings.source.linkTarget.desc': 'With file name, the link uses the full path when another note has the same name.',
	'settings.source.linkTarget.basename': 'File name',
	'settings.source.linkTarget.path': 'Full path',
	'settings.source.linkAlias.name': 'Link alias',
	'settings.source.linkAlias.desc':
		'Property used as the alias, as in [[target|alias]]. If it is empty in the note, the title is used. Empty: no alias.',

	// Summary of a source in the list, e.g. "folder _People · #meeting".
	'summary.disabled': 'Disabled',
	'summary.folder': 'folder {folder}',
	'summary.allNotes': 'all notes',

	'preview.noCriteria': 'No criteria: this source suggests every note in the vault.',
	'preview.none': 'No notes match.',
	'preview.one': '{count} note, for example: {examples}.',
	'preview.other': '{count} notes, for example: {examples}.',

	'validation.triggerEmpty': 'Enter at least one character.',
	'validation.triggerSpaces': 'The trigger cannot contain spaces.',
	'validation.triggerLength': 'Use at most {max} characters.',
	'validation.sourceName': 'Give the source a name.',
	'validation.iconNotFound': 'Icon not found. Use a Lucide icon name, such as user, briefcase or calendar.',

	// Popover footer, shown after the key: "↑↓ to navigate".
	'suggest.navigate': 'to navigate',
	'suggest.insertLink': 'to insert link',
	'suggest.close': 'to dismiss',
	'suggest.datesSource': 'Dates',

	// Written to data.json when created; saved names are never re-translated.
	'defaults.people': 'People',
	'defaults.projects': 'Projects',
	'defaults.newSource': 'New source',
} satisfies Messages;
