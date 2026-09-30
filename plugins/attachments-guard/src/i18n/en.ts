import type { Messages } from '@obsidian-plugins/i18n';

/** Source catalog. Every other locale must define all of these keys. */
export const en = {
	'command.collect': 'Collect loose attachments',
	'command.orphans': 'List orphan attachments',

	// {value} is a formatted number.
	'size.kb': '{value} KB',
	'size.mb': '{value} MB',

	'notice.moved.one': 'Attachments Guard: moved to {path}.',
	'notice.moved.other': 'Attachments Guard: moved {count} new attachments to {folder}.',
	'notice.cover': 'Attachments Guard: cover renamed to {name}.',
	'notice.size': 'Attachments Guard: {name} is {size} (limit: {limit}).',
	'notice.failed': '{count} could not be moved (details in the developer console).',
	'notice.collect.none': 'No loose attachments: everything is in {folder}.',
	'notice.collect.running': 'Already collecting attachments.',
	'notice.collect.progress': 'Moving attachments… {done}/{total}',
	'notice.collect.done.one': 'Moved 1 attachment.',
	'notice.collect.done.other': 'Moved {count} attachments.',
	'notice.orphans.running': 'Already looking for orphan attachments.',
	'notice.orphans.scanning': 'Looking for orphan attachments…',
	'notice.orphans.none': 'No orphan attachments.',
	'notice.orphans.done.one': 'Moved 1 attachment to .trash.',
	'notice.orphans.done.other': 'Moved {count} attachments to .trash.',

	'modal.cancel': 'Cancel',
	'modal.more': '…and {count} more.',
	'modal.collect.title': 'Collect loose attachments',
	'modal.collect.message.one': '1 attachment outside {folder} will be moved there. Links in notes are updated.',
	'modal.collect.message.other': '{count} attachments outside {folder} will be moved there. Links in notes are updated.',
	'modal.collect.confirm': 'Move',
	'modal.orphans.title': 'Orphan attachments',
	'modal.orphans.message.one':
		'1 attachment ({size}) that no note, canvas or base points to. If selected, it goes to .trash, inside its original folder; nothing is deleted.',
	'modal.orphans.message.other':
		'{count} attachments ({size}) that no note, canvas or base points to. The selected ones go to .trash, inside their original folders; nothing is deleted.',
	'modal.orphans.all': 'Select all',
	'modal.orphans.none': 'Select none',
	'modal.orphans.select': 'Select {name}',
	'modal.orphans.confirm': 'Move {count} to .trash',

	'settings.new.heading': 'New attachments',
	'settings.organize.name': 'Organize automatically',
	'settings.organize.desc':
		'Pasted, dropped and recorded files, and files that appear outside the attachments folder, go to it with the naming rule; covers get the cover name. When off, the "Default location for new attachments" of Obsidian applies.',
	'settings.folder.name': 'Attachments folder',
	'settings.folder.desc': 'Every attachment goes here. Its subfolders count as inside.',
	'settings.pattern.name': 'Name for generic files',
	'settings.pattern.desc':
		'Used when the original name says nothing (Pasted image, IMG_1234, logo). Descriptive names are kept. Variables: {list}. {note} is the note the file was added to (its folder for index notes, the date when there is none); {n} counts from 1.',
	'settings.example.name': 'Example',
	'settings.example.note': 'Quarterly report',
	'settings.example.desc': 'An image pasted in the note "{note}" becomes {name}.',
	'settings.generic.name': 'Generic names',
	'settings.generic.desc':
		'One per line. Compared without accents, case, numbers and separators: "image" also matches "Image (2)" and "image_20260930", and names made only of numbers are always generic.',
	'settings.maxSize.name': 'Size warning',
	'settings.maxSize.desc': 'Warn when a new attachment is larger than this, in MB. 0 turns the warning off.',
	'settings.cover.heading': 'Covers',
	'settings.coverProperty.name': 'Cover property',
	'settings.coverProperty.desc':
		'When this property links to an attachment ("[[image.png]]") that no other note uses, the attachment is renamed to <note>-cover. Empty turns it off.',
	'settings.ai.heading': 'AI-generated notes',
	'settings.aiTag.name': 'Tag',
	'settings.aiTag.desc': 'Notes with this tag, in the properties or in the text, keep their attachments in a separate folder.',
	'settings.aiFolder.name': 'Folder',
	'settings.aiFolder.desc': 'Empty keeps them in the attachments folder.',
	'settings.exceptions.heading': 'Exceptions',
	'settings.ignored.name': 'Ignored folders',
	'settings.ignored.desc':
		'One per line. Attachments in them are never moved or listed, and notes in them use the attachment location of Obsidian.',
	'settings.tools.heading': 'Tools',
	'settings.collect.name': 'Collect loose attachments',
	'settings.collect.desc': 'Move every attachment outside the attachments folder into it, after showing the list.',
	'settings.orphans.name': 'List orphan attachments',
	'settings.orphans.desc': 'Attachments no note, canvas or base points to. The ones you select go to .trash.',

	'validation.folder.empty': 'Enter a folder.',
	'validation.folder.hidden': 'Hidden folders (starting with ".") are not part of the vault.',
	'validation.pattern.empty': 'The name cannot be empty.',
	'validation.pattern.slash': 'Enter only a name, without "/".',
	'validation.pattern.unknown': 'Unknown variable: {names}.',
	'validation.size': 'Enter a number from 0 to {max}.',
} satisfies Messages;
