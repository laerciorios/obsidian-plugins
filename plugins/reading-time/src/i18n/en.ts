import type { Messages } from '@obsidian-plugins/i18n';

/** Source catalog. Every other locale must define all of these keys. */
export const en = {
	// Time units. {n} is a number.
	'unit.hour.short': '{n}h',
	'unit.minute.short': '{n}m',
	'unit.second.short': '{n}s',
	'unit.hour.one': '{n} hour',
	'unit.hour.other': '{n} hours',
	'unit.minute.one': '{n} minute',
	'unit.minute.other': '{n} minutes',
	'unit.second.one': '{n} second',
	'unit.second.other': '{n} seconds',
	// The "minutes" format: whole minutes, rounded up.
	'format.minutes': '{n} min',

	// Status bar while text is selected; {text} is the formatted time ("1m 2s read").
	'status.selection': 'Selection: {text}',

	// Details in the status bar tooltip and in the notice.
	'details.words.one': '{count} word at {wpm} wpm',
	'details.words.other': '{count} words at {wpm} wpm',
	'details.code.one': '{count} code word at {wpm} wpm',
	'details.code.other': '{count} code words at {wpm} wpm',
	'details.ignored.one': '{count} code word ignored',
	'details.ignored.other': '{count} code words ignored',

	// Saved once, on first use, in the language of the app.
	'defaults.suffix': 'read',
	'defaults.template': '{simple} read · {words} words',

	'command.show': 'Show reading time',
	'command.updateProperty': 'Update reading time property in this note',
	'command.updateAll': 'Update reading time property in all notes',

	'notice.show.note': 'This note: {text}',
	'notice.show.selection': 'Selection: {text}',
	'notice.property.written': 'Reading time saved: {property} = {minutes}.',
	'notice.property.unchanged': 'Already up to date: {property} = {minutes}.',
	'notice.property.failed': 'Could not update {property}. The developer console has the details.',
	'notice.bulk.scanning': 'Checking reading times…',
	'notice.bulk.noNotes': 'No notes to check.',
	'notice.bulk.upToDate': 'Reading time is already up to date in every note checked ({count}).',
	'notice.bulk.progress': 'Updating reading time: {done} of {total}…',
	'notice.bulk.done.one': 'Reading time updated in 1 note.',
	'notice.bulk.done.other': 'Reading time updated in {count} notes.',
	'notice.bulk.failed': 'Not updated: {count}. The developer console has the details.',
	'notice.bulk.running': 'An update is already running.',

	'modal.bulk.title': 'Update reading time in all notes',
	'modal.bulk.message': '{count} of {total} notes will get a new {property} value. The others already have the right value.',
	'modal.bulk.scope.existing': 'Only notes that already have the property were checked.',
	'modal.bulk.scope.all': 'Every note outside the ignored folders was checked.',
	'modal.bulk.confirm': 'Update notes',
	'modal.cancel': 'Cancel',

	'settings.reading.heading': 'Reading',
	'settings.speed.name': 'Reading speed',
	'settings.speed.desc': 'Words per minute (default: 200).',

	'settings.display.heading': 'Display',
	'settings.format.name': 'Format',
	'settings.format.desc': 'How the time appears in the status bar.',
	'settings.format.minutes': 'Minutes ({example})',
	'settings.format.compact': 'Compact ({example})',
	'settings.format.simple': 'Simple ({example})',
	'settings.format.verbose': 'Verbose ({example})',
	'settings.format.clock': 'Clock ({example})',
	'settings.format.custom': 'Custom template',
	'settings.suffix.name': 'Text after the time',
	'settings.suffix.desc': 'Leave empty to show only the time.',
	'settings.template.name': 'Template',
	'settings.template.desc': 'Any text with these variables: {list}.',
	'settings.preview.name': 'Preview',
	'settings.preview.note': 'Active note: {text}',
	'settings.preview.sample': 'A note with {words} words: {text}',
	'settings.hideEmpty.name': 'Hide on empty notes',
	'settings.hideEmpty.desc': 'Show nothing when the note has no words to read.',

	'settings.code.heading': 'Code blocks',
	'settings.codeMode.name': 'Code and math blocks',
	'settings.codeMode.desc': 'Fenced code blocks (```), including pseudocode, and math blocks ($$).',
	'settings.codeMode.ignore': 'Ignore',
	'settings.codeMode.text': 'Count as text',
	'settings.codeMode.speed': 'Count at their own speed',
	'settings.codeSpeed.name': 'Code reading speed',
	'settings.codeSpeed.desc': 'Words per minute in code and math blocks (default: 100).',
	'settings.skip.name': 'Always ignore',
	'settings.skip.desc': 'Code block languages never counted, separated by commas. Diagrams and queries are not read.',

	'settings.selection.heading': 'Selection',
	'settings.selection.name': 'Show the time of the selection',
	'settings.selection.desc': 'While text is selected in the editor, the status bar shows the time to read the selection.',

	'settings.property.heading': 'Frontmatter property',
	'settings.propertyMode.name': 'Write to notes',
	'settings.propertyMode.desc':
		'Saves the reading time in whole minutes as a number, to filter and sort in Bases. The open note is updated when you leave it, not while you type.',
	'settings.propertyMode.off': 'Off',
	'settings.propertyMode.existing': 'Only notes that already have the property',
	'settings.propertyMode.all': 'All notes',
	'settings.propertyName.name': 'Property name',
	'settings.propertyName.desc': 'Renaming it does not change notes that have the old property.',
	'settings.exclude.name': 'Ignored folders',
	'settings.exclude.desc': 'Notes in these folders are never written. One folder per line.',
	'settings.updateAll.name': 'Update all notes now',
	'settings.updateAll.desc':
		'Checks every note, or only those with the property in the mode above, and asks before writing.',

	'validation.speed': 'Use a whole number from {min} to {max}.',
	'validation.propertyName': 'Type a property name.',
	'validation.template': 'Unknown variable: {names}.',
} satisfies Messages;
