import type { SettingDefinition, SettingDefinitionGroup, SettingDefinitionItem, SettingDefinitionPage } from 'obsidian';
import { describePatternError } from '../archive/describe';
import { profileTooBroad } from '../archive/planner';
import { t } from '../i18n';
import { ALLOWED_TOKENS, parsePattern } from '../patterns/pattern';
import type { PatternKind } from '../patterns/pattern';
import { key } from './bindings';
import type { ProfileField } from './bindings';
import { MAX_AFTER_DAYS, MAX_COLLAPSE_ABOVE, MAX_INTERVAL_HOURS, MAX_STARTUP_DELAY_SECONDS } from './model';
import type { BoardProfile, BoardSettings } from './model';

/** What the definitions need from the settings tab. */
export interface DefinitionContext {
	settings: BoardSettings;
	addProfile(): void;
	duplicateProfile(id: string): void;
	moveProfile(from: number, to: number): void;
	removeProfile(index: number): void;
	previewArchive(): void;
	archiveNow(): void;
}

const tokenList = (kind: PatternKind): string => ALLOWED_TOKENS[kind].map((token) => (token === 'date' ? '{date:YYYY-MM-DD}' : `{${token}}`)).join(' ');

function patternError(value: string, kind: PatternKind): string | undefined {
	const parsed = parsePattern(value, kind);
	return parsed.ok ? undefined : describePatternError(parsed.error);
}

const required = (message: string) => (value: string): string | undefined => (value.trim() ? undefined : message);

/** True when a stored pattern is invalid (e.g. edited by hand in data.json). */
export function profileHasInvalidPattern(profile: BoardProfile): boolean {
	return (
		(profile.archive.enabled && profileTooBroad(profile)) ||
		!parsePattern(profile.archive.folderPattern, 'archiveFolder').ok ||
		!parsePattern(profile.newCard.folderPattern, 'newCardFolder').ok ||
		!parsePattern(profile.newCard.fileNamePattern, 'fileName').ok
	);
}

function summary(profile: BoardProfile): string {
	const parts: string[] = [];
	parts.push(profile.cardTag ? `#${profile.cardTag}` : t('settings.profile.summary.anyNote'));
	if (profile.archive.enabled && profileTooBroad(profile)) parts.push(t('pattern.noCriteria'));
	parts.push(
		profile.archive.enabled
			? t('settings.profile.summary.archive', { days: profile.archive.afterDays })
			: t('settings.profile.summary.noArchive'),
	);
	if (profileHasInvalidPattern(profile)) parts.push(t('settings.profile.summary.invalid'));
	return parts.join(' · ');
}

function text(id: string, field: ProfileField, name: string, desc: string, placeholder = '', validate?: (value: string) => string | undefined): SettingDefinition {
	return { name, desc, control: { type: 'text', key: key.profile(id, field), placeholder, validate } };
}

function pattern(id: string, field: ProfileField, kind: PatternKind, name: string, desc: string, placeholder: string): SettingDefinition {
	return {
		name,
		desc: `${desc} ${t('settings.tokens', { tokens: tokenList(kind) })}`,
		control: { type: 'text', key: key.profile(id, field), placeholder, validate: (value) => patternError(value, kind) },
	};
}

