import { t } from '../i18n';

export type CompletedFormat = 'date' | 'datetime';
export type MissingCompleted = 'skip' | 'useModified';

/** Global archiving settings (apply to every profile). */
export interface ArchiveSettings {
	enabled: boolean;
	runOnStartup: boolean;
	startupDelaySeconds: number;
	/** 0 = only on startup and by command. */
	intervalHours: number;
	/** Safety cap: files moved per run, across all profiles. */
	maxPerRun: number;
	/** First run of each profile shows a preview and waits for confirmation. */
	confirmFirstRun: boolean;
	notify: boolean;
}

export interface ProfileArchive {
	enabled: boolean;
	afterDays: number;
	folderPattern: string;
	missingCompleted: MissingCompleted;
	/** Frontmatter key that stores the origin folder when archiving ('' = off). */
	recordOriginProperty: string;
}

export interface ProfileNewCard {
	folderPattern: string;
	/** Folder for cards without a project ('' = ask). */
	fallbackFolder: string;
	fileNamePattern: string;
	templatePath: string;
	defaultType: string;
}

/** How to recognize, write, archive and create the cards of one board. */
export interface BoardProfile {
	/** Stable id, referenced by views (`profile:` in the .base file). Never changes. */
	id: string;
	name: string;
	/** Tag without "#" ('' = any note). Nested tags match too. */
	cardTag: string;
	includeFolders: string[];
	excludeFolders: string[];
	statusProperty: string;
	doneValue: string;
	completedProperty: string;
	completedFormat: CompletedFormat;
	projectProperty: string;
	archive: ProfileArchive;
	newCard: ProfileNewCard;
}

export interface BoardSettings {
	archive: ArchiveSettings;
	/** At least one; the first is the default. */
	profiles: BoardProfile[];
	/** Profiles whose first archive run was confirmed by the user. */
	confirmedProfiles: string[];
}

export const DEFAULT_PROFILE_ID = 'default';

/** Timer limits: delays above 2^31-1 ms (~24.8 days) fire immediately in browsers. */
export const MAX_INTERVAL_HOURS = 576;
export const MAX_STARTUP_DELAY_SECONDS = 3600;
export const MAX_AFTER_DAYS = 36500;

export function defaultArchiveSettings(): ArchiveSettings {
	return {
		enabled: true,
		runOnStartup: true,
		startupDelaySeconds: 30,
		intervalHours: 24,
		maxPerRun: 50,
		confirmFirstRun: true,
		notify: true,
	};
}

/**
 * A profile with the vault conventions as defaults: cards tagged `card` in the
 * project's `_Tasks/`, archived to `<card folder>/Archived` after 30 days.
 * The name is translated once, when the profile is created.
 */
export function defaultProfile(id = DEFAULT_PROFILE_ID, name = t('defaults.profileName')): BoardProfile {
	return {
		id,
		name,
		cardTag: 'card',
		includeFolders: [],
		excludeFolders: ['_Templates'],
		statusProperty: 'status',
		doneValue: 'done',
		completedProperty: 'completed',
		completedFormat: 'date',
		projectProperty: 'project',
		archive: {
			enabled: true,
			afterDays: 30,
			folderPattern: '{cardFolder}/Archived',
			missingCompleted: 'skip',
			recordOriginProperty: '',
		},
		newCard: {
			folderPattern: '{projectFolder}/_Tasks',
			fallbackFolder: '',
			fileNamePattern: '{date:YYYY-MM-DD}-{slug}',
			templatePath: '',
			defaultType: 'task',
		},
	};
}

export function defaultSettings(): BoardSettings {
	return { archive: defaultArchiveSettings(), profiles: [defaultProfile()], confirmedProfiles: [] };
}

// ---- normalization of data.json -------------------------------------------

type Rec = Record<string, unknown>;

const isRecord = (value: unknown): value is Rec => typeof value === 'object' && value !== null && !Array.isArray(value);

function str(value: unknown, fallback: string): string {
	return typeof value === 'string' ? value.trim() : fallback;
}

function bool(value: unknown, fallback: boolean): boolean {
	return typeof value === 'boolean' ? value : fallback;
}

function num(value: unknown, fallback: number, min: number, max = Number.MAX_SAFE_INTEGER): number {
	const n = typeof value === 'number' ? value : typeof value === 'string' && value.trim() !== '' ? Number(value) : NaN;
	return Number.isFinite(n) ? Math.min(max, Math.max(min, Math.floor(n))) : fallback;
}

function list(value: unknown, fallback: string[]): string[] {
	if (!Array.isArray(value)) return fallback;
	return value.filter((item): item is string => typeof item === 'string').map((item) => item.trim()).filter(Boolean);
}

