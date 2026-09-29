import type { App, TFile } from 'obsidian';
import { daysBetween, isOlderThan, parseDay, startOfDay } from '../data/dates';
import { archiveMatcher, folderOf, parsePattern, resolvePattern } from '../patterns/pattern';
import type { ArchiveMatcher, ParsedPattern, PatternError, TokenName } from '../patterns/pattern';
import { archivingProfile, fmText, isProfileCard, projectOf, scalarText } from '../profiles/matcher';
import type { BoardProfile } from '../settings/model';

export type SkipReason = 'noCompleted' | 'invalidCompleted' | 'unresolved' | 'sameFolder' | 'unrecognized' | 'limit';

export interface PlannedMove {
	file: TFile;
	/** Path when planned; the move is skipped if the file changed place since. */
	fromPath: string;
	fromFolder: string;
	toFolder: string;
	profile: BoardProfile;
	ageDays: number;
}

export interface SkippedCard {
	file: TFile;
	profile: BoardProfile;
	reason: SkipReason;
	token?: TokenName;
}

export interface ProfileError {
	profile: BoardProfile;
	error: PatternError;
}

export interface ArchivePlan {
	moves: PlannedMove[];
	skipped: SkippedCard[];
	errors: ProfileError[];
}

export interface PlanOptions {
	maxPerRun: number;
	/** Only report these profiles. Ownership is still decided with every profile. */
	only?: ReadonlySet<string>;
	now?: Date;
}

function hasValue(value: unknown): boolean {
	return scalarText(value) !== '' || (typeof value === 'object' && value !== null);
}

/** Include globs made only of wildcards ("**", "*") select the whole vault. */
const isWildcardOnly = (glob: string): boolean => /^[\s/*?]*$/.test(glob);

/**
 * True when the profile has no real criterion (no tag, no specific include
 * folder): archiving it would sweep every note with status done in the vault.
 */
export function profileTooBroad(profile: BoardProfile): boolean {
	return !profile.cardTag && profile.includeFolders.every(isWildcardOnly);
}

interface PreparedProfile {
	profile: BoardProfile;
	reported: boolean;
	pattern: ParsedPattern | null;
	matcher: ArchiveMatcher | null;
}

/**
 * Decide what an archive run would do, without touching any file.
 *
 * - A note inside the archive folder of ANY profile is never touched.
 * - Otherwise it belongs to the first profile that recognizes it (tag +
 *   folders), so two profiles never act on the same card.
 * - A profile with an invalid pattern, or too broad, keeps its cards and
 *   reports an error: nothing of it moves.
 * - A destination the profile would not itself recognize as an archive folder
 *   is refused, so no pattern can make a card move again on the next run.
 */
export function planArchive(app: App, profiles: readonly BoardProfile[], options: PlanOptions): ArchivePlan {
	const now = options.now ?? new Date();
	const plan: ArchivePlan = { moves: [], skipped: [], errors: [] };

	const prepared: PreparedProfile[] = profiles.map((profile) => {
		const parsed = parsePattern(profile.archive.folderPattern, 'archiveFolder');
		const reported = !options.only || options.only.has(profile.id);
		if (reported && profile.archive.enabled) {
			if (!parsed.ok) plan.errors.push({ profile, error: parsed.error });
			else if (profileTooBroad(profile)) plan.errors.push({ profile, error: { code: 'noCriteria' } });
		}
		return parsed.ok
			? { profile, reported, pattern: parsed.pattern, matcher: archiveMatcher(parsed.pattern) }
			: { profile, reported, pattern: null, matcher: null };
	});

	const due: PlannedMove[] = [];
	for (const file of app.vault.getMarkdownFiles()) {
		const cache = app.metadataCache.getFileCache(file);
		// Not indexed yet: we cannot tell whether it is a card, so leave it alone.
		if (!cache || archivingProfile(file, cache, profiles)) continue;
		const owner = prepared.find((item) => isProfileCard(file, cache, item.profile));
		if (!owner) continue;
		const { profile, reported, pattern, matcher } = owner;
		if (!reported || !profile.archive.enabled || !pattern || !matcher || profileTooBroad(profile)) continue;

		const fm = (cache.frontmatter ?? {}) as Record<string, unknown>;
		if (fmText(fm, profile.statusProperty) !== profile.doneValue) continue;

		const raw = profile.completedProperty ? fm[profile.completedProperty] : undefined;
		let completed = parseDay(raw);
		if (!completed) {
			if (hasValue(raw)) {
				plan.skipped.push({ file, profile, reason: 'invalidCompleted' });
				continue;
			}
			if (profile.archive.missingCompleted !== 'useModified') {
				plan.skipped.push({ file, profile, reason: 'noCompleted' });
				continue;
			}
			completed = startOfDay(new Date(file.stat.mtime));
		}
		if (!isOlderThan(completed, profile.archive.afterDays, now)) continue;

		const folder = folderOf(file.path);
		const resolved = resolvePattern(pattern, {
			cardFolder: folder,
			project: projectOf(app, file, profile),
			title: fmText(fm, 'title') || file.basename,
			now,
		});
		if (!resolved.ok) {
			plan.skipped.push({ file, profile, reason: 'unresolved', token: resolved.missing });
			continue;
		}
		if (resolved.value.toLowerCase() === folder.toLowerCase()) {
			plan.skipped.push({ file, profile, reason: 'sameFolder' });
			continue;
		}
		if (!matcher.test(resolved.value)) {
			plan.skipped.push({ file, profile, reason: 'unrecognized' });
			continue;
		}
		due.push({ file, fromPath: file.path, fromFolder: folder, toFolder: resolved.value, profile, ageDays: daysBetween(completed, now) });
	}

	// Profile order first (the list order in the settings), then vault order.
	due.sort((a, b) => profiles.indexOf(a.profile) - profiles.indexOf(b.profile));
	const limit = Math.max(1, options.maxPerRun);
	plan.moves = due.slice(0, limit);
	for (const move of due.slice(limit)) plan.skipped.push({ file: move.file, profile: move.profile, reason: 'limit' });
	return plan;
}