function profilePage(context: DefinitionContext, profile: BoardProfile): SettingDefinitionPage {
	const id = profile.id;
	return {
		type: 'page',
		// Getters and functions, so the list shows current values after an edit.
		get name() {
			return profile.name || id;
		},
		displayValue: () => summary(profile),
		status: () => (profileHasInvalidPattern(profile) ? 'warning' : null),
		items: [
			{
				type: 'group',
				items: [
					text(id, 'name', t('settings.profile.name.name'), t('settings.profile.name.desc'), '', required(t('validation.profileName'))),
					{ name: t('settings.profile.id.name'), desc: t('settings.profile.id.desc', { id }) },
					{
						name: t('settings.profile.duplicate.name'),
						desc: t('settings.profile.duplicate.desc'),
						action: () => context.duplicateProfile(id),
					},
				],
			},
			{
				type: 'group',
				heading: t('settings.profile.match.heading'),
				items: [
					text(id, 'cardTag', t('settings.profile.cardTag.name'), t('settings.profile.cardTag.desc'), 'card'),
					{
						name: t('settings.profile.includeFolders.name'),
						desc: t('settings.profile.includeFolders.desc'),
						control: { type: 'textarea', key: key.profile(id, 'includeFolders'), placeholder: 'Work/**', rows: 3 },
					},
					{
						name: t('settings.profile.excludeFolders.name'),
						desc: t('settings.profile.excludeFolders.desc'),
						control: { type: 'textarea', key: key.profile(id, 'excludeFolders'), placeholder: '_Templates', rows: 3 },
					},
				],
			},
			{
				type: 'group',
				heading: t('settings.profile.properties.heading'),
				items: [
					text(id, 'statusProperty', t('settings.profile.statusProperty.name'), t('settings.profile.statusProperty.desc'), 'status', required(t('validation.required'))),
					text(id, 'doneValue', t('settings.profile.doneValue.name'), t('settings.profile.doneValue.desc'), 'done', required(t('validation.required'))),
					text(id, 'completedProperty', t('settings.profile.completedProperty.name'), t('settings.profile.completedProperty.desc'), 'completed'),
					{
						name: t('settings.profile.completedFormat.name'),
						desc: t('settings.profile.completedFormat.desc'),
						control: {
							type: 'dropdown',
							key: key.profile(id, 'completedFormat'),
							options: { date: t('settings.profile.completedFormat.date'), datetime: t('settings.profile.completedFormat.datetime') },
						},
					},
					text(id, 'projectProperty', t('settings.profile.projectProperty.name'), t('settings.profile.projectProperty.desc'), 'project'),
				],
			},
			{
				type: 'group',
				heading: t('settings.profile.hierarchy.heading'),
				items: [
					{
						name: t('settings.profile.hierarchyEnabled.name'),
						desc: t('settings.profile.hierarchyEnabled.desc'),
						control: { type: 'toggle', key: key.profile(id, 'hierarchy.enabled') },
					},
					text(id, 'parentProperty', t('settings.profile.parentProperty.name'), t('settings.profile.parentProperty.desc'), 'parent'),
					text(id, 'orderProperty', t('settings.profile.orderProperty.name'), t('settings.profile.orderProperty.desc'), 'order'),
					text(id, 'blockedByProperty', t('settings.profile.blockedByProperty.name'), t('settings.profile.blockedByProperty.desc'), 'blocked_by'),
					text(id, 'typeProperty', t('settings.profile.typeProperty.name'), t('settings.profile.typeProperty.desc'), 'type'),
					text(id, 'hierarchy.specValue', t('settings.profile.specValue.name'), t('settings.profile.specValue.desc'), 'spec'),
					{
						name: t('settings.profile.countArchived.name'),
						desc: t('settings.profile.countArchived.desc'),
						control: { type: 'toggle', key: key.profile(id, 'hierarchy.countArchived') },
					},
					{
						name: t('settings.profile.collapseAbove.name'),
						desc: t('settings.profile.collapseAbove.desc'),
						control: { type: 'number', key: key.profile(id, 'hierarchy.collapseAbove'), min: 0, max: MAX_COLLAPSE_ABOVE, step: 1 },
					},
					{
						name: t('settings.profile.showOnProjects.name'),
						desc: t('settings.profile.showOnProjects.desc'),
						control: { type: 'toggle', key: key.profile(id, 'hierarchy.showOnProjects') },
					},
				],
			},
			{
				type: 'group',
				heading: t('settings.profile.archive.heading'),
				items: [
					{
						name: t('settings.profile.archiveEnabled.name'),
						desc: t('settings.profile.archiveEnabled.desc'),
						control: { type: 'toggle', key: key.profile(id, 'archive.enabled') },
					},
					{
						name: t('settings.profile.afterDays.name'),
						desc: t('settings.profile.afterDays.desc'),
						control: { type: 'number', key: key.profile(id, 'archive.afterDays'), min: 0, max: MAX_AFTER_DAYS, step: 1 },
					},
					pattern(id, 'archive.folderPattern', 'archiveFolder', t('settings.profile.archiveFolder.name'), t('settings.profile.archiveFolder.desc'), '{cardFolder}/Archived'),
					{
						name: t('settings.profile.missingCompleted.name'),
						desc: t('settings.profile.missingCompleted.desc'),
						control: {
							type: 'dropdown',
							key: key.profile(id, 'archive.missingCompleted'),
							options: {
								skip: t('settings.profile.missingCompleted.skip'),
								useModified: t('settings.profile.missingCompleted.useModified'),
							},
						},
					},
					text(id, 'archive.recordOriginProperty', t('settings.profile.recordOrigin.name'), t('settings.profile.recordOrigin.desc'), 'archived_from'),
				],
			},
			{
				type: 'group',
				heading: t('settings.profile.newCard.heading'),
				items: [
					pattern(id, 'newCard.folderPattern', 'newCardFolder', t('settings.profile.newCardFolder.name'), t('settings.profile.newCardFolder.desc'), '{projectFolder}/_Tasks'),
					{
						name: t('settings.profile.fallbackFolder.name'),
						desc: t('settings.profile.fallbackFolder.desc'),
						control: { type: 'folder', key: key.profile(id, 'newCard.fallbackFolder'), placeholder: t('settings.profile.fallbackFolder.placeholder') },
					},
					pattern(id, 'newCard.fileNamePattern', 'fileName', t('settings.profile.fileName.name'), t('settings.profile.fileName.desc'), '{date:YYYY-MM-DD}-{slug}'),
					{
						name: t('settings.profile.template.name'),
						desc: t('settings.profile.template.desc'),
						control: {
							type: 'file',
							key: key.profile(id, 'newCard.templatePath'),
							placeholder: '_Templates/card.md',
							filter: (file) => file.extension === 'md',
						},
					},
					text(id, 'newCard.defaultType', t('settings.profile.defaultType.name'), t('settings.profile.defaultType.desc'), 'task'),
				],
			},
		],
	};
}

