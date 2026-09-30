import { Notice } from 'obsidian';
import type { Plugin, TFile } from 'obsidian';
import { details, displayText } from './format';
import { t } from './i18n';
import type { BulkUpdate } from './property/bulk';
import { logError } from './property/writer';
import type { PropertyWriter } from './property/writer';
import type { ReadingTimeTracker, Reading } from './tracker';
import type { ReadingTimeSettings } from './types';

export interface CommandsHost extends Plugin {
	settings: ReadingTimeSettings;
	tracker: ReadingTimeTracker;
	writer: PropertyWriter;
	bulk: BulkUpdate;
}

const NOTICE_MS = 10_000;

function showReading(reading: Reading, settings: ReadingTimeSettings): void {
	const lines = [t('notice.show.note', { text: displayText(reading.note, settings) }), details(reading.note, settings)];
	if (reading.selection) {
		lines.push(
			t('notice.show.selection', { text: displayText(reading.selection, settings) }),
			details(reading.selection, settings),
		);
	}
	new Notice(lines.join('\n'), NOTICE_MS);
}

async function updateNote(host: CommandsHost, file: TFile): Promise<void> {
	const property = host.settings.property.name;
	try {
		const result = await host.writer.update(file, true);
		const minutes = host.writer.minutesOf(await host.app.vault.cachedRead(file));
		new Notice(t(result === 'written' ? 'notice.property.written' : 'notice.property.unchanged', { property, minutes }));
	} catch (error) {
		logError(error);
		new Notice(t('notice.property.failed', { property }));
	}
}

/** Command ids are stable API (hotkeys are saved by id): never rename them. */
export function registerCommands(host: CommandsHost): void {
	host.addCommand({
		id: 'show-details',
		name: t('command.show'),
		icon: 'timer',
		checkCallback: (checking) => {
			const reading = host.tracker.read();
			if (!reading) return false;
			if (!checking) showReading(reading, host.settings);
			return true;
		},
	});
	host.addCommand({
		id: 'update-property',
		name: t('command.updateProperty'),
		icon: 'timer',
		checkCallback: (checking) => {
			const file = host.app.workspace.getActiveFile();
			if (file?.extension !== 'md') return false;
			if (!checking) void updateNote(host, file);
			return true;
		},
	});
	host.addCommand({
		id: 'update-property-all',
		name: t('command.updateAll'),
		icon: 'timer',
		callback: () => void host.bulk.run(),
	});
}
