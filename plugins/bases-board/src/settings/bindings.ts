import { MAX_AFTER_DAYS, MAX_COLLAPSE_ABOVE, MAX_INTERVAL_HOURS, MAX_STARTUP_DELAY_SECONDS } from './model';
import type { ArchiveSettings, BoardProfile, BoardSettings } from './model';

/**
 * Control keys of the declarative settings tab, mapped onto the settings
 * object: "archive.<field>" (global) and "profile.<id>.<field>" where field
 * may be nested ("archive.afterDays", "newCard.folderPattern").
 */
export const key = {
	archive: (field: keyof ArchiveSettings) => `archive.${field}`,
	profile: (id: string, field: ProfileField) => `profile.${id}.${field}`,
};

type FieldKind = 'text' | 'tag' | 'lines' | 'bool' | 'number' | 'completedFormat' | 'missingCompleted';

const PROFILE_FIELDS = {
	name: 'text',
	cardTag: 'tag',
	includeFolders: 'lines',
	excludeFolders: 'lines',
	statusProperty: 'text',
	doneValue: 'text',
	completedProperty: 'text',
	completedFormat: 'completedFormat',
	projectProperty: 'text',
	parentProperty: 'text',
	orderProperty: 'text',
	blockedByProperty: 'text',
	typeProperty: 'text',
	'hierarchy.enabled': 'bool',
	'hierarchy.countArchived': 'bool',
	'hierarchy.collapseAbove': 'number',
	'hierarchy.showOnProjects': 'bool',
	'hierarchy.specValue': 'text',
	'archive.enabled': 'bool',
	'archive.afterDays': 'number',
	'archive.folderPattern': 'text',
	'archive.missingCompleted': 'missingCompleted',
	'archive.recordOriginProperty': 'text',
	'newCard.folderPattern': 'text',
	'newCard.fallbackFolder': 'text',
	'newCard.fileNamePattern': 'text',
	'newCard.templatePath': 'text',
	'newCard.defaultType': 'text',
} as const satisfies Record<string, FieldKind>;

export type ProfileField = keyof typeof PROFILE_FIELDS;

const ARCHIVE_FIELDS: Record<keyof ArchiveSettings, FieldKind> = {
	enabled: 'bool',
	runOnStartup: 'bool',
	startupDelaySeconds: 'number',
	intervalHours: 'number',
	maxPerRun: 'number',
	confirmFirstRun: 'bool',
	notify: 'bool',
};

const MIN: Partial<Record<string, number>> = { maxPerRun: 1 };
const MAX: Partial<Record<string, number>> = {
	intervalHours: MAX_INTERVAL_HOURS,
	startupDelaySeconds: MAX_STARTUP_DELAY_SECONDS,
	'archive.afterDays': MAX_AFTER_DAYS,
	'hierarchy.collapseAbove': MAX_COLLAPSE_ABOVE,
};

/** Fields whose change can alter which cards a profile archives: confirmation is asked again. */
export const CRITERIA_FIELDS: ReadonlySet<string> = new Set([
	'cardTag',
	'includeFolders',
	'excludeFolders',
	'statusProperty',
	'doneValue',
	'completedProperty',
	'archive.enabled',
	'archive.afterDays',
	'archive.folderPattern',
	'archive.missingCompleted',
]);

function coerce(kind: FieldKind, value: unknown, field: string): unknown {
	const text = typeof value === 'string' ? value : '';
	switch (kind) {
		case 'bool':
			return value === true;
		case 'number': {
			// Empty or invalid input keeps the stored value (undefined = no change):
			// 0 days would mean "archive everything done before today".
			const n = typeof value === 'number' ? value : text.trim() === '' ? NaN : Number(text);
			if (!Number.isFinite(n)) return undefined;
			return Math.min(MAX[field] ?? Number.MAX_SAFE_INTEGER, Math.max(MIN[field] ?? 0, Math.floor(n)));
		}
		case 'lines':
			return text
				.split(/[\n,]/)
				.map((line) => line.trim())
				.filter(Boolean);
		case 'tag':
			return text.trim().replace(/^#/, '');
		case 'completedFormat':
			return text === 'datetime' ? 'datetime' : 'date';
		case 'missingCompleted':
			return text === 'useModified' ? 'useModified' : 'skip';
		case 'text':
			return text.trim();
	}
}

function parseProfileKey(settings: BoardSettings, controlKey: string): { profile: BoardProfile; field: ProfileField } | null {
	if (!controlKey.startsWith('profile.')) return null;
	const rest = controlKey.slice('profile.'.length);
	const dot = rest.indexOf('.');
	if (dot < 0) return null;
	const profile = settings.profiles.find((candidate) => candidate.id === rest.slice(0, dot));
	const field = rest.slice(dot + 1);
	return profile && field in PROFILE_FIELDS ? { profile, field: field as ProfileField } : null;
}

/** Read and write "a.b" paths on a profile. */
function getPath(target: Record<string, unknown>, path: string): unknown {
	return path.split('.').reduce<unknown>((node, part) => (node as Record<string, unknown> | undefined)?.[part], target);
}

function setPath(target: Record<string, unknown>, path: string, value: unknown): void {
	const parts = path.split('.');
	const last = parts.pop() as string;
	const parent = parts.reduce<Record<string, unknown>>((node, part) => node[part] as Record<string, unknown>, target);
	parent[last] = value;
}

export function readSetting(settings: BoardSettings, controlKey: string): unknown {
	if (controlKey.startsWith('archive.')) {
		return settings.archive[controlKey.slice('archive.'.length) as keyof ArchiveSettings];
	}
	const parsed = parseProfileKey(settings, controlKey);
	if (!parsed) return undefined;
	const value = getPath(parsed.profile as unknown as Record<string, unknown>, parsed.field);
	return PROFILE_FIELDS[parsed.field] === 'lines' && Array.isArray(value) ? value.join('\n') : value;
}

export function writeSetting(settings: BoardSettings, controlKey: string, value: unknown): void {
	if (controlKey.startsWith('archive.')) {
		const field = controlKey.slice('archive.'.length) as keyof ArchiveSettings;
		const kind = ARCHIVE_FIELDS[field];
		const coerced = kind ? coerce(kind, value, field) : undefined;
		if (coerced !== undefined) (settings.archive as unknown as Record<string, unknown>)[field] = coerced;
		return;
	}
	const parsed = parseProfileKey(settings, controlKey);
	if (!parsed) return;
	const coerced = coerce(PROFILE_FIELDS[parsed.field], value, parsed.field);
	if (coerced !== undefined) setPath(parsed.profile as unknown as Record<string, unknown>, parsed.field, coerced);
}

/** The profile id when the key edits one of its archiving criteria, else null. */
export function criteriaProfileId(settings: BoardSettings, controlKey: string): string | null {
	const parsed = parseProfileKey(settings, controlKey);
	return parsed && CRITERIA_FIELDS.has(parsed.field) ? parsed.profile.id : null;
}
