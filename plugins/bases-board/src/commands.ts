import { Notice, SuggestModal } from 'obsidian';
import type { App, Plugin } from 'obsidian';
import type { ArchiveService } from './archive/service';
import { archivedProfileOf, unarchiveCard } from './archive/unarchive';
import { t } from './i18n';
import type { BoardSettings } from './settings/model';

export interface CommandsHost extends Plugin {
	settings: BoardSettings;
	archive: ArchiveService;
}

interface ProfileChoice {
	label: string;
	/** undefined = every profile. */
	ids?: string[];
}

/** Pick "all profiles" or one profile. */
class ProfileSuggestModal extends SuggestModal<ProfileChoice> {
	constructor(
		app: App,
		private readonly choices: ProfileChoice[],
		private readonly onPick: (choice: ProfileChoice) => void,
	) {
		super(app);
		this.setPlaceholder(t('command.pickProfile'));
	}

	getSuggestions(query: string): ProfileChoice[] {
		const q = query.trim().toLowerCase();
		return this.choices.filter((choice) => choice.label.toLowerCase().includes(q));
	}

	renderSuggestion(choice: ProfileChoice, el: HTMLElement): void {
		el.setText(choice.label);
	}

	onChooseSuggestion(choice: ProfileChoice): void {
		this.onPick(choice);
	}
}

function chooseProfiles(host: CommandsHost, run: (ids?: string[]) => void): void {
	const profiles = host.settings.profiles.filter((profile) => profile.archive.enabled);
	if (profiles.length <= 1) {
		run();
		return;
	}
	const choices: ProfileChoice[] = [
		{ label: t('command.allProfiles') },
		...profiles.map((profile) => ({ label: profile.name, ids: [profile.id] })),
	];
	new ProfileSuggestModal(host.app, choices, (choice) => run(choice.ids)).open();
}

/** Command ids are stable API: never rename them. */
export function registerCommands(host: CommandsHost): void {
	host.addCommand({
		id: 'archive-now',
		name: t('command.archiveNow'),
		callback: () => chooseProfiles(host, (ids) => void host.archive.archiveNow(ids)),
	});

	host.addCommand({
		id: 'archive-preview',
		name: t('command.archivePreview'),
		callback: () => host.archive.showPreview(),
	});

	host.addCommand({
		id: 'unarchive-card',
		name: t('command.unarchive'),
		checkCallback: (checking) => {
			const file = host.app.workspace.getActiveFile();
			const profile = file ? archivedProfileOf(host.app, file, host.settings) : null;
			if (!file || !profile) return false;
			if (!checking) {
				unarchiveCard(host.app, file, profile)
					.then(({ path, willReturn }) => {
						new Notice(t('notice.unarchived', { path }) + (willReturn ? `\n${t('notice.willReturn')}` : ''), willReturn ? 10000 : 5000);
					})
					.catch((error: unknown) => {
						console.error('Bases Board: unarchive failed', error);
						new Notice(t('notice.unarchiveFailed', { message: error instanceof Error ? error.message : String(error) }));
					});
			}
			return true;
		},
	});
}
