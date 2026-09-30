import type { VaultRules } from '../types';

/**
 * The rules of the vault's `CLAUDE.md` (§2 and §4) as of 2026-09. Folder
 * names, tags and words matched in names: data, never translated.
 */
export function defaultRules(): VaultRules {
	return {
		indexRoots: ['1 - Knowledge'],
		indexDepth: 2,
		indexTemplate: '',
		scaffold: [
			'_Discovery/AI Generated',
			'_References/Books',
			'_References/Links',
			'_References/Videos',
			'_References/Repos',
		],
		vocabulary: ['DB', 'Archived'],
		minorWords: [
			// English
			'a',
			'an',
			'and',
			'as',
			'at',
			'but',
			'by',
			'for',
			'in',
			'of',
			'on',
			'or',
			'the',
			'to',
			'vs',
			'via',
			// Portuguese (proper names such as "Análise e Projeto de Algoritmos")
			'e',
			'o',
			'os',
			'as',
			'de',
			'da',
			'das',
			'do',
			'dos',
			'em',
			'na',
			'nas',
			'no',
			'nos',
			'com',
			'para',
			'por',
		].filter((word, index, all) => all.indexOf(word) === index),
		aiTag: 'ai-generated',
		aiFolder: '_Discovery/AI Generated',
		ignore: ['Inbox', 'CLAUDE.md'],
	};
}