function archiveGroup(context: DefinitionContext): SettingDefinitionGroup {
	return {
		type: 'group',
		heading: t('settings.archive.heading'),
		items: [
			{
				name: t('settings.archive.enabled.name'),
				desc: t('settings.archive.enabled.desc'),
				control: { type: 'toggle', key: key.archive('enabled') },
			},
			{
				name: t('settings.archive.runOnStartup.name'),
				desc: t('settings.archive.runOnStartup.desc'),
				control: { type: 'toggle', key: key.archive('runOnStartup') },
			},
			{
				name: t('settings.archive.startupDelay.name'),
				desc: t('settings.archive.startupDelay.desc'),
				control: { type: 'number', key: key.archive('startupDelaySeconds'), min: 0, max: MAX_STARTUP_DELAY_SECONDS, step: 1 },
			},
			{
				name: t('settings.archive.interval.name'),
				desc: t('settings.archive.interval.desc'),
				control: { type: 'number', key: key.archive('intervalHours'), min: 0, max: MAX_INTERVAL_HOURS, step: 1 },
			},
			{
				name: t('settings.archive.maxPerRun.name'),
				desc: t('settings.archive.maxPerRun.desc'),
				control: { type: 'number', key: key.archive('maxPerRun'), min: 1, step: 1 },
			},
			{
				name: t('settings.archive.confirmFirstRun.name'),
				desc: t('settings.archive.confirmFirstRun.desc'),
				control: { type: 'toggle', key: key.archive('confirmFirstRun') },
			},
			{
				name: t('settings.archive.notify.name'),
				desc: t('settings.archive.notify.desc'),
				control: { type: 'toggle', key: key.archive('notify') },
			},
			{
				name: t('settings.archive.preview.name'),
				desc: t('settings.archive.preview.desc'),
				action: () => context.previewArchive(),
			},
			{
				name: t('settings.archive.now.name'),
				desc: t('settings.archive.now.desc'),
				action: () => context.archiveNow(),
			},
		],
	};
}

export function settingDefinitions(context: DefinitionContext): SettingDefinitionItem[] {
	return [
		archiveGroup(context),
		{
			type: 'list',
			heading: t('settings.profiles.heading'),
			emptyState: t('settings.profiles.empty'),
			addItem: { name: t('settings.profiles.add'), action: () => context.addProfile() },
			onReorder: (from, to) => context.moveProfile(from, to),
			onDelete: (index) => context.removeProfile(index),
			items: context.settings.profiles.map((profile) => profilePage(context, profile)),
		},
	];
}