function oneOf<T extends string>(value: unknown, options: readonly T[], fallback: T): T {
	return options.includes(value as T) ? (value as T) : fallback;
}

export function normalizeProfile(raw: unknown, fallbackId: string): BoardProfile {
	const d = defaultProfile(fallbackId);
	const p = isRecord(raw) ? raw : {};
	const a = isRecord(p.archive) ? p.archive : {};
	const n = isRecord(p.newCard) ? p.newCard : {};
	return {
		id: str(p.id, '') || fallbackId,
		name: str(p.name, '') || d.name,
		cardTag: str(p.cardTag, d.cardTag).replace(/^#/, ''),
		includeFolders: list(p.includeFolders, d.includeFolders),
		excludeFolders: list(p.excludeFolders, d.excludeFolders),
		statusProperty: str(p.statusProperty, '') || d.statusProperty,
		doneValue: str(p.doneValue, '') || d.doneValue,
		completedProperty: str(p.completedProperty, d.completedProperty),
		completedFormat: oneOf(p.completedFormat, ['date', 'datetime'] as const, d.completedFormat),
		projectProperty: str(p.projectProperty, d.projectProperty),
		archive: {
			enabled: bool(a.enabled, d.archive.enabled),
			afterDays: num(a.afterDays, d.archive.afterDays, 0, MAX_AFTER_DAYS),
			folderPattern: str(a.folderPattern, '') || d.archive.folderPattern,
			missingCompleted: oneOf(a.missingCompleted, ['skip', 'useModified'] as const, d.archive.missingCompleted),
			recordOriginProperty: str(a.recordOriginProperty, d.archive.recordOriginProperty),
		},
		newCard: {
			folderPattern: str(n.folderPattern, '') || d.newCard.folderPattern,
			fallbackFolder: str(n.fallbackFolder, d.newCard.fallbackFolder),
			fileNamePattern: str(n.fileNamePattern, '') || d.newCard.fileNamePattern,
			templatePath: str(n.templatePath, d.newCard.templatePath),
			defaultType: str(n.defaultType, d.newCard.defaultType),
		},
	};
}

/** Merge stored data with defaults, fix types and guarantee unique profile ids. */
export function normalizeSettings(raw: unknown): BoardSettings {
	const s = isRecord(raw) ? raw : {};
	const d = defaultArchiveSettings();
	const a = isRecord(s.archive) ? s.archive : {};

	const rawProfiles = Array.isArray(s.profiles) && s.profiles.length > 0 ? s.profiles : [undefined];
	const used = new Set<string>();
	const profiles = rawProfiles.map((item, index) => {
		const profile = normalizeProfile(item, index === 0 ? DEFAULT_PROFILE_ID : `profile-${index + 1}`);
		profile.id = uniqueId(profile.id, used);
		used.add(profile.id);
		return profile;
	});

	return {
		archive: {
			enabled: bool(a.enabled, d.enabled),
			runOnStartup: bool(a.runOnStartup, d.runOnStartup),
			startupDelaySeconds: num(a.startupDelaySeconds, d.startupDelaySeconds, 0, MAX_STARTUP_DELAY_SECONDS),
			intervalHours: num(a.intervalHours, d.intervalHours, 0, MAX_INTERVAL_HOURS),
			maxPerRun: num(a.maxPerRun, d.maxPerRun, 1),
			confirmFirstRun: bool(a.confirmFirstRun, d.confirmFirstRun),
			notify: bool(a.notify, d.notify),
		},
		profiles,
		confirmedProfiles: list(s.confirmedProfiles, []).filter((id) => used.has(id)),
	};
}

export function uniqueId(base: string, used: Set<string>): string {
	const clean = base.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '') || 'profile';
	if (!used.has(clean)) return clean;
	let i = 2;
	while (used.has(`${clean}-${i}`)) i++;
	return `${clean}-${i}`;
}

/** Deep copy with a new id and name ("Copy of …"), for the duplicate action. */
export function duplicateProfile(source: BoardProfile, used: Set<string>): BoardProfile {
	const copy = normalizeProfile(JSON.parse(JSON.stringify(source)) as unknown, source.id);
	copy.id = uniqueId(`${source.id}-copy`, used);
	copy.name = t('defaults.copyOf', { name: source.name });
	return copy;
}

export function findProfile(settings: BoardSettings, id: unknown): BoardProfile {
	const found = typeof id === 'string' ? settings.profiles.find((profile) => profile.id === id) : undefined;
	// normalizeSettings guarantees at least one profile.
	return found ?? (settings.profiles[0] as BoardProfile);
}
