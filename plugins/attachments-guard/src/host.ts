import type { Plugin } from 'obsidian';
import type { AttachmentsGuardSettings } from './types';
import type { Planner } from './vault/planner';
import type { Rules } from './vault/rules';

/** What the feature modules need from the plugin. */
export interface GuardHost extends Plugin {
	settings: AttachmentsGuardSettings;
	rules: Rules;
	planner: Planner;
}
