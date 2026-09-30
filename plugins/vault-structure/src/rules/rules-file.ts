import { TFile } from 'obsidian';
import type { App, Plugin } from 'obsidian';
import { t } from '../i18n';
import type { VaultRules, VaultStructureSettings } from '../types';
import { ensureFolder } from '../vault/files';
import { parentPath } from '../vault/paths';
import { defaultRules } from './defaults';
import { RULE_KEYS, normalizeRules, rulesToFrontmatter } from './normalize';

interface RulesHost extends Plugin {
	settings: VaultStructureSettings;
}

/** Explanation written below the properties, once, in the app language. */
function rulesBody(): string {
	const keys: [string[], string][] = [
		[[RULE_KEYS.indexRoots], t('rules.key.indexRoots')],
		[[RULE_KEYS.indexDepth], t('rules.key.indexDepth')],
		[[RULE_KEYS.indexTemplate], t('rules.key.indexTemplate')],
		[[RULE_KEYS.scaffold], t('rules.key.scaffold')],
		[[RULE_KEYS.vocabulary], t('rules.key.vocabulary')],
		[[RULE_KEYS.minorWords], t('rules.key.minorWords')],
		[[RULE_KEYS.aiTag, RULE_KEYS.aiFolder], t('rules.key.ai')],
		[[RULE_KEYS.ignore], t('rules.key.ignore')],
	];
	const lines = keys.map(([names, text]) => `- ${names.map((name) => `\`${name}\``).join(', ')}: ${text}`);
	return `# ${t('rules.heading')}\n\n${t('rules.intro')}\n\n${lines.join('\n')}\n`;
}

/**
 * The rules note: rules in its properties, read from the metadata cache on
 * every command, so edits apply right away. Without the note, the defaults apply.
 */
export class RulesFile {
	/** What this plugin just wrote, until the metadata cache catches up. */
	private written: VaultRules | null = null;

	constructor(private readonly host: RulesHost) {}

	private get app(): App {
		return this.host.app;
	}

	get path(): string {
		return this.host.settings.rulesPath;
	}

	register(): void {
		this.host.registerEvent(
			this.app.metadataCache.on('changed', (file) => {
				if (file.path === this.path) this.written = null;
			}),
		);
	}

	/** The settings pointed to another note. */
	pathChanged(): void {
		this.written = null;
	}

	file(): TFile | null {
		return this.app.vault.getFileByPath(this.path);
	}

	current(): VaultRules {
		if (this.written) return this.written;
		const file = this.file();
		return file ? normalizeRules(this.app.metadataCache.getFileCache(file)?.frontmatter) : defaultRules();
	}

	/** The rules note, created with the default rules when missing. */
	async ensure(): Promise<{ file: TFile; created: boolean }> {
		const existing = this.app.vault.getAbstractFileByPath(this.path);
		if (existing instanceof TFile) return { file: existing, created: false };
		if (existing) throw new Error(t('notice.rules.notFile', { path: this.path }));
		await ensureFolder(this.app, parentPath(this.path));
		const file = await this.app.vault.create(this.path, rulesBody());
		const rules = defaultRules();
		await this.app.fileManager.processFrontMatter(file, (frontmatter: Record<string, unknown>) => {
			Object.assign(frontmatter, rulesToFrontmatter(rules));
		});
		this.written = rules;
		return { file, created: true };
	}

	/** Add a path to `ignore`, keeping everything else in the note as it is. */
	async ignore(path: string): Promise<void> {
		const { file } = await this.ensure();
		let next: VaultRules | null = null;
		await this.app.fileManager.processFrontMatter(file, (frontmatter: Record<string, unknown>) => {
			const { ignore } = normalizeRules(frontmatter);
			frontmatter[RULE_KEYS.ignore] = ignore.includes(path) ? ignore : [...ignore, path];
			next = normalizeRules(frontmatter);
		});
		this.written = next;
	}
}
