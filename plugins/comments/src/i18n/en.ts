import type { Messages } from '@obsidian-plugins/i18n';

/**
 * Source catalog (English). Every user-facing string of the plugin lives here,
 * keyed by prefix: `command.`, `settings.`, `notice.`, `panel.`...
 */
export const en = {
	'view.title': 'Comments',

	'command.commentSelection': 'Comment on selection',
	'command.openPanel': 'Open comments',
	'command.openFile': 'Open the comments file of this note',
	'menu.comment': 'Comment',

	'modal.title': 'New comment',
	'modal.wholeBlock': 'No text selected: the comment applies to the whole block.',
	'modal.existing': 'This block already has a conversation: the comment is added to it.',
	'modal.existingResolved': 'This block has a resolved conversation: the comment reopens it.',
	'modal.placeholder': 'Write a comment…',
	'modal.hint': '{key}+Enter sends.',
	'modal.cancel': 'Cancel',
	'modal.submit': 'Comment',

	'notice.frontmatter': 'Comments cannot be attached to the properties of a note.',
	'notice.empty': 'Put the cursor on a line with text to comment on it.',
	'notice.commentsFile': 'This is a comments file: comment on the note itself.',
	'notice.saveFailed': 'Could not save the comment. See the developer console for details.',
	'notice.threadMissing': 'This conversation is no longer in the comments file.',
	'notice.noComments': 'This note has no comments yet.',

	'panel.noNote': 'Open a note to see its comments.',
	'panel.commentsFile': 'This is a comments file. Open its note to see the conversations.',
	'panel.none': 'No comments on this note. Select a passage and use "Comment on selection".',
	'panel.allResolved.one': 'No open comments. 1 resolved.',
	'panel.allResolved.other': 'No open comments. {count} resolved.',
	'panel.open.one': '1 open',
	'panel.open.other': '{count} open',
	'panel.resolved.one': '1 resolved',
	'panel.resolved.other': '{count} resolved',
	'panel.onlyOpen': 'Only open',
	'panel.openFile': 'Open comments file',
	'panel.goTo': 'Go to the passage',
	'panel.wholeBlock': 'Whole block',
	'panel.orphan': 'Passage deleted',
	'panel.orphanDesc': 'The block this conversation pointed to is no longer in the note.',
	'panel.resolvedBadge': 'Resolved',
	'panel.ai': 'AI',
	'panel.reply': 'Reply',
	'panel.replyPlaceholder': 'Reply…',
	'panel.send': 'Send',
	'panel.cancel': 'Cancel',
	'panel.resolve': 'Resolve',
	'panel.reopen': 'Reopen',

	'status.one': '1 comment',
	'status.other': '{count} comments',
	'status.tooltip': 'Open comments on this note. Click to open the panel.',

	'editor.openThread': 'Open the comment',

	'settings.storage.heading': 'Storage',
	'settings.folder.name': 'Comments folder',
	'settings.folder.desc':
		'One markdown file per note, linked to it by the "note" property. Changing the folder does not move existing files.',
	'settings.author.name': 'Your name in comments',
	'settings.author.desc': 'Written as the author of your comments and replies. AI agents sign as "ia" or "ai".',
	'settings.display.heading': 'Display',
	'settings.highlight.name': 'Highlight commented passages',
	'settings.highlight.desc':
		'Marks passages with open comments in the editor and, in live preview, shows an icon in place of the block ID.',
	'settings.statusBar.name': 'Count in the status bar',
	'settings.statusBar.desc': 'Shows how many open comments the active note has.',

	'validation.folder': 'Enter a folder.',
	'validation.author': 'Enter a name.',

	'defaults.author': 'me',
} satisfies Messages;
