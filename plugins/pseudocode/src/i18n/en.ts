import type { Messages } from '@obsidian-plugins/i18n';

/**
 * Source catalog (English). Every user-facing string of the plugin lives here.
 * Keywords of the rendered algorithms ("if", "end for") are not here: they are
 * content and follow the "Pseudocode language" setting (src/render/keywords.ts).
 */
export const en = {
	'command.insert': 'Insert pseudocode block',
	'command.insertAlgorithm2e': 'Insert pseudocode block (algorithm2e)',
	'command.copyLatex': 'Copy pseudocode block as LaTeX',

	'block.copy': 'Copy as LaTeX',
	'block.empty': 'Empty pseudocode block.',

	'notice.copied': 'LaTeX copied to the clipboard.',
	'notice.copyFailed': 'Could not copy to the clipboard.',
	'notice.noBlock': 'Place the cursor inside a pseudo code block.',
	'notice.invalid': 'This block has an error. Fix it before exporting.',

	'error.title': 'Pseudocode error',
	'error.line': 'Line {line}: {message}',
	'error.expected': 'expected {expected}, found {found}.',
	'error.unexpected': '{found} is out of place here.',
	'error.endOfBlock': 'the block ends before {expected}.',
	'error.endOfBlockEmpty': 'the block ends too early.',
	'error.unknownCommand': 'unknown command {name}.',
	'error.unknownEnvironment': 'unknown environment {name}.',
	'error.unclosedMath': 'math not closed with {delimiter}.',
	'error.unsupported': '{name} is not supported.',

	'ref.missing': 'No algorithm with the label {label} in this note.',
	'ref.goTo': 'Go to {title}',

	'settings.appearance.heading': 'Appearance',
	'settings.numberAlgorithms.name': 'Number algorithms',
	'settings.numberAlgorithms.desc':
		'Captions read "Algorithm 1", "Algorithm 2"... in the order of the note. Off, they read "Algorithm" and the title, as in the community plugin. References (\\ref) always use the numbers.',
	'settings.lineNumbers.name': 'Line numbers',
	'settings.lineNumbers.desc':
		'Number the lines of every algorithm. A block can override it with \\begin{algorithmic}[0] or [1], or with \\LinesNumbered in algorithm2e.',
	'settings.punctuation.name': 'After the line number',
	'settings.punctuation.desc': 'Text shown after each line number, as in "1:".',
	'settings.indent.name': 'Indentation',
	'settings.indent.desc': 'Width of each indentation level, in em.',
	'settings.scopeLines.name': 'Scope lines',
	'settings.scopeLines.desc':
		'Vertical lines along the body of each block. In algorithm2e, \\SetAlgoLined and \\SetAlgoVlined turn them on for the block.',
	'settings.showEnd.name': 'Block ends',
	'settings.showEnd.desc':
		'Show lines like "end if" and "end for". In algorithm2e, \\SetAlgoNoEnd and \\SetAlgoVlined hide them for the block.',
	'settings.comment.name': 'Comment delimiter',
	'settings.comment.desc': 'Shown before comments (\\Comment, \\tcp).',
	'settings.language.heading': 'Language',
	'settings.keywords.name': 'Pseudocode language',
	'settings.keywords.desc':
		'Language of keywords such as "if", "for" and "return", and of the caption ("Algorithm 1"). What you write in the block never changes.',
	'settings.keywords.en': 'English',
	'settings.keywords.ptBR': 'Português',
	'settings.export.heading': 'LaTeX export',
	'settings.exportDocument.name': 'Complete document',
	'settings.exportDocument.desc':
		'Copy a compilable document with the algorithm2e preamble instead of only the algorithm environment.',

	'validation.indent': 'Enter a number between {min} and {max}.',
} satisfies Messages;
