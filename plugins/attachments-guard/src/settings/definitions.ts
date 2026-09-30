import { moment } from 'obsidian';
import type { Setting, SettingDefinition, SettingDefinitionItem } from 'obsidian';
import { CLS, DEFAULT_AI_FOLDER, DEFAULT_AI_TAG, DEFAULT_COVER_PROPERTY, DEFAULT_FOLDER, DEFAULT_PATTERN, MAX_SIZE_MB } from '../constants';
import { t } from '../i18n';
import { genericKeys } from '../naming/generic';
import { attachmentName } from '../naming/names';
import { VARIABLES } from '../naming/pattern';
import { noteSlug } from '../naming/slug';
import type { AttachmentsGuardSettings } from '../types';
import { key } from './bindings';
import { folderError, isValidSize, patternError } from './settings';

const SLOT = '\u0000';

/** What the definitions need from the settings tab. */
export interface DefinitionContext {
	settings: AttachmentsGuardSettings;
	/** Refreshers of the example row, called after each edit. */
	previews: Set<() => void>;
	collect(): void;
	listOrphans(): void;
}

/** "An image pasted in the note "Quarterly report" becomes `Attachments/quarterly-report-1.png`." */
function exampleFragment(settings: AttachmentsGuardSettings): DocumentFragment {
	const note = t('settings.example.note');
	const base = attachmentName({
		basename: 'Pasted image 20260930101010',
		extension: 'png',
		note: noteSlug(`${note}.md`) || null,
		date: moment().format('YYYY-MM-DD'),
		pattern: settings.pattern,
		genericKeys: genericKeys(settings.genericNames),
		taken: () => false,
		basenames: [],
	});
	// The path goes in a <code>, wherever the translation puts it.
	const [before = '', after = ''] = t('settings.example.desc', { note, name: SLOT }).split(SLOT);
	return createFragment((fragment) => {
		fragment.appendText(before);
		fragment.createEl('code', { cls: CLS.example, text: `${settings.folder}/${base}.png` });
		fragment.appendText(after);
	});
}

function exampleRow(context: DefinitionContext): SettingDefinition {
	return {
		name: t('settings.example.name'),
		searchable: false,
		render: (setting: Setting) => {
			const refresh = () => {
				setting.setDesc(exampleFragment(context.settings));
			};
			refresh();
			context.previews.add(refresh);
			return () => {
				context.previews.delete(refresh);
			};
		},
	};
}

export function settingDefinitions(context: DefinitionContext): SettingDefinitionItem[] {
	const variables = VARIABLES.map((name) => `{${name}}`).join(' ');
	return [
		{
			type: 'group',
			heading: t('settings.new.heading'),
			items: [
				{
					name: t('settings.organize.name'),
					desc: t('settings.organize.desc'),
					control: { type: 'toggle', key: key.organize },
				},
				{
					name: t('settings.folder.name'),
					desc: t('settings.folder.desc'),
					control: {
						type: 'folder',
						key: key.folder,
						placeholder: DEFAULT_FOLDER,
						validate: (value) => folderError(value, true),
					},
				},
				{
					name: t('settings.pattern.name'),
					desc: t('settings.pattern.desc', { list: variables }),
					control: { type: 'text', key: key.pattern, placeholder: DEFAULT_PATTERN, validate: patternError },
				},
				exampleRow(context),
				{
					name: t('settings.generic.name'),
					desc: t('settings.generic.desc'),
					control: { type: 'textarea', key: key.genericNames, rows: 6 },
				},
				{
					name: t('settings.maxSize.name'),
					desc: t('settings.maxSize.desc'),
					control: {
						type: 'number',
						key: key.maxSizeMb,
						min: 0,
						max: MAX_SIZE_MB,
						step: 'any',
						validate: (value) => (isValidSize(value) ? undefined : t('validation.size', { max: MAX_SIZE_MB })),
					},
				},
			],
		},
		{
			type: 'group',
			heading: t('settings.cover.heading'),
			items: [
				{
					name: t('settings.coverProperty.name'),
					desc: t('settings.coverProperty.desc'),
					control: { type: 'text', key: key.coverProperty, placeholder: DEFAULT_COVER_PROPERTY },
				},
			],
		},
		{
			type: 'group',
			heading: t('settings.ai.heading'),
			items: [
				{
					name: t('settings.aiTag.name'),
					desc: t('settings.aiTag.desc'),
					control: { type: 'text', key: key.aiTag, placeholder: DEFAULT_AI_TAG },
				},
				{
					name: t('settings.aiFolder.name'),
					desc: t('settings.aiFolder.desc'),
					control: {
						type: 'folder',
						key: key.aiFolder,
						placeholder: DEFAULT_AI_FOLDER,
						validate: (value) => folderError(value, false),
					},
				},
			],
		},
		{
			type: 'group',
			heading: t('settings.exceptions.heading'),
			items: [
				{
					name: t('settings.ignored.name'),
					desc: t('settings.ignored.desc'),
					control: { type: 'textarea', key: key.ignoredFolders, placeholder: '_Templates', rows: 3 },
				},
			],
		},
		{
			type: 'group',
			heading: t('settings.tools.heading'),
			items: [
				{
					name: t('settings.collect.name'),
					desc: t('settings.collect.desc'),
					action: () => context.collect(),
				},
				{
					name: t('settings.orphans.name'),
					desc: t('settings.orphans.desc'),
					action: () => context.listOrphans(),
				},
			],
		},
	];
}
