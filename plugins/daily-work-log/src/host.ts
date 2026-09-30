import type { Plugin } from 'obsidian';
import type { Changes } from './changes';
import type { DailyNotes } from './daily/daily-notes';
import type { LogWriter } from './log/writer';
import type { Meetings } from './meetings/meetings';
import type { ProjectIndex } from './projects/project-index';
import type { DailyWorkLogSettings } from './types';

/** What the feature modules need from the plugin. */
export interface WorkLogHost extends Plugin {
	settings: DailyWorkLogSettings;
	projects: ProjectIndex;
	daily: DailyNotes;
	writer: LogWriter;
	meetings: Meetings;
	changes: Changes;
}
